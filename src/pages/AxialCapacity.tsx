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
    const [hasRun, setHasRun] = useState(false);
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
        setHasRun(true);
        updateActiveProject({
            axial: { pileType, diameter, length, alphaFactor, ksFactor, nqFactor }
        });
    }

    // For stress chart SVG
    const maxDepth = length;
    const maxStress = Math.max(...results.stressPoints.map(p => p.sigma), 1);

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto">
            {/* Breadcrumbs & Header */}
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-[#90adcb]">
                    <Link className="hover:text-primary transition-colors" to="/">{activeProject?.name || 'Project'}</Link>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="text-slate-900 dark:text-white font-medium">Axial Capacity</span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Axial Capacity Analysis</h1>
                    <div className="flex gap-3">
                        <button
                            onClick={runAnalysis}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium text-sm shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                            Run Analysis
                        </button>
                    </div>
                </div>
            </div>
            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                {/* Left Column: Inputs */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="bg-white dark:bg-[#182634] rounded-xl p-6 border border-slate-200 dark:border-[#314d68] shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Parameters</h3>
                        <p className="text-sm text-slate-500 dark:text-[#90adcb] mb-6">Configure pile geometry and soil factors</p>
                        <div className="space-y-5">
                            {/* Pile Type */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pile Type</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-slate-50 dark:bg-[#101a23] border border-slate-300 dark:border-[#314d68] text-slate-900 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        value={pileType}
                                        onChange={(e) => setPileType(e.target.value)}
                                    >
                                        <option>Bored Pile (Drilled Shaft)</option>
                                        <option>Driven Pile (Precast)</option>
                                        <option>CFA Pile</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-[#90adcb]">
                                        <span className="material-symbols-outlined">expand_more</span>
                                    </div>
                                </div>
                            </div>
                            {/* Diameter */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Diameter (mm)</label>
                                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">D = {diameter}</span>
                                </div>
                                <input
                                    className="w-full bg-slate-50 dark:bg-[#101a23] border border-slate-300 dark:border-[#314d68] text-slate-900 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-slate-400 font-mono"
                                    type="number" value={diameter}
                                    onChange={(e) => setDiameter(Number(e.target.value))}
                                />
                            </div>
                            {/* Length */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Effective Length (m)</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-[#101a23] border border-slate-300 dark:border-[#314d68] text-slate-900 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-slate-400 font-mono"
                                    type="number" step="0.5" value={length}
                                    onChange={(e) => setLength(Number(e.target.value))}
                                />
                            </div>
                            {/* Alpha Factor Slider */}
                            <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-[#101a23]/50 rounded-lg border border-slate-200 dark:border-[#314d68]/50">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Alpha Factor (α)</label>
                                    <span className="text-sm font-bold text-primary">{alphaFactor.toFixed(2)}</span>
                                </div>
                                <input
                                    className="w-full h-1 bg-slate-300 dark:bg-[#223649] rounded-lg appearance-none cursor-pointer accent-primary"
                                    max="1" min="0" step="0.05" type="range"
                                    value={alphaFactor}
                                    onChange={(e) => setAlphaFactor(Number(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 dark:text-[#90adcb]">
                                    <span>Smooth</span>
                                    <span>Rough</span>
                                </div>
                            </div>
                            {/* Soil Parameters Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-slate-500 dark:text-[#90adcb] uppercase tracking-wider">Ks Factor</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-[#101a23] border border-slate-300 dark:border-[#314d68] text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono text-center"
                                        type="number" step="0.05"
                                        value={ksFactor}
                                        onChange={(e) => setKsFactor(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-slate-500 dark:text-[#90adcb] uppercase tracking-wider">Nq Factor</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-[#101a23] border border-slate-300 dark:border-[#314d68] text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono text-center"
                                        type="number" step="1"
                                        value={nqFactor}
                                        onChange={(e) => setNqFactor(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link to="/soil-stratigraphy" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-200 dark:bg-[#182634] border border-transparent hover:border-slate-400 dark:hover:border-[#314d68] text-slate-600 dark:text-[#90adcb] hover:text-primary transition-all gap-2">
                            <span className="material-symbols-outlined">layers</span>
                            <span className="text-xs font-medium">Soil Profile</span>
                        </Link>
                        <Link to="/pipe-pile-plugging" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-200 dark:bg-[#182634] border border-transparent hover:border-slate-400 dark:hover:border-[#314d68] text-slate-600 dark:text-[#90adcb] hover:text-primary transition-all gap-2">
                            <span className="material-symbols-outlined">water_drop</span>
                            <span className="text-xs font-medium">Pipe Piles</span>
                        </Link>
                    </div>
                </div>
                {/* Center Column: Results */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Main Result Card */}
                    <div className="bg-gradient-to-br from-[#182634] to-[#101a23] dark:from-[#182634] dark:to-[#0f1720] rounded-xl p-8 border border-slate-200 dark:border-[#314d68] shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col gap-1 items-center justify-center text-center py-6">
                            <h4 className="text-slate-400 dark:text-[#90adcb] text-sm font-medium tracking-widest uppercase">Allowable Capacity</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">
                                    {results.Qall.toLocaleString()}
                                </span>
                                <span className="text-xl md:text-2xl font-medium text-primary">kN</span>
                            </div>
                            <div className="flex gap-4 mt-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${results.FS >= 2.5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    }`}>
                                    <span className="material-symbols-outlined text-[16px]">{results.FS >= 2.5 ? 'check_circle' : 'warning'}</span>
                                    FS = {results.FS.toFixed(1)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                                    Qs = {results.Qs.toLocaleString()} kN
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-medium border border-teal-500/20">
                                    Qb = {results.Qb.toLocaleString()} kN
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Layer Contribution Table */}
                    <div className="bg-white dark:bg-[#182634] rounded-xl border border-slate-200 dark:border-[#314d68] shadow-sm flex-1 flex flex-col">
                        <div className="p-5 border-b border-slate-200 dark:border-[#314d68] flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">Layer Contribution</h3>
                            <span className="text-xs text-slate-500">Skin: {results.skinPercent}% | Base: {100 - results.skinPercent}%</span>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-slate-500 dark:text-[#90adcb] border-b border-slate-200 dark:border-[#314d68]">
                                        <th className="px-5 py-3 font-medium uppercase">Depth (m)</th>
                                        <th className="px-5 py-3 font-medium uppercase">Soil Type</th>
                                        <th className="px-5 py-3 font-medium uppercase text-right">Skin Friction</th>
                                        <th className="px-5 py-3 font-medium uppercase text-right">Contribution</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {results.layerResults.map((lr, i) => (
                                        <tr key={i} className="border-b border-slate-100 dark:border-[#223649] hover:bg-slate-50 dark:hover:bg-[#223649]/50 transition-colors">
                                            <td className="px-5 py-3 text-slate-900 dark:text-white font-mono">{lr.depthFrom.toFixed(1)} - {lr.depthTo.toFixed(1)}</td>
                                            <td className="px-5 py-3 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: lr.color }}></div>
                                                {lr.name}
                                            </td>
                                            <td className="px-5 py-3 text-right text-slate-900 dark:text-white font-mono">{Math.round(lr.skinFriction).toLocaleString()} kN</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-[#90adcb]">{Math.round(lr.percentage)}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-200 dark:bg-[#101a23] rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary rounded-full" style={{ width: `${lr.percentage}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {results.layerResults.length === 0 && (
                                        <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-500">No soil layers defined. Go to Soil Profile to add layers.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Engineering Insight */}
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 flex items-start gap-4">
                        <div className="bg-primary/20 p-2 rounded-lg text-primary shrink-0">
                            <span className="material-symbols-outlined">lightbulb</span>
                        </div>
                        <div>
                            <h4 className="text-primary font-bold text-sm uppercase tracking-wide mb-1">Engineering Insight</h4>
                            <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                                <span className="font-semibold text-slate-900 dark:text-white">Governing Mechanism:</span>{' '}
                                {results.skinPercent > 60
                                    ? `Skin Friction is the dominant resistance factor (${results.skinPercent}%). The pile capacity is primarily derived from shaft resistance along the embedded soil layers.`
                                    : `End Bearing is the dominant resistance factor (${100 - results.skinPercent}%). The pile terminates in a competent bearing stratum providing significant base resistance.`}
                            </p>
                        </div>
                    </div>
                </div>
                {/* Right Column: Visualization */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-white dark:bg-[#182634] rounded-xl border border-slate-200 dark:border-[#314d68] shadow-sm flex flex-col h-full overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-[#314d68]">
                            <button
                                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'stress' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 dark:text-[#90adcb] hover:text-white'}`}
                                onClick={() => setActiveTab('stress')}
                            >
                                Stress Distribution
                            </button>
                            <button
                                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'breakdown' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 dark:text-[#90adcb] hover:text-white'}`}
                                onClick={() => setActiveTab('breakdown')}
                            >
                                Capacity Breakdown
                            </button>
                        </div>
                        {/* Visualization Content */}
                        <div className="p-6 flex-1 flex flex-col">
                            {activeTab === 'stress' ? (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Effective Stress vs Depth</h3>
                                    </div>
                                    <div className="relative flex-1 w-full min-h-[300px] bg-[#101a23] rounded-lg border border-[#223649] p-4 flex gap-4">
                                        {/* Y-Axis Labels (Depth) */}
                                        <div className="flex flex-col justify-between text-[10px] text-[#90adcb] py-2 h-full text-right w-8">
                                            {Array.from({ length: 6 }, (_, i) => (
                                                <span key={i}>{Math.round((maxDepth / 5) * i)}m</span>
                                            ))}
                                        </div>
                                        {/* Chart Area */}
                                        <div className="relative flex-1 h-full border-l border-b border-[#314d68]">
                                            {/* Soil Layer Backgrounds */}
                                            <div className="absolute inset-0 flex flex-col opacity-15">
                                                {layers.filter(l => {
                                                    let d = 0; for (const ll of layers) { if (ll === l) break; d += ll.thickness; } return d < length;
                                                }).map((l, i) => {
                                                    const pct = Math.min(l.thickness / maxDepth, 1) * 100;
                                                    return <div key={i} className="w-full" style={{ height: `${pct}%`, backgroundColor: l.color }} title={l.name}></div>;
                                                })}
                                            </div>
                                            {/* SVG Chart */}
                                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                {/* Effective Stress Line */}
                                                <polyline
                                                    points={results.stressPoints.map(p => `${(p.sigma / maxStress) * 90},${(p.depth / maxDepth) * 95}`).join(' ')}
                                                    fill="none" stroke="#0d7ff2" strokeWidth="1" vectorEffect="non-scaling-stroke"
                                                />
                                                {/* Pore Pressure Line */}
                                                <polyline
                                                    points={results.stressPoints.map(p => `${(p.pore / maxStress) * 90},${(p.depth / maxDepth) * 95}`).join(' ')}
                                                    fill="none" stroke="#14b8a6" strokeWidth="1" strokeDasharray="2,2" vectorEffect="non-scaling-stroke"
                                                />
                                                {/* Data points */}
                                                {results.stressPoints.slice(1).map((p, i) => (
                                                    <circle key={i} cx={(p.sigma / maxStress) * 90} cy={(p.depth / maxDepth) * 95} r="1.5" fill="#0d7ff2" />
                                                ))}
                                            </svg>
                                            {/* Legend */}
                                            <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm p-2 rounded border border-slate-600 text-[10px]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-3 h-0.5 bg-primary"></div>
                                                    <span className="text-white">σ'v (kPa)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-0.5 border-t border-dashed border-[#14b8a6]"></div>
                                                    <span className="text-white">u (kPa)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center text-xs text-[#90adcb] mt-2 font-medium">Stress (kPa)</div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Capacity Breakdown</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-4">
                                        {/* Bar chart */}
                                        <div className="flex items-end gap-8 justify-center h-48 px-8">
                                            <div className="flex flex-col items-center gap-2 flex-1">
                                                <div className="w-full bg-blue-500/20 rounded-t-lg relative overflow-hidden" style={{ height: `${Math.min((results.Qs / Math.max(results.Qult, 1)) * 100, 100)}%` }}>
                                                    <div className="absolute inset-0 bg-blue-500/40 animate-pulse"></div>
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium">Shaft</span>
                                                <span className="text-sm font-bold text-blue-400">{results.Qs.toLocaleString()} kN</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2 flex-1">
                                                <div className="w-full bg-teal-500/20 rounded-t-lg relative overflow-hidden" style={{ height: `${Math.min((results.Qb / Math.max(results.Qult, 1)) * 100, 100)}%` }}>
                                                    <div className="absolute inset-0 bg-teal-500/40 animate-pulse"></div>
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium">Base</span>
                                                <span className="text-sm font-bold text-teal-400">{results.Qb.toLocaleString()} kN</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2 flex-1">
                                                <div className="w-full bg-primary/20 rounded-t-lg relative overflow-hidden" style={{ height: '100%' }}>
                                                    <div className="absolute inset-0 bg-primary/40"></div>
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium">Ultimate</span>
                                                <span className="text-sm font-bold text-primary">{results.Qult.toLocaleString()} kN</span>
                                            </div>
                                        </div>
                                        {/* Summary stats */}
                                        <div className="grid grid-cols-2 gap-3 mt-auto">
                                            <div className="bg-[#101a23] rounded-lg p-3 text-center">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Shaft %</span>
                                                <span className="text-lg font-bold text-blue-400">{results.skinPercent}%</span>
                                            </div>
                                            <div className="bg-[#101a23] rounded-lg p-3 text-center">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Base %</span>
                                                <span className="text-lg font-bold text-teal-400">{100 - results.skinPercent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Bottom Info Panel */}
                        <div className="bg-slate-50 dark:bg-[#101a23]/50 p-4 border-t border-slate-200 dark:border-[#314d68]">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#90adcb]">Pile Toe Level</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">-{length.toFixed(2)} m</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#90adcb]">Toe Bearing</span>
                                    <span className="text-sm font-bold text-teal-500">{results.toeBearing.toLocaleString()} kPa</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
