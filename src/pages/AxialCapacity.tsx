import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../store/ProjectContext';

interface LayerResult {
    depthFrom: number;
    depthTo: number;
    name: string;
    type: string;
    skinFriction: number;
    percentage: number;
    color: string;
}

export default function AxialCapacity() {
    const { activeProject, updateActiveProject } = useProject();

    const ax = activeProject?.axial;
    const layers = activeProject?.soilLayers || [];

    const [pileType, setPileType] = useState(ax?.pileType || 'Bored Pile (Drilled Shaft)');
    const [diameter, setDiameter] = useState(ax?.diameter || 1200);
    const [length, setLength] = useState(ax?.length || 24.5);
    const [alphaFactor, setAlphaFactor] = useState(ax?.alphaFactor || 0.65);
    const [ksFactor, setKsFactor] = useState(ax?.ksFactor || 0.70);
    const [nqFactor, setNqFactor] = useState(ax?.nqFactor || 45.0);

    const [activeTab, setActiveTab] = useState<'stress' | 'breakdown'>('stress');

    // Run analysis computation
    const results = useMemo(() => {
        const D = diameter / 1000; // mm → m
        const L = length;
        const A_base = Math.PI * (D / 2) ** 2;
        const perimeter = Math.PI * D;

        let totalQs = 0;
        let Qb = 0;
        let depthSoFar = 0;
        const layerResults: LayerResult[] = [];
        const stressPoints: { depth: number; sigma: number; pore: number }[] = [{ depth: 0, sigma: 0, pore: 0 }];

        for (const layer of layers) {
            const layerTop = depthSoFar;
            const layerBot = depthSoFar + layer.thickness;
            depthSoFar = layerBot;
            const embedTop = Math.max(layerTop, 0);
            const embedBot = Math.min(layerBot, L);
            if (embedBot <= embedTop) continue;
            const embedLength = embedBot - embedTop;

            let skinFriction = 0;

            if ((layer.type === 'clay' || layer.type === 'silt') && layer.cu) {
                skinFriction = alphaFactor * layer.cu * perimeter * embedLength;
                if (layerBot >= L) {
                    Qb = 9 * layer.cu * A_base;
                }
            } else if ((layer.type === 'sand' || layer.type === 'gravel') && layer.phi) {
                const delta = layer.phi * 0.75 * (Math.PI / 180);
                const sigma_v = layer.unitWeight * (embedTop + embedBot) / 2;
                skinFriction = ksFactor * sigma_v * Math.tan(delta) * perimeter * embedLength;
                if (layerBot >= L) {
                    Qb = nqFactor * layer.unitWeight * L * A_base;
                    Qb = Math.min(Qb, 15000 * A_base);
                }
            }

            totalQs += skinFriction;
            layerResults.push({
                depthFrom: embedTop,
                depthTo: embedBot,
                name: layer.name,
                type: layer.type,
                skinFriction,
                percentage: 0,
                color: layer.color,
            });

            // Stress profile
            const sigma = layer.unitWeight * embedBot;
            const pore = Math.max(0, (embedBot - 2) * 9.81); // assume WT at 2m
            stressPoints.push({ depth: embedBot, sigma, pore });
        }

        const Qult = totalQs + Qb;
        const FS = 2.5;
        const Qall = Qult / FS;

        // Set percentages
        for (const lr of layerResults) {
            lr.percentage = totalQs > 0 ? (lr.skinFriction / totalQs) * 100 : 0;
        }

        const skinPercent = Qult > 0 ? (totalQs / Qult) * 100 : 0;

        // Toe bearing stress
        const toeBearing = Qb / A_base;

        return {
            Qall: Math.round(Qall),
            Qult: Math.round(Qult),
            Qs: Math.round(totalQs),
            Qb: Math.round(Qb),
            FS,
            layerResults,
            stressPoints,
            skinPercent: Math.round(skinPercent),
            toeBearing: Math.round(toeBearing),
        };
    }, [diameter, length, alphaFactor, ksFactor, nqFactor, layers]);

    function runAnalysis() {
        updateActiveProject({
            axial: { pileType, diameter, length, alphaFactor, ksFactor, nqFactor }
        });
    }

    // For stress chart SVG
    const maxDepth = length;
    const maxStress = Math.max(...results.stressPoints.map(p => p.sigma), 1);

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto custom-scrollbar relative z-10">
            {/* Breadcrumbs & Header */}
            <div className="flex flex-col gap-2 mb-8 animate-slide-up">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
                    <Link className="hover:text-primary transition-colors" to="/">{activeProject?.name || 'Unsaved Project'}</Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <span className="text-slate-900 dark:text-white">Axial Capacity</span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm">
                            <span className="material-symbols-outlined text-[28px] block">architecture</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Axial Capacity</h1>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={runAnalysis}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-all font-bold text-sm shadow-lg hover:shadow-glow-primary hover:-translate-y-0.5"
                        >
                            <span className="material-symbols-outlined text-[20px] block">play_arrow</span>
                            Run Analysis
                        </button>
                    </div>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-h-[600px]">
                
                {/* Left Column: Inputs */}
                <div className="lg:col-span-3 flex flex-col gap-6 animate-fade-in">
                    <div className="glass-panel rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Parameters</h3>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configure pile geometry</p>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Pile Type */}
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pile Type</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-shadow shadow-sm hover:shadow-md cursor-pointer font-bold text-sm"
                                        value={pileType}
                                        onChange={(e) => setPileType(e.target.value)}
                                    >
                                        <option>Bored Pile (Drilled Shaft)</option>
                                        <option>Driven Pile (Precast)</option>
                                        <option>CFA Pile</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined block">expand_more</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Geometry Inputs container with slightly varied style */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 space-y-4 shadow-inner">
                                {/* Diameter */}
                                <div className="flex flex-col gap-1.5 focus-within:text-primary transition-colors">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Diameter</label>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">mm</span>
                                    </div>
                                    <input
                                        className="w-full bg-transparent border-b-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white px-1 py-1 focus:border-primary outline-none transition-colors font-mono font-bold text-lg"
                                        type="number" value={diameter}
                                        onChange={(e) => setDiameter(Number(e.target.value))}
                                    />
                                </div>
                                {/* Length */}
                                <div className="flex flex-col gap-1.5 focus-within:text-primary transition-colors">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Effective Length</label>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">m</span>
                                    </div>
                                    <input
                                        className="w-full bg-transparent border-b-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white px-1 py-1 focus:border-primary outline-none transition-colors font-mono font-bold text-lg"
                                        type="number" step="0.5" value={length}
                                        onChange={(e) => setLength(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Alpha Factor Slider */}
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Alpha (α)</label>
                                    <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{alphaFactor.toFixed(2)}</span>
                                </div>
                                <input
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary outline-none focus:ring-2 ring-primary/30"
                                    max="1" min="0" step="0.05" type="range"
                                    value={alphaFactor}
                                    onChange={(e) => setAlphaFactor(Number(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <span>Smooth</span>
                                    <span>Rough</span>
                                </div>
                            </div>
                            
                            {/* Soil Parameters Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ks Factor</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none font-mono text-center font-bold shadow-sm"
                                        type="number" step="0.05"
                                        value={ksFactor}
                                        onChange={(e) => setKsFactor(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nq Factor</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none font-mono text-center font-bold shadow-sm"
                                        type="number" step="1"
                                        value={nqFactor}
                                        onChange={(e) => setNqFactor(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/soil-stratigraphy" className="group flex flex-col items-center justify-center p-4 rounded-2xl glass-panel hover:border-primary/50 hover:shadow-glow-primary transition-all gap-2 text-slate-500 hover:text-primary">
                            <span className="material-symbols-outlined text-[28px] block group-hover:scale-110 transition-transform">layers</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Profiles</span>
                        </Link>
                        <Link to="/pipe-pile-plugging" className="group flex flex-col items-center justify-center p-4 rounded-2xl glass-panel hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(96,165,250,0.3)] transition-all gap-2 text-slate-500 hover:text-blue-400">
                            <span className="material-symbols-outlined text-[28px] block group-hover:scale-110 transition-transform">water_drop</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Pipe Piles</span>
                        </Link>
                    </div>
                </div>

                {/* Center Column: Results */}
                <div className="lg:col-span-5 flex flex-col gap-6 lg:gap-8 animate-fade-in [animation-delay:100ms]">
                    
                    {/* Main Result Card */}
                    <div className="glass-panel rounded-3xl p-8 lg:p-10 relative overflow-hidden group shadow-glow-primary border-primary/20 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800/80 dark:to-slate-900/80">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/20 transition-colors duration-500"></div>
                        <div className="relative z-10 flex flex-col gap-2 items-center justify-center text-center">
                            <h4 className="text-primary text-sm font-bold tracking-widest uppercase">Allowable Capacity</h4>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm font-mono">
                                    {results.Qall.toLocaleString()}
                                </span>
                                <span className="text-2xl font-bold text-slate-400">kN</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${results.FS >= 2.5 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    }`}>
                                    <span className="material-symbols-outlined text-[16px] block">{results.FS >= 2.5 ? 'check_circle' : 'warning'}</span>
                                    FS = {results.FS.toFixed(1)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20 shadow-sm">
                                    Qs = {results.Qs.toLocaleString()}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider border border-teal-500/20 shadow-sm">
                                    Qb = {results.Qb.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Layer Contribution Table */}
                    <div className="glass-panel rounded-2xl flex-1 flex flex-col shadow-sm overflow-hidden min-h-[300px]">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/60 flex justify-between items-center bg-white/50 dark:bg-slate-800/20">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary block">calendar_view_day</span>
                                Layer Contribution
                            </h3>
                            <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700/50">
                                Skin: {results.skinPercent}% | Base: {100 - results.skinPercent}%
                            </span>
                        </div>
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700/50">
                                    <tr className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <th className="px-6 py-4">Depth (m)</th>
                                        <th className="px-6 py-4">Soil Type</th>
                                        <th className="px-6 py-4 text-right">Friction</th>
                                        <th className="px-6 py-4 text-right w-1/3">Contribution</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                                    {results.layerResults.map((lr, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                                            <td className="px-6 py-3.5 text-slate-900 dark:text-white font-mono font-bold text-xs">{lr.depthFrom.toFixed(1)} - {lr.depthTo.toFixed(1)}</td>
                                            <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300 flex items-center gap-3">
                                                <div className="w-3.5 h-3.5 rounded-sm shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ backgroundColor: lr.color }}></div>
                                                <span className="font-medium">{lr.name}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-slate-900 dark:text-white font-mono font-bold text-xs">{Math.round(lr.skinFriction).toLocaleString()} <span className="text-slate-400">kN</span></td>
                                            <td className="px-6 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className="text-xs font-bold text-slate-500">{Math.round(lr.percentage)}%</span>
                                                    <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner flex-shrink-0">
                                                        <div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${lr.percentage}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {results.layerResults.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">No soil layers defined. Go to Soil Profiles to add layers.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Engineering Insight */}
                    <div className="glass-panel p-5 rounded-2xl flex items-start gap-4 border-primary/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300"></div>
                        <div className="bg-primary/20 p-2.5 rounded-xl text-primary shrink-0 relative z-10 shadow-sm border border-primary/20">
                            <span className="material-symbols-outlined block">lightbulb</span>
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-primary font-bold text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                Engineering Insight
                                <span className="w-8 h-[1px] bg-primary/30 inline-block"></span>
                            </h4>
                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                <strong className="text-slate-900 dark:text-white mr-1 font-bold">Governing Mechanism:</strong>
                                {results.skinPercent > 60
                                    ? `Skin Friction dominant (${results.skinPercent}%). Capacity primarily derived from shaft resistance along embedded layers.`
                                    : `End Bearing dominant (${100 - results.skinPercent}%). Pile terminates in a competent stratum providing significant base resistance.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Visualization */}
                <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8 animate-fade-in [animation-delay:200ms]">
                    <div className="glass-panel rounded-3xl shadow-sm flex flex-col h-full overflow-hidden">
                        
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800/60 bg-white/30 dark:bg-slate-800/10">
                            <button
                                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'stress' ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                onClick={() => setActiveTab('stress')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">water</span>
                                    Stress Dist
                                </div>
                                {activeTab === 'stress' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_-2px_8px_rgba(13,127,242,0.8)]"></div>}
                            </button>
                            <button
                                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all relative border-l border-slate-200 dark:border-slate-800/60 ${activeTab === 'breakdown' ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                onClick={() => setActiveTab('breakdown')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">stacked_bar_chart</span>
                                    Breakdown
                                </div>
                                {activeTab === 'breakdown' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_-2px_8px_rgba(13,127,242,0.8)]"></div>}
                            </button>
                        </div>

                        {/* Visualization Content */}
                        <div className="p-6 lg:p-8 flex-1 flex flex-col">
                            {activeTab === 'stress' ? (
                                <>
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Effective Stress Profile</h3>
                                    </div>
                                    <div className="relative flex-1 w-full min-h-[360px] bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex gap-4 shadow-inner">
                                        {/* Y-Axis Labels (Depth) */}
                                        <div className="flex flex-col justify-between text-[10px] font-mono font-bold text-slate-400 py-0 h-full text-right w-8 -mt-2.5 -mb-2.5">
                                            {Array.from({ length: 6 }, (_, i) => (
                                                <span key={i} className="leading-none">{Math.round((maxDepth / 5) * i)}m</span>
                                            ))}
                                        </div>
                                        {/* Chart Area */}
                                        <div className="relative flex-1 h-full border-l-2 border-b-2 border-slate-300 dark:border-slate-600 rounded-bl-sm">
                                            {/* Soil Layer Backgrounds */}
                                            <div className="absolute inset-0 flex flex-col opacity-10 dark:opacity-20 pointer-events-none rounded-tr-md overflow-hidden">
                                                {layers.filter(l => {
                                                    let d = 0; for (const ll of layers) { if (ll === l) break; d += ll.thickness; } return d < length;
                                                }).map((l, i) => {
                                                    const pct = Math.min(l.thickness / maxDepth, 1) * 100;
                                                    return <div key={i} className="w-full border-b border-white/50 dark:border-black/20" style={{ height: `${pct}%`, backgroundColor: l.color }} title={l.name}></div>;
                                                })}
                                            </div>
                                            {/* SVG Chart */}
                                            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                                                {/* Y-axis grid lines (horizontal) */}
                                                {Array.from({ length: 5 }, (_, i) => (
                                                    <line key={`yh-${i}`} x1="0" y1={`${(i+1)*20}%`} x2="100%" y2={`${(i+1)*20}%`} className="stroke-slate-200 dark:stroke-slate-700/50" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                                ))}
                                                {/* Effective Stress Line */}
                                                <polyline
                                                    points={results.stressPoints.map(p => `${(p.sigma / maxStress) * 100}%,${(p.depth / maxDepth) * 100}%`).join(' ')}
                                                    fill="none" className="stroke-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke"
                                                />
                                                {/* Pore Pressure Line */}
                                                <polyline
                                                    points={results.stressPoints.map(p => `${(p.pore / maxStress) * 100}%,${(p.depth / maxDepth) * 100}%`).join(' ')}
                                                    fill="none" className="stroke-teal-400" strokeWidth="2.5" strokeDasharray="6,4" vectorEffect="non-scaling-stroke"
                                                />
                                                {/* Data points */}
                                                {results.stressPoints.slice(1).map((p, i) => (
                                                    <circle key={i} cx={`${(p.sigma / maxStress) * 100}%`} cy={`${(p.depth / maxDepth) * 100}%`} r="4" className="fill-primary stroke-white dark:stroke-slate-900 stroke-2" />
                                                ))}
                                            </svg>
                                            {/* Legend */}
                                            <div className="absolute top-4 right-4 glass-panel p-3 rounded-xl shadow-sm text-[10px] font-bold">
                                                <div className="flex items-center gap-2.5 mb-2">
                                                    <div className="w-4 h-1 bg-primary rounded-full"></div>
                                                    <span className="text-slate-700 dark:text-slate-300 tracking-wider">σ'v <span className="text-slate-400 font-mono font-normal">(kPa)</span></span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-4 h-[2px] border-t-2 border-dashed border-teal-400"></div>
                                                    <span className="text-slate-700 dark:text-slate-300 tracking-wider">u <span className="text-slate-400 font-mono font-normal">(kPa)</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-4">Stress (kPa)</div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-10">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Capacity Breakdown</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-8 justify-center">
                                        {/* Bar chart */}
                                        <div className="flex items-end gap-6 md:gap-10 justify-center h-56 px-4">
                                            {/* Shaft Bar */}
                                            <div className="flex flex-col items-center gap-3 flex-1 group">
                                                <div className="w-full bg-blue-500/10 dark:bg-blue-500/20 rounded-t-xl relative overflow-hidden ring-1 ring-inset ring-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300" style={{ height: `${Math.max(5, Math.min((results.Qs / Math.max(results.Qult, 1)) * 100, 100))}%` }}>
                                                    <div className="absolute inset-0 bg-blue-500/30 dark:bg-blue-500/40 animate-pulse [animation-duration:3s]"></div>
                                                    <div className="absolute top-0 inset-x-0 h-1 bg-blue-500"></div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Shaft</span>
                                                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">{results.Qs.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            {/* Base Bar */}
                                            <div className="flex flex-col items-center gap-3 flex-1 group">
                                                <div className="w-full bg-teal-500/10 dark:bg-teal-500/20 rounded-t-xl relative overflow-hidden ring-1 ring-inset ring-teal-500/30 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300" style={{ height: `${Math.max(5, Math.min((results.Qb / Math.max(results.Qult, 1)) * 100, 100))}%` }}>
                                                    <div className="absolute inset-0 bg-teal-500/30 dark:bg-teal-500/40 animate-pulse [animation-duration:3s] [animation-delay:1s]"></div>
                                                    <div className="absolute top-0 inset-x-0 h-1 bg-teal-500"></div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Base</span>
                                                    <span className="text-sm font-black text-teal-600 dark:text-teal-400">{results.Qb.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            {/* Ultimate Bar */}
                                            <div className="flex flex-col items-center gap-3 flex-1 group">
                                                <div className="w-full bg-primary/10 dark:bg-primary/20 rounded-t-xl relative overflow-hidden ring-1 ring-inset ring-primary/30 group-hover:shadow-glow-primary transition-all duration-300" style={{ height: '100%' }}>
                                                    <div className="absolute inset-0 bg-gradient-to-b from-primary/50 to-primary/10 dark:to-primary/20"></div>
                                                    <div className="absolute top-0 inset-x-0 h-1.5 bg-primary shadow-[0_2px_10px_rgba(13,127,242,0.8)]"></div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Ultimate</span>
                                                    <span className="text-sm font-black text-primary">{results.Qult.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Summary stats pills */}
                                        <div className="grid grid-cols-2 gap-4 mt-auto">
                                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 text-center shadow-inner">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Shaft %</span>
                                                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{results.skinPercent}%</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 text-center shadow-inner">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Base %</span>
                                                <span className="text-2xl font-black text-teal-600 dark:text-teal-400">{100 - results.skinPercent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Bottom Info Panel */}
                        <div className="bg-white dark:bg-slate-800/30 p-5 mt-auto border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 mb-0.5">Pile Toe Level</span>
                                <span className="text-base font-black text-slate-900 dark:text-white font-mono">-{length.toFixed(2)}m</span>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 mb-0.5">Toe Bearing Stress</span>
                                <span className="text-base font-black text-teal-600 dark:text-teal-400 font-mono">{results.toeBearing.toLocaleString()} <span className="text-xs font-bold text-slate-400">kPa</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
