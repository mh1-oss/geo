import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
    onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
    const location = useLocation();

    const navLink = (path: string, icon: string, label: string) => {
        const isActive = location.pathname === path;
        return (
            <Link
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden ${
                    isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary' 
                        : 'text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
                to={path}
                onClick={onClose}
            >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 bg-primary rounded-r-md"></div>
                )}
                <span className={`material-symbols-outlined ${isActive ? 'filled' : 'group-hover:scale-110 transition-transform'}`}>
                    {icon}
                </span>
                <span className="text-sm font-semibold tracking-wide">{label}</span>
            </Link>
        );
    };

    return (
        <aside className="w-full h-full flex flex-col bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none flex-shrink-0 relative z-50">
            {/* Header / Logo */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex gap-4 items-center relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-glow-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[28px]">architecture</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <h1 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight truncate">GeoPile Pro</h1>
                    <p className="text-primary text-xs font-semibold tracking-wider uppercase mt-0.5">by Mohammed Mustafa</p>
                </div>
                {/* Close button — visible only on mobile */}
                {onClose && (
                    <button onClick={onClose} className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[20px] block">close</span>
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
                {navLink('/', 'dashboard', 'Dashboard')}
                {navLink('/projects', 'folder', 'Projects')}
                {navLink('/soil-stratigraphy', 'layers', 'Soil Profile')}
                {navLink('/pile-designer', 'design_services', 'Pile Designer')}

                <div className="my-6 border-t border-slate-200 dark:border-slate-800/60"></div>

                <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Analysis Tools</p>
                {navLink('/axial-capacity', 'arrow_downward', 'Axial Capacity')}
                {navLink('/pipe-pile-plugging', 'circle', 'Pipe Piles')}
                {navLink('/load-test-lab', 'science', 'Load Test Lab')}
                {navLink('/lateral-analysis', 'show_chart', 'Lateral Analysis')}
                {navLink('/sensitivity', 'tune', 'Sensitivity')}

                <div className="my-6 border-t border-slate-200 dark:border-slate-800/60"></div>

                {navLink('/report', 'description', 'Report')}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-background-dark/30">
                <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-sm transition-all text-left group">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white text-sm font-bold ring-2 ring-transparent group-hover:ring-primary/20 transition-all flex-shrink-0">
                        MH
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Mohammed</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium uppercase tracking-wider mt-0.5">Lead Engineer</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[20px] group-hover:rotate-45 transition-transform duration-300">settings</span>
                </button>
            </div>
        </aside>
    );
}
