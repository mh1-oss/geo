import { useState } from 'react';
import { Link } from 'react-router-dom';
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

    const statusColors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-cyan-500', 'bg-pink-500'];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] relative">
            <div className="absolute inset-0 bg-gradient-to-br from-background-dark via-transparent to-background-dark pointer-events-none"></div>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30 bg-background-dark/80 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <span className="material-symbols-outlined">folder_open</span>
                    </div>
                    <div>
                        <h2 className="text-white text-lg font-bold leading-tight">Projects</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button
                    onClick={() => createProject()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold transition-colors shadow-[0_0_15px_rgba(13,127,242,0.3)]"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>New Project</span>
                </button>
            </header>

            {/* Projects Grid */}
            <div className="flex-1 overflow-y-auto p-6 z-10">
                <div className="max-w-6xl mx-auto">
                    {projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-slate-600">folder_off</span>
                            </div>
                            <h3 className="text-white text-xl font-bold mb-2">No Projects Yet</h3>
                            <p className="text-slate-400 text-sm max-w-sm mb-6">Create your first project to start analyzing pile foundations.</p>
                            <button
                                onClick={() => createProject()}
                                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-blue-600 text-white font-bold transition-colors"
                            >
                                <span className="material-symbols-outlined">add</span>
                                Create First Project
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project, index) => (
                                <div
                                    key={project.id}
                                    className={`group relative bg-surface-dark/90 backdrop-blur border rounded-xl p-5 transition-all cursor-pointer hover:border-primary/50 ${activeProject?.id === project.id
                                            ? 'border-primary/50 ring-1 ring-primary/20'
                                            : 'border-slate-700/30'
                                        }`}
                                    onClick={() => setActiveProjectId(project.id)}
                                >
                                    {/* Active Badge */}
                                    {activeProject?.id === project.id && (
                                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                                            Active
                                        </div>
                                    )}

                                    {/* Project Icon */}
                                    <div className={`w-10 h-10 rounded-lg ${statusColors[index % statusColors.length]}/20 flex items-center justify-center mb-3`}>
                                        <span className={`material-symbols-outlined ${statusColors[index % statusColors.length].replace('bg-', 'text-')}`}>
                                            engineering
                                        </span>
                                    </div>

                                    {/* Name */}
                                    {editingId === project.id ? (
                                        <input
                                            className="bg-slate-800 border border-primary/50 rounded px-2 py-1 text-white text-base font-bold w-full mb-2 outline-none"
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
                                        <h3 className="text-white text-base font-bold mb-1 truncate">{project.name}</h3>
                                    )}

                                    {/* Details */}
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        {formatDate(project.lastModified)}
                                    </div>

                                    {/* Soil/Pile Summary */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs">
                                            {project.soil.type === 'clay' ? '🏔️ Clay' : '🏖️ Sand'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs">
                                            D={project.pile.diameter}m
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs">
                                            L={project.pile.length}m
                                        </span>
                                        {project.soilLayers && (
                                            <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs">
                                                {project.soilLayers.length} layers
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            to="/"
                                            onClick={(e) => { e.stopPropagation(); setActiveProjectId(project.id); }}
                                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                            Open
                                        </Link>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startRename(project.id, project.name); }}
                                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            Rename
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }}
                                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                            Copy
                                        </button>
                                        {deleteConfirm === project.id ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteProject(project.id); setDeleteConfirm(null); }}
                                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                                Confirm?
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                Delete
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
