
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';

export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display overflow-hidden selection:bg-primary/30">
            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            ></div>

            {/* Sidebar — hidden on mobile, slide-in on toggle */}
            <div className={`
                fixed lg:relative z-40 h-full w-[280px] origin-left
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${sidebarOpen ? 'translate-x-0 opacity-100 shadow-2xl' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100 lg:shadow-none'}
                print:hidden
            `}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light dark:bg-background-dark blueprint-bg min-w-0">
                {/* Mobile hamburger button */}
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="fixed top-3 left-3 z-20 lg:hidden p-2 rounded-xl glass-panel text-slate-800 dark:text-white shadow-lg print:hidden hover:shadow-glow-primary transition-shadow"
                    aria-label="Open menu"
                >
                    <span className="material-symbols-outlined text-xl block">menu</span>
                </button>

                <div className="flex-1 overflow-y-auto w-full relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
