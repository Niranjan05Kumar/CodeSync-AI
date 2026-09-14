import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  File,
  Trash2,
  Edit2,
  Copy
} from 'lucide-react';
import { FileTreeNode } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { fileApi } from '../../api/fileApi';

interface FileItemProps {
  node: FileTreeNode;
  level: number;
}

export const FileItem: React.FC<FileItemProps> = ({ node, level }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [inlineChildCreate, setInlineChildCreate] = useState<'file' | 'folder' | null>(null);
  const [childItemName, setChildItemName] = useState('');

  const { currentProject, openFile, activeTabId, refreshTree, closeTab } = useProjectStore();
  const { showConfirm, showToast } = useUIStore();

  const handleCreateChild = async () => {
    if (!currentProject || !childItemName.trim() || !inlineChildCreate) {
      setInlineChildCreate(null);
      setChildItemName('');
      return;
    }

    try {
      await fileApi.createFileOrFolder(currentProject.id, {
        name: childItemName.trim(),
        parentId: node.id,
        isDirectory: inlineChildCreate === 'folder',
        content: inlineChildCreate === 'file' ? '' : undefined
      });
      setInlineChildCreate(null);
      setChildItemName('');
      await refreshTree();
      showToast(`Created ${inlineChildCreate} '${childItemName.trim()}'`, 'success');
    } catch (err: any) {
      showToast(`Creation failed: ${err.message}`, 'error');
      setInlineChildCreate(null);
      setChildItemName('');
    }
  };

  const isSelected = activeTabId === node.id;

  const handleClick = () => {
    if (node.isDirectory) {
      setIsOpen(!isOpen);
    } else {
      openFile({
        id: node.id,
        name: node.name,
        path: node.path,
        language: node.language || 'plaintext'
      });
      // On mobile or tablet where Explorer is an overlay drawer, close on file select
      if (typeof window !== 'undefined' && window.innerWidth < 1200) {
        useUIStore.getState().setSidebarOpen(false);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRename = async () => {
    if (!currentProject || editName.trim() === '' || editName === node.name) {
      setIsEditing(false);
      return;
    }

    try {
      await fileApi.renameFileOrFolder(currentProject.id, node.id, editName.trim());
      setIsEditing(false);
      await refreshTree();
      showToast(`Renamed to '${editName.trim()}'`, 'success');
    } catch (err: any) {
      showToast(`Rename failed: ${err.message}`, 'error');
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProject) return;

    const confirmed = await showConfirm({
      title: `Delete ${node.isDirectory ? 'Folder' : 'File'}`,
      message: `Are you sure you want to permanently delete '${node.name}'?${
        node.isDirectory ? ' All nested files and subdirectories will also be deleted.' : ' This action cannot be undone.'
      }`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await fileApi.deleteFileOrFolder(currentProject.id, node.id);
      closeTab(node.id);
      await refreshTree();
      showToast(`Deleted '${node.name}'`, 'info');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path);
    setContextMenu(null);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{ paddingLeft: `${level * 14 + 12}px` }}
        className={`h-6 flex items-center gap-1.5 pr-2 cursor-pointer text-ide-base transition-colors select-none ${
          isSelected
            ? 'bg-[#2a2d2e] text-white font-medium'
            : 'text-ide-text hover:bg-[#252526] hover:text-white'
        }`}
      >
        {/* Directory Toggle Caret */}
        {node.isDirectory ? (
          <span className="text-ide-dim hover:text-white p-0.5">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {node.isDirectory ? (
          isOpen ? (
            <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          )
        ) : (
          getFileIcon(node.name)
        )}

        {/* Name / Inline Edit */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="h-5 px-1 bg-ide-activity border border-ide-focus text-white text-ide-sm outline-none w-full"
          />
        ) : (
          <span className="truncate text-ide-sm">{node.name}</span>
        )}
      </div>

      {/* Nested Children for Directories */}
      {node.isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileItem key={child.id} node={child} level={level + 1} />
          ))}
          {node.children.length === 0 && (
            <div
              style={{ paddingLeft: `${(level + 1) * 14 + 24}px` }}
              className="h-5 text-ide-dim text-ide-xs flex items-center italic"
            >
              (empty)
            </div>
          )}
        </div>
      )}

      {/* Inline child creation within directory */}
      {node.isDirectory && isOpen && inlineChildCreate && (
        <div
          style={{ paddingLeft: `${(level + 1) * 14 + 12}px` }}
          className="flex items-center gap-1.5 pr-2 py-0.5 bg-[#252526]"
        >
          {inlineChildCreate === 'folder' ? (
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <input
            type="text"
            value={childItemName}
            onChange={(e) => setChildItemName(e.target.value)}
            onBlur={handleCreateChild}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChild();
              if (e.key === 'Escape') {
                setChildItemName('');
                setInlineChildCreate(null);
              }
            }}
            placeholder={inlineChildCreate === 'folder' ? 'Folder name...' : 'File name...'}
            autoFocus
            className="h-5 px-1 bg-ide-activity border border-ide-focus text-white text-ide-sm outline-none w-full"
          />
        </div>
      )}

      {/* Right Click Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed z-50 w-44 bg-ide-elevated border border-ide-border shadow-2xl rounded py-1 text-ide-base"
          >
            {node.isDirectory && (
              <>
                <button
                  onClick={() => {
                    setContextMenu(null);
                    setIsOpen(true);
                    setInlineChildCreate('file');
                  }}
                  className="w-full px-3 py-1 text-left text-ide-sm text-ide-text hover:bg-[#2a2d2e] hover:text-white flex items-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-ide-muted" />
                  <span>New File</span>
                </button>
                <button
                  onClick={() => {
                    setContextMenu(null);
                    setIsOpen(true);
                    setInlineChildCreate('folder');
                  }}
                  className="w-full px-3 py-1 text-left text-ide-sm text-ide-text hover:bg-[#2a2d2e] hover:text-white flex items-center gap-2"
                >
                  <Folder className="w-3.5 h-3.5 text-ide-muted" />
                  <span>New Folder</span>
                </button>
                <div className="border-t border-ide-border my-1" />
              </>
            )}
            <button
              onClick={() => {
                setContextMenu(null);
                setIsEditing(true);
              }}
              className="w-full px-3 py-1 text-left text-ide-sm text-ide-text hover:bg-[#2a2d2e] hover:text-white flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5 text-ide-muted" />
              <span>Rename</span>
            </button>
            <button
              onClick={handleCopyPath}
              className="w-full px-3 py-1 text-left text-ide-sm text-ide-text hover:bg-[#2a2d2e] hover:text-white flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-ide-muted" />
              <span>Copy Path</span>
            </button>
            <div className="border-t border-ide-border my-1" />
            <button
              onClick={() => {
                setContextMenu(null);
                handleDelete();
              }}
              className="w-full px-3 py-1 text-left text-ide-sm text-ide-red hover:bg-[#2a2d2e] flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-ide-red" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-amber-300 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'md':
      return <FileText className="w-4 h-4 text-gray-300 shrink-0" />;
    case 'cpp':
    case 'c':
    case 'h':
      return <FileCode className="w-4 h-4 text-blue-500 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-ide-muted shrink-0" />;
  }
}
