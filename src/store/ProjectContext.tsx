import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ProjectData, loadProjects, saveProjects } from '../lib/storage';

interface ProjectContextType {
    projects: ProjectData[];
    activeProject: ProjectData | null;
    setActiveProjectId: (id: string) => void;
    updateActiveProject: (data: Partial<ProjectData>) => void;
    createProject: () => void;
    renameProject: (id: string, newName: string) => void;
    duplicateProject: (id: string) => void;
    deleteProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [projects, setProjects] = useState<ProjectData[]>([]);
    const [activeProjectId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        const loaded = loadProjects();
        setProjects(loaded);
        if (loaded.length > 0) {
            setActiveId(loaded[0].id);
        }
    }, []);

    const save = useCallback((newProjects: ProjectData[]) => {
        setProjects(newProjects);
        saveProjects(newProjects);
    }, []);

    const setActiveProjectId = useCallback((id: string) => {
        setActiveId(id);
    }, []);

    const updateActiveProject = useCallback((data: Partial<ProjectData>) => {
        if (!activeProjectId) return;
        setProjects(current => {
            const updated = current.map(p => {
                if (p.id === activeProjectId) {
                    // Deep merge for nested objects like pile, soil, load
                    return { ...p, ...data, lastModified: Date.now() };
                }
                return p;
            });
            saveProjects(updated);
            return updated;
        });
    }, [activeProjectId]);

    const createProject = useCallback(() => {
        const id = `proj-${Date.now()}`;
        const newProject: ProjectData = {
            id,
            name: 'New Project',
            lastModified: Date.now(),
            soil: { type: 'clay', gamma: 18, cu: 50, modulusType: 'constant', k: 5 },
            pile: { diameter: 1, length: 20, yieldStrength: 350, youngsModulus: 210, wallThickness: 0.02 },
            load: { e: 0 }
        };
        save([...projects, newProject]);
        setActiveId(id);
    }, [projects, save]);

    const renameProject = useCallback((id: string, newName: string) => {
        save(projects.map(p => p.id === id ? { ...p, name: newName, lastModified: Date.now() } : p));
    }, [projects, save]);

    const duplicateProject = useCallback((id: string) => {
        const src = projects.find(p => p.id === id);
        if (!src) return;
        const newProject: ProjectData = {
            ...src,
            id: `proj-${Date.now()}`,
            name: `${src.name} (Copy)`,
            lastModified: Date.now()
        };
        save([...projects, newProject]);
        setActiveId(newProject.id);
    }, [projects, save]);

    const deleteProject = useCallback((id: string) => {
        const filtered = projects.filter(p => p.id !== id);
        save(filtered);
        if (activeProjectId === id && filtered.length > 0) {
            setActiveId(filtered[0].id);
        } else if (filtered.length === 0) {
            setActiveId(null);
        }
    }, [projects, activeProjectId, save]);

    const activeProject = projects.find(p => p.id === activeProjectId) || null;

    return (
        <ProjectContext.Provider value={{
            projects,
            activeProject,
            setActiveProjectId,
            updateActiveProject,
            createProject,
            renameProject,
            duplicateProject,
            deleteProject
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const ctx = useContext(ProjectContext);
    if (!ctx) throw new Error('useProject must be used within ProjectProvider');
    return ctx;
}
