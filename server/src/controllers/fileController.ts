import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { ApiError } from '../utils/apiError';
import { CreateFileInput, UpdateFileContentInput, RenameFileInput } from '../validations/fileValidation';

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  language?: string;
  sizeBytes?: number;
  version?: number;
  updatedAt?: string;
  children?: FileTreeNode[];
}

/**
 * Get hierarchical directory tree for a project
 * GET /api/v1/projects/:projectId/tree
 */
export async function getProjectTree(req: Request, res: Response, next: NextFunction) {
  const { projectId } = req.params;

  try {
    const filesRes = await pool.query(`
      SELECT 
        id, 
        parent_id, 
        name, 
        path, 
        is_directory, 
        language, 
        size_bytes, 
        version, 
        updated_at
      FROM files
      WHERE project_id = $1
      ORDER BY is_directory DESC, name ASC;
    `, [projectId]);

    const tree = buildHierarchy(filesRes.rows);

    return res.status(200).json({
      success: true,
      data: {
        tree
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get file content and metadata
 * GET /api/v1/projects/:projectId/files/:fileId
 */
export async function getFileContent(req: Request, res: Response, next: NextFunction) {
  const { projectId, fileId } = req.params;

  try {
    const fileRes = await pool.query(`
      SELECT 
        id, 
        project_id, 
        parent_id, 
        name, 
        path, 
        is_directory, 
        content, 
        language, 
        size_bytes, 
        version, 
        created_at, 
        updated_at
      FROM files
      WHERE id = $1 AND project_id = $2;
    `, [fileId, projectId]);

    if (fileRes.rows.length === 0) {
      throw ApiError.notFound('File not found in project', 'FILE_NOT_FOUND');
    }

    const file = fileRes.rows[0];

    if (file.is_directory) {
      throw ApiError.badRequest('Cannot fetch content of a directory node', 'IS_DIRECTORY');
    }

    return res.status(200).json({
      success: true,
      data: {
        file
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new file or directory inside a project
 * POST /api/v1/projects/:projectId/files
 */
export async function createFileOrFolder(
  req: Request<{ projectId: string }, {}, CreateFileInput>,
  res: Response,
  next: NextFunction
) {
  const { projectId } = req.params;
  const { name, parentId, isDirectory, content } = req.body;

  try {
    let computedPath = name;

    if (parentId) {
      const parentRes = await pool.query(`
        SELECT path, is_directory FROM files 
        WHERE id = $1 AND project_id = $2;
      `, [parentId, projectId]);

      if (parentRes.rows.length === 0) {
        throw ApiError.notFound('Parent directory not found', 'PARENT_NOT_FOUND');
      }

      if (!parentRes.rows[0].is_directory) {
        throw ApiError.badRequest('Parent node is not a directory', 'PARENT_NOT_A_DIRECTORY');
      }

      computedPath = `${parentRes.rows[0].path}/${name}`;
    }

    // Detect language from file extension
    const language = isDirectory ? 'plaintext' : detectLanguageFromExtension(name);
    const sizeBytes = isDirectory ? 0 : Buffer.byteLength(content || '', 'utf-8');

    const insertRes = await pool.query(`
      INSERT INTO files (
        project_id, parent_id, name, path, is_directory, content, language, size_bytes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, project_id, parent_id, name, path, is_directory, language, size_bytes, version, created_at;
    `, [
      projectId,
      parentId || null,
      name,
      computedPath,
      isDirectory || false,
      isDirectory ? '' : (content || ''),
      language,
      sizeBytes
    ]);

    return res.status(201).json({
      success: true,
      data: {
        file: insertRes.rows[0]
      }
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return next(ApiError.conflict(`File or directory already exists at path '${name}'`, 'FILE_PATH_EXISTS'));
    }
    next(error);
  }
}

/**
 * Update active file content (Debounced save & atomic versioning)
 * PUT /api/v1/projects/:projectId/files/:fileId
 */
export async function updateFileContent(
  req: Request<{ projectId: string; fileId: string }, {}, UpdateFileContentInput>,
  res: Response,
  next: NextFunction
) {
  const { projectId, fileId } = req.params;
  const { content } = req.body;

  try {
    const sizeBytes = Buffer.byteLength(content, 'utf-8');

    const updateRes = await pool.query(`
      UPDATE files
      SET 
        content = $1,
        size_bytes = $2,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND project_id = $4 AND is_directory = false
      RETURNING id, name, path, size_bytes, version, updated_at;
    `, [content, sizeBytes, fileId, projectId]);

    if (updateRes.rows.length === 0) {
      throw ApiError.notFound('File not found or is a directory', 'FILE_NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      data: {
        file: updateRes.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Rename a file or directory
 * PATCH /api/v1/projects/:projectId/files/:fileId/rename
 */
export async function renameFileOrFolder(
  req: Request<{ projectId: string; fileId: string }, {}, RenameFileInput>,
  res: Response,
  next: NextFunction
) {
  const { projectId, fileId } = req.params;
  const { name } = req.body;

  try {
    // Fetch existing file
    const fileRes = await pool.query(`
      SELECT id, parent_id, path, is_directory FROM files WHERE id = $1 AND project_id = $2;
    `, [fileId, projectId]);

    if (fileRes.rows.length === 0) {
      throw ApiError.notFound('File not found', 'FILE_NOT_FOUND');
    }

    const currentFile = fileRes.rows[0];
    const pathParts = currentFile.path.split('/');
    pathParts[pathParts.length - 1] = name;
    const newPath = pathParts.join('/');
    const newLanguage = currentFile.is_directory ? 'plaintext' : detectLanguageFromExtension(name);

    const updateRes = await pool.query(`
      UPDATE files
      SET name = $1, path = $2, language = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND project_id = $5
      RETURNING id, name, path, is_directory, language, updated_at;
    `, [name, newPath, newLanguage, fileId, projectId]);

    return res.status(200).json({
      success: true,
      data: {
        file: updateRes.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a file or directory (Cascades to nested files)
 * DELETE /api/v1/projects/:projectId/files/:fileId
 */
export async function deleteFileOrFolder(req: Request, res: Response, next: NextFunction) {
  const { projectId, fileId } = req.params;

  try {
    const deleteRes = await pool.query(`
      DELETE FROM files
      WHERE id = $1 AND project_id = $2
      RETURNING id, name, path, is_directory;
    `, [fileId, projectId]);

    if (deleteRes.rows.length === 0) {
      throw ApiError.notFound('File not found', 'FILE_NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      data: {
        message: `Deleted '${deleteRes.rows[0].name}'`,
        deletedFile: deleteRes.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper: Convert flat database file records into nested tree structure
 */
function buildHierarchy(items: any[]): FileTreeNode[] {
  const map = new Map<string, FileTreeNode>();
  const roots: FileTreeNode[] = [];

  // Pass 1: Initialize all nodes
  for (const item of items) {
    map.set(item.id, {
      id: item.id,
      name: item.name,
      path: item.path,
      isDirectory: item.is_directory,
      language: item.language,
      sizeBytes: item.size_bytes,
      version: item.version,
      updatedAt: item.updated_at,
      ...(item.is_directory ? { children: [] } : {})
    });
  }

  // Pass 2: Connect parents and children
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      const parent = map.get(item.parent_id)!;
      if (parent.children) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Helper: Auto-detect syntax language mode from file extension
 */
function detectLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'mts':
      return 'typescript';
    case 'jsx':
      return 'javascriptreact';
    case 'tsx':
      return 'typescriptreact';
    case 'py':
      return 'python';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'c':
      return 'c';
    case 'java':
      return 'java';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}
