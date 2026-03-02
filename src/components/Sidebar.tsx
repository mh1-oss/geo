import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
    onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
    const location = useLocation();

    const navLink = (path: string, icon: string, label: string) => (
        <Link
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group ${location.pathname === path ? 'bg-primary/20 text-primary border-primary/20' : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-700/30'}`}
            to={path}
            onClick={onClose}
        >
            <span className={`material-symbols-outlined ${location.pathname === path ? 'filled' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );

    return (
        <aside className="w-[280px] h-full flex flex-col bg-surface-dark border-r border-slate-700/30 flex-shrink-0">
            <div className="p-5 border-b border-slate-700/30 flex gap-3 items-center">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-2xl">architecture</span>
                </div>
                <div className="flex flex-col flex-1">
                    <h1 className="text-white text-lg font-bold leading-none">GeoPile Pro</h1>
                    <p className="text-slate-400 text-xs font-normal mt-1">Engineering Suite v2.4</p>
                </div>
                {/* Close button — visible only on mobile */}
                {onClose && (
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navLink('/', 'dashboard', 'Dashboard')}
                {navLink('/projects', 'folder', 'Projects')}
                {navLink('/soil-stratigraphy', 'layers', 'Soil Profile')}
                {navLink('/pile-designer', 'design_services', 'Pile Designer')}

                <div className="my-4 border-t border-slate-700/30"></div>

                <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Analysis Tools</p>
                {navLink('/axial-capacity', 'arrow_downward', 'Axial Capacity')}
                {navLink('/pipe-pile-plugging', 'circle', 'Pipe Piles')}
                {navLink('/load-test-lab', 'science', 'Load Test Lab')}
                {navLink('/lateral-analysis', 'show_chart', 'Lateral Analysis')}
                {navLink('/sensitivity', 'tune', 'Sensitivity')}

                <div className="my-4 border-t border-slate-700/30"></div>

                {navLink('/report', 'description', 'Report')}
            </nav>

            <div className="p-4 border-t border-slate-700/30 bg-background-dark/50">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold" data-alt="User Avatar">MH</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Mohammed</p>
                        <p className="text-xs text-slate-400 truncate">Lead Engineer</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">settings</span>
                </div>
            </div>
        </aside>
    );
}
