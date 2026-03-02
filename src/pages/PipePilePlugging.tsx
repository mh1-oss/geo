import { useState, useMemo } from 'react';
import { useProject } from '../store/ProjectContext';

export default function PipePilePlugging() {
    const { activeProject, updateActiveProject } = useProject();
    const pp = activeProject?.pipePile;

    const [L1, setL1] = useState(pp?.L1 || 24.50);
    const [L2, setL2] = useState(pp?.L2 || 18.35);
    const [D1, setD1] = useState(pp?.D1 || 914);
    const [D2, setD2] = useState(pp?.D2 || 19);

    const results = useMemo(() => {
        const IFR = L1 > 0 ? L2 / L1 : 0;
        const PLR = L1 > 0 ? L2 / L1 : 0;
        const innerD = D1 - 2 * D2;
        const plugHeight = L1 > 0 ? (L2 / L1) * 100 : 0;

        let status: 'UNPLUGGED' | 'PARTIALLY PLUGGED' | 'FULLY PLUGGED' = 'PARTIALLY PLUGGED';
        let statusColor = 'amber';
        let statusDesc = 'Soil plug is advancing slower than pile tip.';
        let statusDesc2 = 'Internal shaft friction mobilising.';

        if (IFR >= 0.98) {
            status = 'UNPLUGGED';
            statusColor = 'red';
            statusDesc = 'Soil plug is advancing at the same rate as pile tip.';
            statusDesc2 = 'No internal friction mobilised.';
        } else if (IFR <= 0.3) {
            status = 'FULLY PLUGGED';
            statusColor = 'green';
            statusDesc = 'Soil plug is not advancing with pile penetration.';
            statusDesc2 = 'Full internal shaft friction mobilised.';
        }

        return { IFR, PLR, innerD, plugHeight, status, statusColor, statusDesc, statusDesc2 };
    }, [L1, L2, D1, D2]);

    function handleReset() {
        setL1(24.50); setL2(18.35); setD1(914); setD2(19);
    }

    function saveParams() {
        updateActiveProject({ pipePile: { L1, L2, D1, D2 } });
    }

    const colorMap: Record<string, string> = {
        amber: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
        red: 'bg-red-500/10 border-red-500/30 text-red-500',
        green: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
    };

    return (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
                {/* Page Header */}
                <div className="flex flex-wrap justify-between items-end gap-4 border-b border-slate-200 dark:border-[#223649] pb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Analysis Module</span>
                        </div>
                        <h1 className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">Pipe Pile Plugging Analysis</h1>
                        <p className="text-slate-500 dark:text-[#90adcb] text-sm">Incremental Filling Ratio (IFR) &amp; Plug Length Ratio (PLR) Calculation according to API RP 2GEO.</p>
                    </div>
                    <button onClick={saveParams} className="text-sm font-medium px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">save</span> Save
                    </button>
                </div>
                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Left Column */}
                    <div className="lg:col-span-7 flex flex-col gap-6 overflow-y-auto pr-2">
                        {/* Input Section */}
                        <section className="bg-white dark:bg-[#182634] rounded-xl border border-slate-200 dark:border-[#223649] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-slate-900 dark:text-white text-lg font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">input</span>
                                    Input Parameters
                                </h3>
                                <button onClick={handleReset} className="text-xs font-medium text-primary hover:text-blue-400">Reset to Defaults</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <label className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-700 dark:text-[#e2e8f0] text-sm font-medium">L1 - Penetration Depth</span>
                                        <span className="text-slate-400 text-xs">meters</span>
                                    </div>
                                    <input className="w-full bg-slate-50 dark:bg-background-dark border border-slate-300 dark:border-[#223649] rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono" step="0.1" type="number" value={L1} onChange={(e) => setL1(Number(e.target.value))} />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-700 dark:text-[#e2e8f0] text-sm font-medium">L2 - Plug Length</span>
                                        <span className="text-slate-400 text-xs">meters</span>
                                    </div>
                                    <input className="w-full bg-slate-50 dark:bg-background-dark border border-slate-300 dark:border-[#223649] rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono" step="0.1" type="number" value={L2} onChange={(e) => setL2(Number(e.target.value))} />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-700 dark:text-[#e2e8f0] text-sm font-medium">D1 - Outer Diameter</span>
                                        <span className="text-slate-400 text-xs">mm</span>
                                    </div>
                                    <input className="w-full bg-slate-50 dark:bg-background-dark border border-slate-300 dark:border-[#223649] rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono" type="number" value={D1} onChange={(e) => setD1(Number(e.target.value))} />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-700 dark:text-[#e2e8f0] text-sm font-medium">D2 - Wall Thickness</span>
                                        <span className="text-slate-400 text-xs">mm</span>
                                    </div>
                                    <input className="w-full bg-slate-50 dark:bg-background-dark border border-slate-300 dark:border-[#223649] rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono" type="number" value={D2} onChange={(e) => setD2(Number(e.target.value))} />
                                </label>
                            </div>
                        </section>
                        {/* Results Section */}
                        <section className="bg-white dark:bg-[#182634] rounded-xl border border-slate-200 dark:border-[#223649] p-6 shadow-sm flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-slate-900 dark:text-white text-lg font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">calculate</span>
                                    Calculation Results
                                </h3>
                                <span className="text-xs text-slate-500 dark:text-[#90adcb]">Inner Ø: {results.innerD.toFixed(0)} mm</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* IFR Card */}
                                <div className="bg-slate-50 dark:bg-background-dark rounded-xl p-5 border border-slate-200 dark:border-[#223649] relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="material-symbols-outlined text-6xl text-primary">percent</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-[#90adcb] text-sm font-medium uppercase tracking-wider mb-2">IFR (Incremental Filling Ratio)</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold text-slate-900 dark:text-white font-mono">{results.IFR.toFixed(2)}</span>
                                    </div>
                                    <div className="mt-3 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(results.IFR * 100, 100)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Target range: 0.75 - 0.90</p>
                                </div>
                                {/* PLR Card */}
                                <div className="bg-slate-50 dark:bg-background-dark rounded-xl p-5 border border-slate-200 dark:border-[#223649] relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="material-symbols-outlined text-6xl text-primary">straighten</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-[#90adcb] text-sm font-medium uppercase tracking-wider mb-2">PLR (Plug Length Ratio)</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold text-slate-900 dark:text-white font-mono">{results.PLR.toFixed(2)}</span>
                                    </div>
                                    <div className="mt-3 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(results.PLR * 100, 100)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Plug Length / Penetration Depth</p>
                                </div>
                            </div>
                            {/* Status Badge */}
                            <div className={`mt-auto border rounded-xl p-4 flex items-center justify-between ${colorMap[results.statusColor]}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`size-10 rounded-full flex items-center justify-center ${results.statusColor === 'green' ? 'bg-emerald-500/20' : results.statusColor === 'red' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                                        <span className="material-symbols-outlined">{results.statusColor === 'green' ? 'check_circle' : results.statusColor === 'red' ? 'error' : 'warning'}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider">Analysis Status</p>
                                        <p className="text-xl font-bold tracking-tight">{results.status}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:block text-right">
                                    <p className="text-slate-400 text-xs">{results.statusDesc}</p>
                                    <p className="text-slate-400 text-xs">{results.statusDesc2}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                    {/* Right Column: Visualization */}
                    <div className="lg:col-span-5 h-full min-h-[500px] flex flex-col">
                        <section className="bg-white dark:bg-[#182634] rounded-xl border border-slate-200 dark:border-[#223649] h-full flex flex-col overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-200 dark:border-[#223649] bg-slate-50 dark:bg-[#15202b] flex justify-between items-center">
                                <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider">Cross-Section View</h3>
                            </div>
                            <div className="relative flex-1 bg-[#0f161d] w-full flex justify-center items-center overflow-hidden p-8">
                                {/* Soil Layers Background */}
                                <div className="absolute inset-0 z-0 flex flex-col">
                                    <div className="h-[20%] bg-[#1a2c3d] border-b border-slate-700/30 w-full relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-500">Water Layer</span>
                                    </div>
                                    <div className="h-[30%] bg-gradient-to-b from-[#2a2622] to-[#221e1a] border-b border-slate-700/30 w-full relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-500">Soft Clay</span>
                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                    </div>
                                    <div className="flex-1 bg-gradient-to-b from-[#221e1a] to-[#1a1714] w-full relative">
                                        <span className="absolute top-2 right-2 text-[10px] text-slate-500">Dense Sand</span>
                                        <div className="absolute inset-0 opacity-5" style={{ background: 'repeating-linear-gradient(45deg, #606dbc, #606dbc 10px, #465298 10px, #465298 20px)' }}></div>
                                    </div>
                                </div>
                                {/* Pile Visualization */}
                                <div className="relative z-10 w-24 h-full flex flex-col items-center">
                                    <div className="w-full h-[15%] border-x-4 border-slate-400 bg-transparent relative"></div>
                                    <div className="w-full h-[85%] border-x-4 border-slate-400 bg-transparent relative flex flex-col justify-end">
                                        {/* Dynamic Soil Plug */}
                                        <div className="w-full bg-[#3d362f] border-t border-dashed border-amber-500/50 relative transition-all duration-500" style={{ height: `${results.plugHeight}%` }}>
                                            <div className="absolute -top-3 -right-24 flex items-center gap-1">
                                                <div className="h-[1px] w-8 bg-amber-500"></div>
                                                <span className="text-amber-500 text-[10px] font-mono bg-[#101922] px-1 rounded border border-amber-500/30">L2: {L2.toFixed(2)}m</span>
                                            </div>
                                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#d97706 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 w-full h-1 bg-slate-300"></div>
                                    <div className="absolute left-[-20px] top-[15%] bottom-0 border-l border-slate-600 flex flex-col justify-between py-2">
                                        <span className="text-[9px] text-slate-500 -ml-6">0m</span>
                                        <span className="text-[9px] text-slate-500 -ml-8">{L1.toFixed(1)}m</span>
                                    </div>
                                    <div className="absolute bottom-0 -left-32 flex items-center gap-1">
                                        <span className="text-primary text-[10px] font-mono bg-[#101922] px-1 rounded border border-primary/30">L1: {L1.toFixed(2)}m</span>
                                        <div className="h-[1px] w-8 bg-primary"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-[#15202b] border-t border-slate-200 dark:border-[#223649]">
                                <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-2"><div className="size-3 bg-[#3d362f] border border-amber-500/50 rounded-sm"></div><span>Soil Plug</span></div>
                                    <div className="flex items-center gap-2"><div className="size-3 border-2 border-slate-400 rounded-sm"></div><span>Steel Pile</span></div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-[1px] bg-primary"></div><span>Penetration Depth</span></div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
