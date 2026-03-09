import { useState } from 'react';
import { useProject } from '../store/ProjectContext';

export default function Projects() {
    const { projects, activeProject, setActiveProjectId, createProject, renameProject, duplicateProject, deleteProject } = useProject();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    function startRename(id: string, currentName: string) {
        setEditingId(id);
        setEditName(currentName);
    }

    function commitRename(id: string) {
        if (editName.trim()) {
            renameProject(id, editName.trim());
        }
        setEditingId(null);
    }

    function formatDate(ts: number) {
        const diff = Date.now() - ts;
        if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
        if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.round(diff / 86400000)}d ago`;
        return new Date(ts).toLocaleDateString();
    }

    const statusColors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500'];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl z-10 sticky top-0 shadow-sm">
                <div className="flex items-center gap-4 lg:ml-0 ml-12">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary/20 to-blue-500/20 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                        <span className="material-symbols-outlined text-2xl">folder_open</span>
                    </div>
                    <div>
                        <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">Project Directory</h2>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                            {projects.length} Total Project{projects.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => createProject()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all shadow-lg hover:shadow-glow-primary hover:-translate-y-0.5"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>New Project</span>
                </button>
            </header>

            {/* Projects Grid */}
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto animate-fade-in">
                    {projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-sm">
                                <span className="material-symbols-outlined text-5xl text-slate-400">folder_off</span>
                            </div>
                            <h3 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight mb-2">No Projects Yet</h3>
                            <p className="text-slate-500 text-base max-w-sm mb-8">Create your first project to start analyzing pile foundations and storing soil stratigraphies.</p>
                            <button
                                onClick={() => createProject()}
                                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow-lg hover:shadow-glow-primary hover:-translate-y-1"
                            >
                                <span className="material-symbols-outlined">add</span>
                                Create First Project
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {projects.map((project, index) => (
                                <div
                                    key={project.id}
                                    className={`group relative glass-panel rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1 ${activeProject?.id === project.id
                                            ? 'border-primary/50 ring-2 ring-primary/40 shadow-glow-primary'
                                            : 'hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    onClick={() => setActiveProjectId(project.id)}
                                >
                                    {/* Active Badge */}
                                    {activeProject?.id === project.id && (
                                        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] uppercase tracking-wider font-bold shadow-sm">
                                            Active
                                        </div>
                                    )}

                                    {/* Project Icon */}
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${statusColors[index % statusColors.length].replace('bg-', 'from-')}/20 to-transparent flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                        <span className={`material-symbols-outlined ${statusColors[index % statusColors.length].replace('bg-', 'text-')}`}>
                                            engineering
                                        </span>
                                    </div>

                                    {/* Name */}
                                    {editingId === project.id ? (
                                        <input
                                            className="bg-white dark:bg-slate-800 border-2 border-primary/50 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-base font-bold w-full mb-2 outline-none focus:ring-4 ring-primary/20 shadow-sm"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={() => commitRename(project.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitRename(project.id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-1 truncate pr-12">{project.name}</h3>
                                    )}

                                    {/* Details */}
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        Modified {formatDate(project.lastModified)}
                                    </div>

                                    {/* Sub-details pills */}
                                    <div className="flex flex-wrap gap-2 mb-6 flex-1">
                                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700/50">
                                            {project.soil.type === 'clay' ? 'Mtn Clay' : 'Coast Sand'}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700/50">
                                            D: {project.pile.diameter}m
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700/50">
                                            L: {project.pile.length}m
                                        </span>
                                        {project.soilLayers && (
                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700/50">
                                                {project.soilLayers.length} Layers
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-auto">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startRename(project.id, project.name); }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors tooltip-trigger"
                                                title="Rename"
                                            >
                                                <span className="material-symbols-outlined text-[18px] block">edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-500/10 transition-colors tooltip-trigger"
                                                title="Duplicate"
                                            >
                                                <span className="material-symbols-outlined text-[18px] block">content_copy</span>
                                            </button>
                                        </div>
                                        
                                        {deleteConfirm === project.id ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteProject(project.id); setDeleteConfirm(null); }}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                                Confirm
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors tooltip-trigger"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined text-[18px] block">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
