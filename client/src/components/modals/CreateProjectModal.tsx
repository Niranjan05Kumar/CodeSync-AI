import React, { useState } from 'react';
import { X, FolderGit2, Code2 } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { projectApi } from '../../api/projectApi';
import { fileApi } from '../../api/fileApi';

const TEMPLATES = [
  { id: 'python', name: 'Python 3.11', desc: 'Standard Python sandbox with math & sys libraries', filename: 'main.py', content: '# Python 3.11 Sandboxed Script\nimport sys\n\ndef main():\n    print("Hello from CodeSync AI Cloud IDE!")\n    print(f"Python Version: {sys.version.split()[0]}")\n\nif __name__ == "__main__":\n    main()\n' },
  { id: 'node', name: 'Node.js 20', desc: 'JavaScript/TypeScript runtime with async/await support', filename: 'index.js', content: '// Node.js Sandboxed Script\nconsole.log("Hello from CodeSync AI Node sandbox!");\nconsole.log(`Node runtime: ${process.version}`);\n' },
  { id: 'cpp', name: 'C++ 13', desc: 'Modern GCC 13 runner with STL headers', filename: 'main.cpp', content: '// C++20 Sandbox\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from CodeSync AI C++ runtime!" << std::endl;\n    return 0;\n}\n' },
  { id: 'blank', name: 'Blank Project', desc: 'Empty workspace with no starter files', filename: 'README.md', content: '# Welcome to your new project\nStart creating files using the Explorer sidebar.\n' }
];

export const CreateProjectModal: React.FC = () => {
  const { isCreateProjectOpen, setCreateProjectOpen } = useUIStore();
  const { fetchProjects, selectProject } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('python');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCreateProjectOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create project
      const res = await projectApi.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic: isPublic
      });

      const newProject = res.project;

      // Seed with starter file from template
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);
      if (template) {
        try {
          await fileApi.createFileOrFolder(newProject.id, {
            name: template.filename,
            isDirectory: false,
            content: template.content
          });
        } catch (fileErr) {
          console.warn('[CreateProjectModal] Starter file seed warning:', fileErr);
        }
      }

      await fetchProjects();
      await selectProject(newProject);

      setName('');
      setDescription('');
      setCreateProjectOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div 
        className="fixed inset-0" 
        onClick={() => !isLoading && setCreateProjectOpen(false)} 
      />

      <div className="relative w-full max-w-lg bg-ide-elevated border border-ide-border rounded-lg shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-ide-border flex items-center justify-between bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-ide-blue" />
            <h2 className="text-ide-md font-semibold text-white">Create New Project</h2>
          </div>
          <button
            onClick={() => !isLoading && setCreateProjectOpen(false)}
            className="text-ide-muted hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-950/50 border border-red-800 rounded text-red-300 text-ide-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-ide-xs font-medium text-ide-text uppercase tracking-wider mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. cloud-algorithms, realtime-chat"
              autoFocus
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-blue"
            />
          </div>

          <div>
            <label className="block text-ide-xs font-medium text-ide-text uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of this project..."
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-blue resize-none"
            />
          </div>

          <div>
            <label className="block text-ide-xs font-medium text-ide-text uppercase tracking-wider mb-2">
              Starter Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-2.5 rounded border cursor-pointer transition-colors flex flex-col justify-between ${
                    selectedTemplate === tmpl.id
                      ? 'border-ide-blue bg-ide-blue/10 text-white'
                      : 'border-ide-border bg-[#1a1a1a] text-ide-text hover:bg-[#202020]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-ide-sm">
                    <Code2 className="w-3.5 h-3.5 text-ide-blue shrink-0" />
                    <span>{tmpl.name}</span>
                  </div>
                  <p className="text-[11px] text-ide-dim mt-1 line-clamp-2">
                    {tmpl.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded bg-[#1e1e1e] border-ide-border text-ide-blue focus:ring-0"
            />
            <label htmlFor="isPublic" className="text-ide-sm text-ide-text cursor-pointer select-none">
              Make project public (collaborators can join with link)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-ide-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setCreateProjectOpen(false)}
              className="px-4 py-2 rounded text-ide-sm text-ide-text hover:bg-[#2a2d2e] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-5 py-2 rounded bg-ide-blue hover:bg-ide-blueHover text-white text-ide-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
