import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { ApiError } from '../utils/apiError';
import { CreateProjectInput } from '../validations/projectValidation';

/**
 * Generate an unambiguous 8-character alphanumeric room code
 * e.g. "H7N9P2Q4", "K3X8M2W9"
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Create a new project with starter files
 * POST /api/v1/projects
 */
export async function createProject(req: Request<{}, {}, CreateProjectInput>, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  const { name, description, isPublic, template } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    const roomCode = generateRoomCode();

    // 1. Create Project Record with 8-character room_code
    const projectRes = await client.query(`
      INSERT INTO projects (name, room_code, description, owner_id, is_public)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, room_code, description, owner_id, is_public, created_at, updated_at;
    `, [name, roomCode, description || null, req.user.id, isPublic || false]);

    const project = projectRes.rows[0];

    // 2. Add creator as 'owner' in project_members
    await client.query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'owner');
    `, [project.id, req.user.id]);

    // 3. Seed starter template files
    const starterFiles = getStarterFilesForTemplate(project.name, template || 'python');

    // Create root files and directories
    for (const item of starterFiles) {
      if (item.isDirectory) {
        const dirRes = await client.query(`
          INSERT INTO files (project_id, name, path, is_directory)
          VALUES ($1, $2, $3, true)
          RETURNING id;
        `, [project.id, item.name, item.path]);

        if (item.children) {
          for (const child of item.children) {
            await client.query(`
              INSERT INTO files (project_id, parent_id, name, path, is_directory, content, language, size_bytes)
              VALUES ($1, $2, $3, $4, false, $5, $6, $7);
            `, [
              project.id,
              dirRes.rows[0].id,
              child.name,
              child.path,
              child.content,
              child.language,
              Buffer.byteLength(child.content, 'utf-8')
            ]);
          }
        }
      } else {
        await client.query(`
          INSERT INTO files (project_id, name, path, is_directory, content, language, size_bytes)
          VALUES ($1, $2, $3, false, $4, $5, $6);
        `, [
          project.id,
          item.name,
          item.path,
          item.content,
          item.language,
          Buffer.byteLength(item.content || '', 'utf-8')
        ]);
      }
    }

    await client.query('COMMIT;');

    return res.status(201).json({
      success: true,
      data: {
        project: {
          ...project,
          roomCode: project.room_code || project.id.slice(0, 8).toUpperCase(),
          role: 'owner',
          memberCount: 1
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK;');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * List all projects owned by or shared with current user
 * GET /api/v1/projects
 */
export async function getProjects(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  try {
    const projectsRes = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.room_code,
        p.description,
        p.owner_id,
        p.is_public,
        p.created_at,
        p.updated_at,
        pm.role,
        u.username AS owner_username,
        (SELECT COUNT(*)::int FROM project_members WHERE project_id = p.id) AS member_count
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users u ON p.owner_id = u.id
      WHERE pm.user_id = $1
      ORDER BY p.updated_at DESC;
    `, [req.user.id]);

    const mappedProjects = projectsRes.rows.map(row => ({
      ...row,
      roomCode: row.room_code || row.id.slice(0, 8).toUpperCase()
    }));

    return res.status(200).json({
      success: true,
      data: {
        projects: mappedProjects
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get project details and active member roster
 * GET /api/v1/projects/:id
 */
export async function getProjectById(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;

  try {
    const projectRes = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.room_code,
        p.description,
        p.owner_id,
        p.is_public,
        p.created_at,
        p.updated_at,
        u.username AS owner_username
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1;
    `, [id]);

    if (projectRes.rows.length === 0) {
      throw ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND');
    }

    const project = projectRes.rows[0];

    // Fetch members list
    const membersRes = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.username,
        u.email,
        u.avatar_url,
        pm.role,
        pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at ASC;
    `, [id]);

    return res.status(200).json({
      success: true,
      data: {
        project: {
          ...project,
          roomCode: project.room_code || project.id.slice(0, 8).toUpperCase(),
          members: membersRes.rows,
          userRole: req.projectMember?.role || 'viewer'
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Join a project room by 8-character roomCode (or project id)
 * POST /api/v1/projects/join
 */
export async function joinProject(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required. Please log in to join a room.', 'AUTH_REQUIRED'));
  }

  const { roomCode, projectId } = req.body;
  const inputCode = (roomCode || projectId || req.params.id || '').toString().trim();

  if (!inputCode) {
    return next(ApiError.badRequest('8-character Room ID or code is required', 'ROOM_CODE_REQUIRED'));
  }

  try {
    // Look up project by 8-character room_code, UUID, or first 8 chars of UUID
    const projectRes = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.room_code,
        p.description,
        p.owner_id,
        p.is_public,
        p.created_at,
        p.updated_at,
        u.username AS owner_username,
        (SELECT COUNT(*)::int FROM project_members WHERE project_id = p.id) AS member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE UPPER(p.room_code) = UPPER($1) 
         OR p.id::text = $1
         OR UPPER(SUBSTRING(REPLACE(p.id::text, '-', ''), 1, 8)) = UPPER($1);
    `, [inputCode]);

    if (projectRes.rows.length === 0) {
      throw ApiError.notFound(`No room found with ID "${inputCode}". Please verify the 8-character code.`, 'ROOM_NOT_FOUND');
    }

    const project = projectRes.rows[0];

    // Check if user is already a member
    const existingMember = await pool.query(`
      SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2;
    `, [project.id, req.user.id]);

    let userRole = 'editor';
    let isNewMember = false;

    if (existingMember.rows.length > 0) {
      userRole = existingMember.rows[0].role;
    } else {
      isNewMember = true;
      // Add user as editor
      await pool.query(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, 'editor')
        ON CONFLICT (project_id, user_id) DO NOTHING;
      `, [project.id, req.user.id]);
    }

    return res.status(200).json({
      success: true,
      data: {
        project: {
          ...project,
          roomCode: project.room_code || project.id.slice(0, 8).toUpperCase(),
          role: userRole,
          memberCount: project.member_count + (isNewMember ? 1 : 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Invite a collaborator to the project by username or email
 * POST /api/v1/projects/:id/members
 */
export async function addProjectMember(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  const { id } = req.params;
  const { emailOrUsername, role = 'editor' } = req.body;

  if (!emailOrUsername || !emailOrUsername.trim()) {
    return next(ApiError.badRequest('Username or email is required', 'IDENTIFIER_REQUIRED'));
  }

  try {
    // Find target user by username or email
    const userRes = await pool.query(`
      SELECT id, username, email, avatar_url 
      FROM users 
      WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1);
    `, [emailOrUsername.trim()]);

    if (userRes.rows.length === 0) {
      throw ApiError.notFound(`User "${emailOrUsername}" not found.`, 'USER_NOT_FOUND');
    }

    const targetUser = userRes.rows[0];

    // Upsert into project_members
    const memberRes = await pool.query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, user_id) DO UPDATE 
        SET role = EXCLUDED.role, joined_at = CURRENT_TIMESTAMP
      RETURNING role, joined_at;
    `, [id, targetUser.id, role]);

    return res.status(200).json({
      success: true,
      data: {
        member: {
          userId: targetUser.id,
          username: targetUser.username,
          email: targetUser.email,
          avatarUrl: targetUser.avatar_url,
          role: memberRes.rows[0].role,
          joinedAt: memberRes.rows[0].joined_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove a collaborator from project
 * DELETE /api/v1/projects/:id/members/:userId
 */
export async function removeProjectMember(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  const { id, userId } = req.params;

  try {
    // Check that caller is project owner
    const projectRes = await pool.query(`
      SELECT owner_id FROM projects WHERE id = $1;
    `, [id]);

    if (projectRes.rows.length === 0) {
      throw ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND');
    }

    if (projectRes.rows[0].owner_id !== req.user.id) {
      throw ApiError.forbidden('Only the project owner can remove members', 'OWNER_REQUIRED');
    }

    if (projectRes.rows[0].owner_id === userId) {
      throw ApiError.badRequest('Cannot remove the project owner', 'CANNOT_REMOVE_OWNER');
    }

    await pool.query(`
      DELETE FROM project_members WHERE project_id = $1 AND user_id = $2;
    `, [id, userId]);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Member successfully removed from project',
        removedUserId: userId
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a project (Owner only)
 * DELETE /api/v1/projects/:id
 */
export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;

  try {
    const deleteRes = await pool.query(`
      DELETE FROM projects
      WHERE id = $1 AND owner_id = $2
      RETURNING id, name;
    `, [id, req.user!.id]);

    if (deleteRes.rows.length === 0) {
      throw ApiError.forbidden('Only the project owner can delete this project', 'OWNER_REQUIRED');
    }

    return res.status(200).json({
      success: true,
      data: {
        message: `Project '${deleteRes.rows[0].name}' successfully deleted`,
        deletedId: id
      }
    });
  } catch (error) {
    next(error);
  }
}

interface StarterFileChild {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface StarterFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
  language?: string;
  children?: StarterFileChild[];
}

/**
 * Helper to generate initial project starter templates
 */
function getStarterFilesForTemplate(projectName: string, template: string): StarterFileItem[] {
  const readme: StarterFileItem = {
    name: 'README.md',
    path: 'README.md',
    isDirectory: false,
    content: `# ${projectName}\n\nWelcome to your collaborative cloud project on CodeSync AI.\n\n### Features\n- Real-time pair programming\n- Sandboxed execution\n- Project-aware AI assistant\n`,
    language: 'markdown'
  };

  if (template === 'javascript') {
    return [
      readme,
      {
        name: 'src',
        path: 'src',
        isDirectory: true,
        children: [
          {
            name: 'index.js',
            path: 'src/index.js',
            content: `// CodeSync AI - JavaScript Template\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('Developer'));\n`,
            language: 'javascript'
          }
        ]
      }
    ];
  }

  if (template === 'typescript') {
    return [
      readme,
      {
        name: 'src',
        path: 'src',
        isDirectory: true,
        children: [
          {
            name: 'main.ts',
            path: 'src/main.ts',
            content: `// CodeSync AI - TypeScript Template\ninterface User {\n  id: string;\n  name: string;\n}\n\nconst user: User = { id: '1', name: 'Developer' };\nconsole.log(\`User: \${user.name}\`);\n`,
            language: 'typescript'
          }
        ]
      }
    ];
  }

  if (template === 'cpp') {
    return [
      readme,
      {
        name: 'src',
        path: 'src',
        isDirectory: true,
        children: [
          {
            name: 'main.cpp',
            path: 'src/main.cpp',
            content: `#include <iostream>\n\nint main() {\n    std::cout << "Hello from CodeSync AI in C++!" << std::endl;\n    return 0;\n}\n`,
            language: 'cpp'
          }
        ]
      }
    ];
  }

  // Default: Python 3
  return [
    readme,
    {
      name: 'src',
      path: 'src',
      isDirectory: true,
      children: [
        {
          name: 'main.py',
          path: 'src/main.py',
          content: `# CodeSync AI - Python Template\ndef greet(name: str) -> str:\n    return f"Hello, {name} from CodeSync AI!"\n\nif __name__ == '__main__':\n    print(greet("Collaborator"))\n`,
          language: 'python'
        }
      ]
    }
  ];
}
