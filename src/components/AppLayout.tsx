
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
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar — hidden on mobile, slide-in on toggle */}
            <div className={`
                fixed lg:relative z-40 h-full
                transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                print:hidden
            `}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto relative bg-background-light dark:bg-background-dark blueprint-bg min-w-0">
                {/* Mobile hamburger button */}
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="fixed top-3 left-3 z-20 lg:hidden bg-surface-dark/90 backdrop-blur-sm text-white p-2 rounded-lg border border-slate-700/40 shadow-lg print:hidden"
                    aria-label="Open menu"
                >
                    <span className="material-symbols-outlined text-xl">menu</span>
                </button>

                <Outlet />
            </main>
        </div>
    );
}
