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

    // Compute summary values from active project
    const layers = activeProject?.soilLayers || [];
    const pile = activeProject?.pile;
    const soil = activeProject?.soil;
    const axial = activeProject?.axial;

    // Simple axial capacity estimate (Alpha method for clay, Beta for sand)
    let qAll = 0;
    let hu = 0;
    let settlement = 0;
    let safetyFactor = 0;

    if (pile && soil && layers.length > 0) {
        const D = pile.diameter;
        const L = pile.length;
        const A_base = Math.PI * (D / 2) ** 2;
        const perimeter = Math.PI * D;

        let Qs = 0; // Shaft capacity
        let Qb = 0; // Base capacity
        let depthSoFar = 0;

        for (const layer of layers) {
            const layerTop = depthSoFar;
            const layerBot = depthSoFar + layer.thickness;
            depthSoFar = layerBot;
            // Only consider layers within pile length
            const embedTop = Math.max(layerTop, 0);
            const embedBot = Math.min(layerBot, L);
            if (embedBot <= embedTop) continue;
            const embedLength = embedBot - embedTop;

            if (layer.type === 'clay' && layer.cu) {
                const alpha = axial?.alphaFactor || 0.55;
                Qs += alpha * layer.cu * perimeter * embedLength;
                if (layerBot >= L) {
                    Qb = 9 * layer.cu * A_base;
                }
            } else if ((layer.type === 'sand' || layer.type === 'gravel') && layer.phi) {
                const Ks = axial?.ksFactor || 0.70;
                const delta = layer.phi * 0.75 * (Math.PI / 180);
                const sigma_v = layer.unitWeight * (embedTop + embedBot) / 2;
                Qs += Ks * sigma_v * Math.tan(delta) * perimeter * embedLength;
                if (layerBot >= L) {
                    const Nq = axial?.nqFactor || 40;
                    Qb = Nq * layer.unitWeight * L * A_base;
                    Qb = Math.min(Qb, 15000 * A_base); // Cap for dense sand
                }
            }
        }

        const Qult = Qs + Qb;
        const FS = 2.5;
        qAll = Math.round(Qult / FS);
        safetyFactor = Qult > 0 ? Number((Qult / Math.max(qAll, 1)).toFixed(2)) : 0;

        // Simplified lateral (Broms approach estimate)
        if (soil.type === 'clay' && soil.cu) {
            hu = Math.round(9 * soil.cu * D * L * 0.3);
        } else if (soil.phi) {
            const Kp = Math.tan((45 + (soil.phi / 2)) * Math.PI / 180) ** 2;
            hu = Math.round(0.5 * (soil.gamma || 18) * D * L ** 2 * Kp * 0.5);
        }

        // Settlement estimate (elastic shortening + tip)
        settlement = Math.round((qAll * L) / (A_base * (pile.youngsModulus * 1e6)) * 1000 + 3);
    }

    const statusColors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-slate-500'];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] relative">
            <div className="absolute inset-0 bg-gradient-to-br from-background-dark via-transparent to-background-dark pointer-events-none"></div>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30 bg-background-dark/80 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
                        <span className="material-symbols-outlined">folder_open</span>
                    </div>
                    <div>
                        <h2 className="text-white text-lg font-bold leading-tight">{activeProject?.name || 'No Project Selected'}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs text-slate-400">
                                {activeProject ? `Last modified ${formatDate(activeProject.lastModified)}` : 'Create or select a project'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-lg bg-surface-dark hover:bg-slate-700 text-slate-300 border border-slate-700/30 transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                </div>
            </header>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 z-10">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Qall */}
                        <div className="bg-surface-dark/90 backdrop-blur border border-slate-700/30 rounded-xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-6xl text-primary">arrow_downward</span>
                            </div>
                            <p className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2">
                                Axial Allowable Load (Qall)
                                <span className="material-symbols-outlined text-[16px] text-slate-500 cursor-help">info</span>
                            </p>
                            <p className="text-primary text-4xl font-bold tracking-tight mb-2">
                                {qAll > 0 ? qAll.toLocaleString() : '—'} <span className="text-xl font-normal text-slate-400">kN</span>
                            </p>
                            {qAll > 0 && (
                                <Link to="/axial-capacity" className="flex items-center gap-1 text-primary/70 hover:text-primary text-xs font-medium transition-colors">
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    View Details
                                </Link>
                            )}
                        </div>
                        {/* Card 2: Hu */}
                        <div className="bg-surface-dark/90 backdrop-blur border border-slate-700/30 rounded-xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-6xl text-primary">swap_horiz</span>
                            </div>
                            <p className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2">
                                Lateral Capacity (Hu)
                                <span className="material-symbols-outlined text-[16px] text-slate-500 cursor-help">info</span>
                            </p>
                            <p className="text-primary text-4xl font-bold tracking-tight mb-2">
                                {hu > 0 ? hu.toLocaleString() : '—'} <span className="text-xl font-normal text-slate-400">kN</span>
                            </p>
                            {hu > 0 && (
                                <Link to="/lateral-analysis" className="flex items-center gap-1 text-primary/70 hover:text-primary text-xs font-medium transition-colors">
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    View Details
                                </Link>
                            )}
                        </div>
                        {/* Card 3: Safety Factor */}
                        <div className="bg-surface-dark/90 backdrop-blur border border-slate-700/30 rounded-xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-6xl text-slate-400">shield</span>
                            </div>
                            <p className="text-slate-400 text-sm font-medium mb-2">Global Safety Factor</p>
                            <p className={`text-4xl font-bold tracking-tight mb-2 ${safetyFactor >= 2 ? 'text-green-400' : safetyFactor >= 1.5 ? 'text-orange-400' : 'text-white'}`}>
                                {safetyFactor > 0 ? safetyFactor.toFixed(2) : '—'}
                            </p>
                            <div className={`flex items-center gap-1 text-sm font-medium w-fit px-2 py-0.5 rounded ${safetyFactor >= 2 ? 'text-green-400 bg-green-400/10' : safetyFactor >= 1.5 ? 'text-orange-400 bg-orange-400/10' : 'text-slate-400 bg-slate-700/30'
                                }`}>
                                <span>Target: &gt; 2.0</span>
                            </div>
                        </div>
                        {/* Card 4: Settlement */}
                        <div className="bg-surface-dark/90 backdrop-blur border border-slate-700/30 rounded-xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-6xl text-orange-400">vertical_align_bottom</span>
                            </div>
                            <p className="text-slate-400 text-sm font-medium mb-2">Est. Settlement</p>
                            <p className={`text-4xl font-bold tracking-tight mb-2 ${settlement > 25 ? 'text-red-400' : settlement > 15 ? 'text-orange-400' : 'text-green-400'}`}>
                                {settlement > 0 ? settlement : '—'} <span className="text-xl font-normal text-slate-400">mm</span>
                            </p>
                            <div className={`flex items-center gap-1 text-sm font-medium w-fit px-2 py-0.5 rounded ${settlement > 25 ? 'text-red-400 bg-red-400/10' : settlement > 15 ? 'text-orange-400 bg-orange-400/10' : 'text-green-400 bg-green-400/10'
                                }`}>
                                <span className="material-symbols-outlined text-[16px]">{settlement > 25 ? 'error' : settlement > 15 ? 'warning' : 'check_circle'}</span>
                                <span>{settlement > 25 ? 'Exceeds Limit' : settlement > 15 ? 'Service Limit' : 'Within Limits'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Quick Actions Section */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <h3 className="text-white text-lg font-bold">Quick Actions</h3>
                            {/* Action 1 */}
                            <div className="flex items-stretch justify-between gap-6 rounded-xl bg-surface-dark/80 border border-slate-700/30 p-5 hover:border-primary/50 transition-colors group cursor-pointer relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
                                <div className="flex flex-col justify-between items-start z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 rounded bg-primary/20 text-primary">
                                                <span className="material-symbols-outlined text-[20px]">add</span>
                                            </div>
                                            <p className="text-white text-lg font-bold leading-tight">Start New Axial Analysis</p>
                                        </div>
                                        <p className="text-slate-400 text-sm font-normal leading-relaxed max-w-md">Create a new pile capacity analysis based on imported SPT/CPT soil profiles. Choose from Alpha, Beta, or Lambda methods.</p>
                                    </div>
                                    <Link to="/axial-capacity" className="mt-4 px-4 py-2 rounded-lg bg-surface-dark border border-slate-600 text-white text-sm font-medium group-hover:bg-primary group-hover:border-primary transition-colors flex items-center gap-2">
                                        Start Analysis
                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </Link>
                                </div>
                                <div className="hidden sm:block w-32 h-full rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-primary/30"></span>
                                </div>
                            </div>
                            {/* Action 2 */}
                            <div className="flex items-stretch justify-between gap-6 rounded-xl bg-surface-dark/80 border border-slate-700/30 p-5 hover:border-purple-500/50 transition-colors group cursor-pointer relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>
                                <div className="flex flex-col justify-between items-start z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 rounded bg-purple-500/20 text-purple-400">
                                                <span className="material-symbols-outlined text-[20px]">science</span>
                                            </div>
                                            <p className="text-white text-lg font-bold leading-tight">Open Load Test Lab</p>
                                        </div>
                                        <p className="text-slate-400 text-sm font-normal leading-relaxed max-w-md">Input field data from static or dynamic load tests to calibrate your design parameters and verify safety factors.</p>
                                    </div>
                                    <Link to="/load-test-lab" className="mt-4 px-4 py-2 rounded-lg bg-surface-dark border border-slate-600 text-white text-sm font-medium group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white transition-colors flex items-center gap-2">
                                        Open Lab
                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </Link>
                                </div>
                                <div className="hidden sm:block w-32 h-full rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5"></div>
                            </div>
                        </div>
                        {/* Recent Projects Table */}
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-white text-lg font-bold">Recent Projects</h3>
                                <Link to="/projects" className="text-primary text-sm font-medium hover:underline">View All</Link>
                            </div>
                            <div className="bg-surface-dark/80 border border-slate-700/30 rounded-xl overflow-hidden flex-1">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-800/50 text-slate-400 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Project Name</th>
                                            <th className="px-4 py-3 text-right">Last Edited</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {projects.slice(0, 5).map((p, i) => (
                                            <tr key={p.id} className="hover:bg-slate-700/20 transition-colors cursor-pointer">
                                                <td className="px-4 py-3 text-white font-medium">
                                                    <Link to="/projects" className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${statusColors[i % statusColors.length]}`}></div>
                                                        {p.name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-400">{formatDate(p.lastModified)}</td>
                                            </tr>
                                        ))}
                                        {projects.length === 0 && (
                                            <tr>
                                                <td colSpan={2} className="px-4 py-6 text-center text-slate-500">No projects yet</td>
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
    );
}
