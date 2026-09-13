import React, { useState } from 'react';
import { FileTreeNode } from '../../types';
import { FileItem } from './FileItem';
import { FileCode, Folder } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { fileApi } from '../../api/fileApi';

interface FileTreeProps {
  filterQuery?: string;
  creatingRootType?: 'file' | 'folder' | null;
  onCancelRootCreate?: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  filterQuery = '',
  creatingRootType = null,
  onCancelRootCreate
}) => {
  const { fileTree, currentProject, refreshTree } = useProjectStore();
  const { showToast } = useUIStore();
  const [rootItemName, setRootItemName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateRootItem = async () => {
    if (!currentProject || !rootItemName.trim()) {
      onCancelRootCreate?.();
      setRootItemName('');
      return;
    }

    try {
      setIsSubmitting(true);
      await fileApi.createFileOrFolder(currentProject.id, {
        name: rootItemName.trim(),
        parentId: null,
        isDirectory: creatingRootType === 'folder',
        content: creatingRootType === 'file' ? '' : undefined
      });
      const createdType = creatingRootType;
      const createdName = rootItemName.trim();
      setRootItemName('');
      onCancelRootCreate?.();
      await refreshTree();
      showToast(`Created ${createdType} '${createdName}'`, 'success');
    } catch (err: any) {
      showToast(`Creation failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tree recursively if search query is present
  const filterNodes = (nodes: FileTreeNode[], query: string): FileTreeNode[] => {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase();

    return nodes.reduce<FileTreeNode[]>((acc, node) => {
      if (node.isDirectory) {
        const filteredChildren = node.children ? filterNodes(node.children, query) : [];
        if (node.name.toLowerCase().includes(lower) || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          });
        }
      } else if (node.name.toLowerCase().includes(lower)) {
        acc.push(node);
      }
      return acc;
    }, []);
  };

  const displayedTree = filterNodes(fileTree, filterQuery);

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-ide-muted text-ide-sm select-none">
        No project selected.
      </div>
    );
  }

  return (
    <div className="py-1 text-ide-sm select-none">
      {/* Root inline creation input */}
      {creatingRootType && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#252526]">
          {creatingRootType === 'folder' ? (
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <input
            type="text"
            value={rootItemName}
            disabled={isSubmitting}
            onChange={(e) => setRootItemName(e.target.value)}
            onBlur={handleCreateRootItem}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateRootItem();
              if (e.key === 'Escape') {
                setRootItemName('');
                onCancelRootCreate?.();
              }
            }}
            placeholder={creatingRootType === 'folder' ? 'Folder name...' : 'File name (e.g. main.py)...'}
            autoFocus
            className="h-5 px-1 bg-ide-activity border border-ide-focus text-white text-ide-sm outline-none w-full"
          />
        </div>
      )}

      {/* Tree Nodes */}
      {displayedTree.length > 0 ? (
        displayedTree.map((node) => (
          <FileItem key={node.id} node={node} level={0} />
        ))
      ) : (
        <div className="px-4 py-3 text-ide-dim text-ide-xs italic text-center">
          {filterQuery ? 'No matching files found' : 'No files in this project yet'}
        </div>
      )}
    </div>
  );
};
