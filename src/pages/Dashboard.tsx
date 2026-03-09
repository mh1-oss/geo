import { Link } from 'react-router-dom';
import { useProject } from '../store/ProjectContext';

export default function Dashboard() {
    const { projects, activeProject } = useProject();

    function formatDate(ts: number) {
        const diff = Date.now() - ts;
        if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
        if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.round(diff / 86400000)}d ago`;
        return new Date(ts).toLocaleDateString();
    }

    const layers = activeProject?.soilLayers || [];
    const pile = activeProject?.pile;
    const soil = activeProject?.soil;
    const axial = activeProject?.axial;

    let qAll = 0;
    let hu = 0;
    let settlement = 0;
    let safetyFactor = 0;

    if (pile && soil && layers.length > 0) {
        const D = pile.diameter;
        const L = pile.length;
        const A_base = Math.PI * (D / 2) ** 2;
        const perimeter = Math.PI * D;
        let Qs = 0;
        let Qb = 0;
        let depthSoFar = 0;

        for (const layer of layers) {
            const layerBot = depthSoFar + layer.thickness;
            const embedTop = Math.max(depthSoFar, 0);
            const embedBot = Math.min(layerBot, L);
            depthSoFar = layerBot;

            if (embedBot <= embedTop) continue;
            const embedLength = embedBot - embedTop;

            if (layer.type === 'clay' && layer.cu) {
                const alpha = axial?.alphaFactor || 0.55;
                Qs += alpha * layer.cu * perimeter * embedLength;
                if (layerBot >= L) Qb = 9 * layer.cu * A_base;
            } else if ((layer.type === 'sand' || layer.type === 'gravel') && layer.phi) {
                const Ks = axial?.ksFactor || 0.70;
                const delta = layer.phi * 0.75 * (Math.PI / 180);
                const sigma_v = layer.unitWeight * (embedTop + embedBot) / 2;
                Qs += Ks * sigma_v * Math.tan(delta) * perimeter * embedLength;
                if (layerBot >= L) {
                    const Nq = axial?.nqFactor || 40;
                    Qb = Math.min(Nq * layer.unitWeight * L * A_base, 15000 * A_base);
                }
            }
        }
        const Qult = Qs + Qb;
        const FS = 2.5;
        qAll = Math.round(Qult / FS);
        safetyFactor = Qult > 0 ? Number((Qult / Math.max(qAll, 1)).toFixed(2)) : 0;

        if (soil.type === 'clay' && soil.cu) {
            hu = Math.round(9 * soil.cu * D * L * 0.3);
        } else if (soil.phi) {
            const Kp = Math.tan((45 + (soil.phi / 2)) * Math.PI / 180) ** 2;
            hu = Math.round(0.5 * (soil.gamma || 18) * D * L ** 2 * Kp * 0.5);
        }
        settlement = Math.round((qAll * L) / (A_base * (pile.youngsModulus * 1e6)) * 1000 + 3);
    }

    const statusColors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500'];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl z-10 sticky top-0 shadow-sm">
                <div className="flex items-center gap-4 lg:ml-0 ml-12">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-green-500/20 to-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shadow-sm">
                        <span className="material-symbols-outlined text-2xl">folder_open</span>
                    </div>
                    <div>
                        <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">
                            {activeProject?.name || 'No Project Selected'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            {activeProject ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]"></span>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Active • Modified {formatDate(activeProject.lastModified)}
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Create or select a project to begin
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm">
                        <span className="material-symbols-outlined block text-[20px]">notifications</span>
                    </button>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in">
                    
                    {/* Metric Cards - Modernised Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Card 1: Qall */}
                        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-glow-primary transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors"></div>
                            <div className="absolute top-4 right-4 p-2 bg-primary/10 text-primary rounded-xl">
                                <span className="material-symbols-outlined text-2xl">arrow_downward</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Allowable Load</p>
                            <p className="text-slate-900 dark:text-white text-4xl font-black tracking-tight mb-1">
                                {qAll > 0 ? qAll.toLocaleString() : '—'} <span className="text-xl font-bold text-slate-400 ml-1">kN</span>
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-3 flex items-center justify-between">
                                Axial Capacity
                                {qAll > 0 && (
                                    <Link to="/axial-capacity" className="text-primary hover:text-primary-dark font-bold flex items-center gap-1 group-hover:underline">
                                        View <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </Link>
                                )}
                            </p>
                        </div>

                        {/* Card 2: Hu */}
                        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-fuchsia-500/20 transition-colors"></div>
                            <div className="absolute top-4 right-4 p-2 bg-fuchsia-500/10 text-fuchsia-500 rounded-xl">
                                <span className="material-symbols-outlined text-2xl">swap_horiz</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Lateral Capacity</p>
                            <p className="text-slate-900 dark:text-white text-4xl font-black tracking-tight mb-1">
                                {hu > 0 ? hu.toLocaleString() : '—'} <span className="text-xl font-bold text-slate-400 ml-1">kN</span>
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-3 flex items-center justify-between">
                                Broms Estimate
                                {hu > 0 && (
                                    <Link to="/lateral-analysis" className="text-fuchsia-500 hover:text-fuchsia-600 font-bold flex items-center gap-1 group-hover:underline">
                                        View <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </Link>
                                )}
                            </p>
                        </div>

                        {/* Card 3: Safety Factor */}
                        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/20 transition-colors"></div>
                            <div className="absolute top-4 right-4 p-2 bg-teal-500/10 text-teal-500 rounded-xl">
                                <span className="material-symbols-outlined text-2xl">shield_locked</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Safety Factor</p>
                            <p className={`text-4xl font-black tracking-tight mb-1 ${safetyFactor >= 2 ? 'text-teal-600 dark:text-teal-400' : safetyFactor >= 1.5 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                                {safetyFactor > 0 ? safetyFactor.toFixed(2) : '—'}
                            </p>
                            <div className="mt-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${safetyFactor >= 2 ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : safetyFactor >= 1.5 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    Target: &gt; 2.0
                                </span>
                            </div>
                        </div>

                        {/* Card 4: Settlement */}
                        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-colors"></div>
                            <div className="absolute top-4 right-4 p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                                <span className="material-symbols-outlined text-2xl">vertical_align_bottom</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Est. Settlement</p>
                            <p className={`text-4xl font-black tracking-tight mb-1 ${settlement > 25 ? 'text-rose-600 dark:text-rose-400' : settlement > 15 ? 'text-amber-500' : 'text-teal-600 dark:text-teal-400'}`}>
                                {settlement > 0 ? settlement : '—'} <span className="text-xl font-bold text-slate-400 ml-1">mm</span>
                            </p>
                            <div className="mt-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${settlement > 25 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : settlement > 15 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'}`}>
                                    <span className="material-symbols-outlined text-[14px]">
                                        {settlement > 25 ? 'error' : settlement > 15 ? 'warning' : 'check_circle'}
                                    </span>
                                    {settlement > 25 ? 'Exceeds Limit' : settlement > 15 ? 'Service Limit' : 'Within Limits'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-2">
                        {/* Quick Actions */}
                        <div className="xl:col-span-2 flex flex-col gap-5">
                            <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Quick Actions</h3>
                            
                            {/* Action 1 */}
                            <Link to="/axial-capacity" className="flex flex-col sm:flex-row items-stretch justify-between gap-6 rounded-2xl glass-panel p-6 hover:shadow-glow-primary hover:border-primary/30 transition-all duration-300 group cursor-pointer relative overflow-hidden shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                <div className="flex flex-col justify-between items-start z-10 flex-1">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                                                <span className="material-symbols-outlined block text-[22px]">add</span>
                                            </div>
                                            <p className="text-slate-900 dark:text-white text-xl font-bold">New Axial Analysis</p>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
                                            Create a new pile capacity analysis based on imported SPT/CPT soil profiles. Choose from Alpha, Beta, or Lambda methods with automated layer detection.
                                        </p>
                                    </div>
                                    <div className="mt-6 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold group-hover:scale-[1.02] transition-transform flex items-center gap-2 shadow-lg">
                                        Start Analysis
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </div>
                                </div>
                                <div className="hidden sm:flex relative w-40 h-auto rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 items-center justify-center overflow-hidden">
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-primary/20"></div>
                                    <div className="w-4 h-3/4 bg-slate-400 dark:bg-slate-500 rounded-t-sm z-10 border-2 border-white dark:border-slate-800"></div>
                                </div>
                            </Link>

                            {/* Action 2 */}
                            <Link to="/load-test-lab" className="flex flex-col sm:flex-row items-stretch justify-between gap-6 rounded-2xl glass-panel p-6 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-fuchsia-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-500/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                <div className="flex flex-col justify-between items-start z-10 flex-1">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
                                                <span className="material-symbols-outlined block text-[22px]">science</span>
                                            </div>
                                            <p className="text-slate-900 dark:text-white text-xl font-bold">Load Test Lab</p>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
                                            Input field data from static or dynamic load tests to calibrate your design parameters, verify safety factors, and generate comprehensive interpretation reports.
                                        </p>
                                    </div>
                                    <div className="mt-6 px-5 py-2.5 rounded-xl bg-fuchsia-500 text-white text-sm font-bold group-hover:scale-[1.02] transition-transform flex items-center gap-2 shadow-lg shadow-fuchsia-500/20">
                                        Open Virtual Lab
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </div>
                                </div>
                                <div className="hidden sm:flex relative w-40 h-auto rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 items-center justify-center. overflow-hidden">
                                     <span className="material-symbols-outlined text-6xl text-fuchsia-500/20 m-auto block pb-2 pr-2">monitoring</span>
                                </div>
                            </Link>
                        </div>

                        {/* Recent Projects Table */}
                        <div className="flex flex-col gap-5">
                            <div className="flex justify-between items-center">
                                <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Recent Projects</h3>
                                <Link to="/projects" className="text-primary text-sm font-bold hover:underline">View Directory</Link>
                            </div>
                            <div className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-5 py-4">Project Name</th>
                                                <th className="px-5 py-4 text-right">Last Edited</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {projects.slice(0, 6).map((p, i) => (
                                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group">
                                                    <td className="px-5 py-4">
                                                        <Link to="/projects" className="flex items-center gap-3">
                                                            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[i % statusColors.length]} shadow-sm group-hover:scale-125 transition-transform`}></div>
                                                            <span className="text-slate-800 dark:text-slate-200 font-bold">{p.name}</span>
                                                        </Link>
                                                    </td>
                                                    <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400 font-medium">
                                                        {formatDate(p.lastModified)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {projects.length === 0 && (
                                                <tr>
                                                    <td colSpan={2} className="px-5 py-8 text-center">
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                                            <span className="material-symbols-outlined text-slate-400">folder_off</span>
                                                        </div>
                                                        <p className="text-slate-500 font-medium">No projects found</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
