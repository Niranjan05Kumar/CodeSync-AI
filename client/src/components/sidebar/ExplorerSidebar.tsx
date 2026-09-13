import React, { useState } from 'react';
import { 
  FilePlus, 
  FolderPlus, 
  RefreshCw, 
  Search, 
  X, 
  FolderGit2, 
  Plus, 
  Trash2,
  ChevronDown
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { FileTree } from './FileTree';

export const ExplorerSidebar: React.FC = () => {
  const { currentProject, projects, selectProject, deleteProject, isTreeLoading, refreshTree } = useProjectStore();
  const { setCreateProjectOpen, showConfirm, showToast } = useUIStore();
  
  const [filterQuery, setFilterQuery] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [creatingRootType, setCreatingRootType] = useState<'file' | 'folder' | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const handleDeleteProject = async (proj: { id: string; name: string }) => {
    const confirmed = await showConfirm({
      title: 'Delete Project',
      message: `Are you sure you want to permanently delete '${proj.name}'?\n\nAll files, folders, and history in this project will be deleted. This action cannot be undone.`,
      confirmText: 'Delete Project',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await deleteProject(proj.id);
      showToast(`Project '${proj.name}' was deleted.`, 'info');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-ide-sidebar border-r border-ide-border select-none">
      {/* Sidebar Section Title */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-ide-border shrink-0">
        <span className="text-ide-xs font-semibold tracking-wider text-ide-muted uppercase">
          Explorer
        </span>
        <div className="flex items-center gap-1 text-ide-dim">
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            title="Filter Files"
            className={`p-1 rounded hover:text-white hover:bg-[#2a2d2e] transition-colors ${
              isFilterVisible ? 'text-ide-blue bg-[#2a2d2e]' : ''
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCreatingRootType('file')}
            title="New File"
            className="p-1 rounded hover:text-white hover:bg-[#2a2d2e] transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCreatingRootType('folder')}
            title="New Folder"
            className="p-1 rounded hover:text-white hover:bg-[#2a2d2e] transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => refreshTree()}
            title="Refresh Explorer"
            className="p-1 rounded hover:text-white hover:bg-[#2a2d2e] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTreeLoading ? 'animate-spin text-ide-blue' : ''}`} />
          </button>
        </div>
      </div>

      {/* Project Switcher Bar */}
      <div className="relative px-3 py-1.5 border-b border-ide-border/50 bg-[#1a1a1a] flex items-center justify-between">
        <button
          onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          className="flex items-center gap-1.5 min-w-0 text-left hover:text-white group"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-ide-blue shrink-0" />
          <span className="text-ide-sm font-semibold text-white truncate max-w-[170px]">
            {currentProject ? currentProject.name.toUpperCase() : 'NO PROJECT'}
          </span>
          <ChevronDown className="w-3 h-3 text-ide-muted group-hover:text-white transition-transform" />
        </button>

        <button
          onClick={() => setCreateProjectOpen(true)}
          title="Create New Project"
          className="p-1 text-ide-muted hover:text-white hover:bg-[#2a2d2e] rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Project Selector Menu */}
        {isProjectDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsProjectDropdownOpen(false)}
            />
            <div className="absolute top-8 left-2 right-2 z-40 bg-ide-elevated border border-ide-border rounded shadow-xl py-1">
              <div className="px-3 py-1 text-ide-xs text-ide-muted border-b border-ide-border uppercase tracking-wider font-semibold">
                Select Project
              </div>
              <div className="max-h-48 overflow-y-auto">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      selectProject(p);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-ide-sm flex items-center justify-between hover:bg-[#2a2d2e] cursor-pointer group/proj transition-colors ${
                      currentProject?.id === p.id ? 'text-ide-blue font-medium bg-[#2a2d2e]/50' : 'text-ide-text'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span className="truncate">{p.name}</span>
                      {p.is_public && (
                        <span className="text-ide-xs text-ide-dim px-1 rounded bg-[#1e1e1e] shrink-0">public</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(p);
                      }}
                      className="opacity-0 group-hover/proj:opacity-100 p-1 text-ide-muted hover:text-red-400 hover:bg-[#383838] rounded transition-all shrink-0"
                      title={`Delete project '${p.name}'`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-ide-border mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    setCreateProjectOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-ide-sm text-ide-blue hover:bg-[#2a2d2e] flex items-center gap-1.5 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Project</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Input */}
      {isFilterVisible && (
        <div className="px-3 py-1.5 border-b border-ide-border bg-[#1a1a1a] flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-ide-muted shrink-0" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Type to filter files..."
            autoFocus
            className="bg-transparent text-ide-sm text-white placeholder-ide-dim outline-none w-full"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="text-ide-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* File Tree Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isTreeLoading ? (
          <div className="p-4 space-y-2">
            <div className="h-4 bg-[#252526] rounded animate-pulse w-3/4" />
            <div className="h-4 bg-[#252526] rounded animate-pulse w-1/2 ml-4" />
            <div className="h-4 bg-[#252526] rounded animate-pulse w-2/3 ml-4" />
            <div className="h-4 bg-[#252526] rounded animate-pulse w-4/5" />
          </div>
        ) : (
          <FileTree
            filterQuery={filterQuery}
            creatingRootType={creatingRootType}
            onCancelRootCreate={() => setCreatingRootType(null)}
          />
        )}
      </div>
    </div>
  );
};
