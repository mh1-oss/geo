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

    return (
        <div className="flex flex-1 w-full h-full flex-col lg:flex-row relative">
            {/* Left Sidebar: Configuration */}
            <aside className="w-full lg:w-[340px] flex flex-col glass-panel flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-auto lg:h-full lg:overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <span className="material-symbols-outlined block text-[24px]">straighten</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Pile Plugging</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">{activeProject?.name || 'Unsaved'}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-8 flex-1">
                    {/* Input Parameters */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-primary">input</span>
                                Geometry Inputs
                            </h3>
                            <button onClick={handleReset} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                                Reset
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {/* L1 */}
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Penetration Depth</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">L1</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" step="0.1" value={L1} onChange={(e) => setL1(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">m</span>
                                </div>
                            </div>
                            {/* L2 */}
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Plug Length</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">L2</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" step="0.1" value={L2} onChange={(e) => setL2(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">m</span>
                                </div>
                            </div>
                            {/* D1 */}
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Outer Diameter</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">D1</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" value={D1} onChange={(e) => setD1(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">mm</span>
                                </div>
                            </div>
                            {/* D2 */}
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Wall Thickness</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">D2</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" value={D2} onChange={(e) => setD2(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={saveParams} className="mt-auto w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg hover:shadow-glow-primary hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        Save Parameters
                    </button>
                </div>
            </aside>

            {/* Right Side: Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar z-10 relative">
                <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 flex flex-col gap-6 lg:gap-8">
                    
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 animate-fade-in">
                        {/* IFR Card */}
                        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-symbols-outlined text-[80px] text-primary">percent</span>
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">IFR (Incremental Filling Ratio)</h3>
                            <div className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-mono mb-4">
                                {results.IFR.toFixed(2)}
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(results.IFR * 100, 100)}%` }}></div>
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-3">Target Range: 0.75 - 0.90</p>
                        </div>
                        
                        {/* PLR Card */}
                        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-lg hover:border-amber-500/30 transition-all duration-300">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-symbols-outlined text-[80px] text-amber-500">straighten</span>
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">PLR (Plug Length Ratio)</h3>
                            <div className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-mono mb-4">
                                {results.PLR.toFixed(2)}
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(results.PLR * 100, 100)}%` }}></div>
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-3">Plug Length / Penetration Depth</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`p-6 rounded-2xl flex items-center justify-between border shadow-sm animate-fade-in [animation-delay:100ms] ${results.statusColor === 'green' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : results.statusColor === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[28px]">{results.statusColor === 'green' ? 'check_circle' : results.statusColor === 'red' ? 'error' : 'warning'}</span>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Analysis Status</h4>
                                <h2 className="text-2xl font-bold tracking-tight">{results.status}</h2>
                            </div>
                        </div>
                        <div className="hidden sm:block text-right border-l border-current pl-6 opacity-80 border-opacity-20">
                            <p className="text-sm font-medium">{results.statusDesc}</p>
                            <p className="text-sm">{results.statusDesc2}</p>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="glass-panel rounded-2xl flex flex-col overflow-hidden shadow-sm animate-fade-in [animation-delay:200ms]">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-800/20">
                            <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">view_in_ar</span>
                                Cross-Section View
                            </h3>
                            <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-bold border border-slate-200 dark:border-slate-700/50">
                                Inner Ø: {results.innerD.toFixed(0)} mm
                            </span>
                        </div>
                        <div className="relative h-[480px] bg-slate-50 dark:bg-[#0f161d] w-full flex justify-center items-center overflow-hidden p-8">
                            {/* Soil Layers Background */}
                            <div className="absolute inset-0 z-0 flex flex-col pointer-events-none">
                                <div className="h-[20%] bg-blue-500/5 dark:bg-[#1a2c3d] border-b border-slate-200 dark:border-slate-700/30 w-full relative">
                                    <span className="absolute top-2 right-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Water Layer</span>
                                </div>
                                <div className="h-[30%] bg-slate-100 dark:bg-gradient-to-b dark:from-[#2a2622] dark:to-[#221e1a] border-b border-slate-200 dark:border-slate-700/30 w-full relative">
                                    <span className="absolute top-2 right-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Soft Clay</span>
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                </div>
                                <div className="flex-1 bg-slate-200 dark:bg-gradient-to-b dark:from-[#221e1a] dark:to-[#1a1714] w-full relative">
                                    <span className="absolute top-2 right-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Dense Sand</span>
                                    <div className="absolute inset-0 opacity-5" style={{ background: 'repeating-linear-gradient(45deg, #606dbc, #606dbc 10px, #465298 10px, #465298 20px)' }}></div>
                                </div>
                            </div>
                            {/* Pile Visualization */}
                            <div className="relative z-10 w-32 h-full flex flex-col items-center">
                                <div className="w-full h-[15%] border-x-8 border-slate-300 dark:border-slate-400 bg-transparent relative"></div>
                                <div className="w-full h-[85%] border-x-8 border-slate-300 dark:border-slate-400 bg-transparent relative flex flex-col justify-end">
                                    {/* Dynamic Soil Plug */}
                                    <div className="w-full bg-[#d0bba6] dark:bg-[#3d362f] border-t-2 border-dashed border-amber-600 dark:border-amber-500/80 relative transition-all duration-500" style={{ height: `${results.plugHeight}%` }}>
                                        <div className="absolute -top-3 -right-24 flex items-center gap-1">
                                            <div className="h-[2px] w-8 bg-amber-500"></div>
                                            <span className="text-amber-700 dark:text-amber-500 text-[10px] font-mono font-bold bg-amber-50 dark:bg-[#101922] px-1.5 py-0.5 rounded shadow-sm border border-amber-200 dark:border-amber-500/30">L2: {L2.toFixed(2)}m</span>
                                        </div>
                                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#d97706 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }}></div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 w-full h-2 bg-slate-400"></div>
                                <div className="absolute left-[-24px] top-[15%] bottom-0 border-l-2 border-slate-400 dark:border-slate-600 flex flex-col justify-between py-2">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 -ml-8">0m</span>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 -ml-10">{L1.toFixed(1)}m</span>
                                </div>
                                <div className="absolute bottom-0 -left-32 flex items-center gap-1">
                                    <span className="text-primary text-[10px] font-mono font-bold bg-blue-50 dark:bg-[#101922] px-1.5 py-0.5 rounded shadow-sm border border-blue-200 dark:border-primary/30">L1: {L1.toFixed(2)}m</span>
                                    <div className="h-[2px] w-8 bg-primary"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
