import { useState, useMemo, useCallback } from 'react';
import { useProject } from '../store/ProjectContext';
import type { LoadTestStep } from '../lib/storage';
import { analyzeLoadTest, InterpretationMethod } from '../lib/calc/loadTestMethods';

function niceNum(range: number, round: boolean): number {
    const e = Math.floor(Math.log10(range));
    const f = range / Math.pow(10, e);
    let nf: number;
    if (round) {
        if (f < 1.5) nf = 1; else if (f < 3) nf = 2; else if (f < 7) nf = 5; else nf = 10;
    } else {
        if (f <= 1) nf = 1; else if (f <= 2) nf = 2; else if (f <= 5) nf = 5; else nf = 10;
    }
    return nf * Math.pow(10, e);
}
function niceTicks(min: number, max: number, maxTicks: number = 5): number[] {
    if (max === min) return [min];
    const range = niceNum(max - min, false);
    const d = niceNum(range / (maxTicks - 1), true);
    const lo = Math.floor(min / d) * d;
    const hi = Math.ceil(max / d) * d;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + d * 0.5; v += d) ticks.push(parseFloat(v.toPrecision(8)));
    return ticks;
}
function fmtNum(v: number): string {
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 1) return v.toFixed(1);
    if (Math.abs(v) >= 0.01) return v.toFixed(3);
    return v.toPrecision(3);
}

export default function LoadTestLab() {
    const { activeProject, updateActiveProject } = useProject();
    const lt = activeProject?.loadTest;

    const [method, setMethod] = useState(lt?.method || 'Static Axial (ASTM D1143)');
    const [failureCriteria, setFailureCriteria] = useState<InterpretationMethod>((lt?.failureCriteria as InterpretationMethod) || 'Davisson Offset Limit');
    const [pileDiameter, setPileDiameter] = useState(lt?.pileDiameter || 600);
    const [pileLength, setPileLength] = useState(lt?.pileLength || 24.5);
    const [pileArea, setPileArea] = useState<number | undefined>(lt?.pileArea);
    const [elasticModulus, setElasticModulus] = useState<number | undefined>(lt?.elasticModulus);
    const [material] = useState(lt?.material || 'Concrete (C40)');
    const [steps, setSteps] = useState<LoadTestStep[]>(lt?.steps || [
        { step: 1, load: 0, settlement: 0, holdTime: 10, status: 'completed' },
        { step: 2, load: 625, settlement: 1.24, holdTime: 15, status: 'scheduled' },
        { step: 3, load: 1250, settlement: 3.15, holdTime: 20, status: 'scheduled' },
        { step: 4, load: 1875, settlement: 5.80, holdTime: 20, status: 'scheduled' },
        { step: 5, load: 2500, settlement: 8.45, holdTime: 30, status: 'scheduled' },
        { step: 6, load: 3125, settlement: 12.30, holdTime: 30, status: 'scheduled' },
        { step: 7, load: 3750, settlement: 18.50, holdTime: 30, status: 'scheduled' },
        { step: 8, load: 4375, settlement: 28.40, holdTime: 30, status: 'scheduled' },
    ]);
    const [simRunning, setSimRunning] = useState(false);
    const [simStep, setSimStep] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [factorOfSafety, setFactorOfSafety] = useState(2.5);

    const analysis = useMemo(() => {
        return analyzeLoadTest(failureCriteria, steps, pileDiameter, pileLength, pileArea, elasticModulus, factorOfSafety);
    }, [steps, failureCriteria, pileDiameter, pileLength, pileArea, elasticModulus, factorOfSafety]);

    const runSimulation = useCallback(() => {
        setSimRunning(true);
        setSimStep(0);
        const totalSteps = steps.length;
        let current = 0;
        const interval = setInterval(() => {
            current++;
            setSimStep(current);
            setSteps(prev => prev.map((s, i) => ({
                ...s,
                status: i < current ? 'completed' as const : i === current ? 'active' as const : 'scheduled' as const
            })));
            if (current >= totalSteps) {
                clearInterval(interval);
                setSimRunning(false);
                const allCompleted = steps.map(s => ({ ...s, status: 'completed' as const }));
                setSteps(allCompleted);
                updateActiveProject({
                    loadTest: { method, failureCriteria, pileDiameter, pileLength, material, steps: allCompleted, ultimateCapacity: analysis.ultimateCapacity, maxSettlement: analysis.maxSettlement, safeWorkLoad: analysis.safeWorkLoad }
                });
            }
        }, 600);
    }, [steps, method, failureCriteria, pileDiameter, pileLength, material, analysis, updateActiveProject]);

    function addStep() {
        const lastStep = steps[steps.length - 1];
        const newStep: LoadTestStep = {
            step: steps.length + 1,
            load: (lastStep?.load || 0) + 625,
            settlement: (lastStep?.settlement || 0) + 5,
            holdTime: 30,
            status: 'scheduled',
        };
        setSteps([...steps, newStep]);
    }
    function updateStep(idx: number, field: keyof LoadTestStep, value: number) {
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    }
    function deleteStep(idx: number) {
        setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })));
    }

    // Chart computations
    const chartInfo = useMemo(() => {
        const chart = analysis.chart;
        const dp = chart.dataPoints;
        const allXs = [...dp.map(p => p.x), ...chart.lines.flatMap(l => l.points.map(p => p.x)), ...chart.markers.map(m => m.x)].filter(v => isFinite(v));
        const allYs = [...dp.map(p => p.y), ...chart.lines.flatMap(l => l.points.map(p => p.y)), ...chart.markers.map(m => m.y)].filter(v => isFinite(v));
        const rawXMin = allXs.length ? Math.min(...allXs, 0) : 0;
        const rawXMax = allXs.length ? Math.max(...allXs) * 1.05 : 1;
        const rawYMin = allYs.length ? Math.min(...allYs, 0) : 0;
        const rawYMax = allYs.length ? Math.max(...allYs) * 1.05 : 1;
        const xTicks = niceTicks(rawXMin, rawXMax, 5);
        const yTicks = niceTicks(rawYMin, rawYMax, 5);
        const xMin = xTicks[0];
        const xMax = xTicks[xTicks.length - 1];
        const yMin = yTicks[0];
        const yMax = yTicks[yTicks.length - 1];
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;
        const toSvgX = (x: number) => ((x - xMin) / xRange) * 100;
        const toSvgY = (y: number) => 100 - ((y - yMin) / yRange) * 100;
        return { chart, dp, xTicks, yTicks, xMin, xMax, yMin, yMax, toSvgX, toSvgY };
    }, [analysis.chart]);

    return (
        <div className="flex flex-1 w-full h-full flex-col lg:flex-row relative">
            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile toggle button */}
            <button
                onClick={() => setSidebarOpen(v => !v)}
                className="fixed bottom-5 right-5 z-50 lg:hidden flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-2xl shadow-xl font-bold text-sm shadow-primary/30 active:scale-95 transition-transform"
            >
                <span className="material-symbols-outlined text-[20px]">{sidebarOpen ? 'close' : 'tune'}</span>
                {sidebarOpen ? 'Close' : 'Settings'}
            </button>
            {/* Left Sidebar: Configuration */}
            <aside className={`
                fixed lg:relative inset-y-0 left-0 z-40
                w-[300px] lg:w-[340px]
                flex flex-col glass-panel flex-shrink-0
                shadow-[4px_0_24px_rgba(0,0,0,0.12)] lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)]
                lg:h-full lg:overflow-y-auto custom-scrollbar
                transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined block text-[24px]">science</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Simulation Lab</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">{activeProject?.name || 'Unsaved Project'}</p>
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Status Pill */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-colors shadow-sm ${simRunning ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20'}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${simRunning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_8px_currentColor]`}></span>
                        {simRunning ? `Running Step ${simStep}/${steps.length}` : 'Simulation Ready'}
                    </div>

                    <div className="space-y-5">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Test Method</span>
                            <div className="relative">
                                <select className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-sm shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                                    value={method} onChange={(e) => setMethod(e.target.value)}>
                                    <option>Static Axial (ASTM D1143)</option>
                                    <option>Rapid Load Test (ASTM D7383)</option>
                                    <option>Dynamic Load Test (ASTM D4945)</option>
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-outlined">expand_more</span>
                            </div>
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Failure Criteria</span>
                            <div className="relative">
                                <select className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-sm shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                                    value={failureCriteria} onChange={(e) => setFailureCriteria(e.target.value as InterpretationMethod)}>
                                    <option>Davisson Offset Limit</option>
                                    <option>Chin-Kondner Extrapolation</option>
                                    <option>De Beer Log-Log</option>
                                    <option>Brinch-Hansen 90%</option>
                                    <option>Brinch-Hansen 80%</option>
                                    <option>Mazurkiewicz</option>
                                    <option>Fuller &amp; Hoy (0.05 in/ton)</option>
                                    <option>Butler &amp; Hoy</option>
                                    <option>Van der Veen</option>
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-outlined">expand_more</span>
                            </div>
                        </label>

                        {/* Config Properties */}
                        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Diameter</span>
                                <div className="flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary/30 rounded px-1 transition-all">
                                    <input className="font-bold text-slate-900 dark:text-white bg-transparent text-right w-16 outline-none font-mono" type="number" value={pileDiameter} onChange={(e) => setPileDiameter(Number(e.target.value))} />
                                    <span className="text-slate-400 text-xs font-bold">mm</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Length</span>
                                <div className="flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary/30 rounded px-1 transition-all">
                                    <input className="font-bold text-slate-900 dark:text-white bg-transparent text-right w-16 outline-none font-mono" type="number" step="0.5" value={pileLength} onChange={(e) => setPileLength(Number(e.target.value))} />
                                    <span className="text-slate-400 text-xs font-bold">m</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Pile Area</span>
                                <div className="flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary/30 rounded px-1 transition-all">
                                    <input className="font-bold text-slate-900 dark:text-white bg-transparent text-right w-20 outline-none font-mono placeholder-slate-400 dark:placeholder-slate-600" type="number" placeholder="auto" value={pileArea ?? ''} onChange={(e) => setPileArea(e.target.value ? Number(e.target.value) : undefined)} />
                                    <span className="text-slate-400 text-xs font-bold">mm²</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 text-sm">E (Modulus)</span>
                                <div className="flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary/30 rounded px-1 transition-all">
                                    <input className="font-bold text-slate-900 dark:text-white bg-transparent text-right w-20 outline-none font-mono placeholder-slate-400 dark:placeholder-slate-600" type="number" placeholder="30000" value={elasticModulus ?? ''} onChange={(e) => setElasticModulus(e.target.value ? Number(e.target.value) : undefined)} />
                                    <span className="text-slate-400 text-xs font-bold">MPa</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Material</span>
                                <span className="font-bold text-slate-900 dark:text-white text-sm">{material}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Factor of Safety</span>
                                <div className="flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary/30 rounded px-1 transition-all">
                                    <input className="font-bold text-slate-900 dark:text-white bg-transparent text-right w-12 outline-none font-mono" type="number" step="0.1" min="1" max="5"
                                        value={factorOfSafety} onChange={(e) => setFactorOfSafety(Number(e.target.value))} />
                                    <span className="text-slate-400 text-xs font-bold">FS</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={runSimulation} disabled={simRunning}
                            className={`w-full py-3.5 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${simRunning ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none' : 'bg-primary hover:bg-primary-dark text-white hover:shadow-glow-primary hover:-translate-y-0.5'}`}>
                            <span className={`material-symbols-outlined block flex-shrink-0 ${simRunning ? 'animate-spin' : ''}`}>{simRunning ? 'autorenew' : 'play_arrow'}</span>
                            {simRunning ? 'Running Simulation...' : 'Run Simulation'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Right Side: Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto print:overflow-visible custom-scrollbar z-10 relative">
                <div className="max-w-7xl print:max-w-none mx-auto w-full p-4 lg:p-8 flex flex-col gap-6 lg:gap-8">
                    
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 animate-fade-in">
                        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-glow-primary transition-all duration-300 print:break-inside-avoid">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-symbols-outlined text-[64px] text-primary">arrow_downward</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Ultimate Capacity (Qult)</p>
                            <p className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {analysis.ultimateCapacity ? analysis.ultimateCapacity.toLocaleString() : '—'} <span className="text-lg font-bold text-slate-400 ml-0.5">kN</span>
                            </p>
                        </div>
                        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 print:break-inside-avoid">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-symbols-outlined text-[64px] text-amber-500">vertical_align_bottom</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Max Settlement</p>
                            <p className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {analysis.maxSettlement !== null ? analysis.maxSettlement.toFixed(1) : '—'} <span className="text-lg font-bold text-slate-400 ml-0.5">mm</span>
                            </p>
                        </div>
                        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 print:break-inside-avoid">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-symbols-outlined text-[64px] text-emerald-500">verified</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Safe Working Load (FS={factorOfSafety})</p>
                            <p className="text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {analysis.safeWorkLoad ? analysis.safeWorkLoad.toLocaleString() : '—'} <span className="text-lg font-bold text-emerald-600/50 dark:text-emerald-400/50 ml-0.5">kN</span>
                            </p>
                        </div>
                    </div>

                    {/* Chart & Table Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                        
                        {/* Interactive Chart */}
                        <div className="glass-panel rounded-2xl flex flex-col min-h-[400px] overflow-visible shadow-sm animate-fade-in [animation-delay:100ms] print:break-inside-avoid">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-white/50 dark:bg-slate-800/20">
                                <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">show_chart</span>
                                    {analysis.chart.title}
                                </h3>
                                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-bold border border-slate-200 dark:border-slate-700/50">
                                    {chartInfo.chart.type}
                                </span>
                            </div>
                            <div className="flex-1 pt-8 pr-4 pb-12 pl-12 sm:pt-12 sm:pr-8 sm:pb-16 sm:pl-20 md:pl-32 flex flex-col relative w-full h-[400px]">
                                {/* SVG Content adapted for light/dark */}
                                <div className="flex-1 relative border-l-2 border-b-2 border-slate-300 dark:border-slate-700/60" style={{ height: '100%', width: '100%' }}>
                                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                                        <defs>
                                            <marker id="arrow-cbd5e1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                <polygon points="0 0, 6 3, 0 6" fill="#cbd5e1" />
                                            </marker>
                                            <marker id="arrow-8b5cf6" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                <polygon points="0 0, 6 3, 0 6" fill="#8b5cf6" />
                                            </marker>
                                            <marker id="arrow-94a3b8" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
                                            </marker>
                                            <marker id="arrow-3b82f6" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" />
                                            </marker>
                                        </defs>

                                        {/* Grid lines */}
                                        {chartInfo.yTicks.map((v, i) => {
                                            const y = `${chartInfo.toSvgY(v)}%`;
                                            return <line key={`hg-${i}`} x1="0" y1={y} x2="100%" y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                                        })}
                                        {chartInfo.xTicks.map((v, i) => {
                                            const x = `${chartInfo.toSvgX(v)}%`;
                                            return <line key={`vg-${i}`} x1={x} y1="0" x2={x} y2="100%" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                                        })}
                                        {/* Reference Lines */}
                                        {chartInfo.xMin < 0 && (
                                            <line x1={`${chartInfo.toSvgX(0)}%`} y1="0" x2={`${chartInfo.toSvgX(0)}%`} y2="100%" className="stroke-slate-900 dark:stroke-slate-100" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                                        )}
                                        {chartInfo.chart.lines.map((line, idx) => (
                                            <polyline
                                                key={`cl-${idx}`}
                                                points={line.points.map(p => `${chartInfo.toSvgX(p.x)}%,${chartInfo.toSvgY(p.y)}%`).join(' ')}
                                                fill="none" stroke={line.color} strokeWidth="2"
                                                strokeDasharray={line.style === 'dashed' ? '5,5' : line.style === 'dotted' ? '2,2' : 'none'}
                                                vectorEffect="non-scaling-stroke"
                                                opacity="0.8"
                                                markerEnd={line.showArrow ? `url(#arrow-${line.color.replace('#', '')})` : undefined}
                                            />
                                        ))}
                                        {/* Main Data Curve */}
                                        {chartInfo.dp.length > 1 && (
                                            <polyline
                                                points={chartInfo.dp.map(p => `${chartInfo.toSvgX(p.x)}%,${chartInfo.toSvgY(p.y)}%`).join(' ')}
                                                fill="none" className="stroke-primary" strokeWidth="3" vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                        {/* Data Points */}
                                        {chartInfo.dp.map((p, i) => (
                                            <circle key={`dp-${i}`} cx={`${chartInfo.toSvgX(p.x)}%`} cy={`${chartInfo.toSvgY(p.y)}%`} r="4" className="fill-primary stroke-white dark:stroke-slate-900 stroke-2" />
                                        ))}
                                        {/* Failure Markers */}
                                        {chartInfo.chart.markers.map((m, idx) => {
                                            const svgX = chartInfo.toSvgX(m.x);
                                            const svgY = chartInfo.toSvgY(m.y);
                                            const axisY = chartInfo.yMin < 0 ? chartInfo.toSvgY(0) : 100;
                                            const axisX = chartInfo.xMin < 0 ? chartInfo.toSvgX(0) : 0;
                                            
                                            const isNotOnYAxis = Math.abs(svgX - axisX) > 1;
                                            const isNotOnXAxis = Math.abs(svgY - axisY) > 1;

                                            return (
                                                <g key={`mk-${idx}`}>
                                                    {/* Central marker circle */}
                                                    <circle cx={`${svgX}%`} cy={`${svgY}%`} r="6" fill="transparent" stroke={m.color} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                                                    <circle cx={`${svgX}%`} cy={`${svgY}%`} r="2" fill={m.color} />
                                                    
                                                    {/* Vertical dropping line and axis point */}
                                                    {isNotOnYAxis && isNotOnXAxis && svgY < 99 && (
                                                        <>
                                                            <line x1={`${svgX}%`} y1={`${svgY}%`} x2={`${svgX}%`} y2={`${axisY}%`} stroke={m.color} strokeWidth="1.5" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" opacity="0.6" className="animate-dash-move" />
                                                            <circle cx={`${svgX}%`} cy={`${axisY}%`} r="3" fill={m.color} opacity="0.8" />
                                                        </>
                                                    )}
                                                    
                                                    {/* Horizontal dropping line and axis point */}
                                                    {isNotOnXAxis && isNotOnYAxis && svgX > 1 && (
                                                        <>
                                                            <line x1={`${svgX}%`} y1={`${svgY}%`} x2={`${axisX}%`} y2={`${svgY}%`} stroke={m.color} strokeWidth="1.5" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" opacity="0.6" className="animate-dash-move" />
                                                            <circle cx={`${axisX}%`} cy={`${svgY}%`} r="3" fill={m.color} opacity="0.8" />
                                                        </>
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                    
                                    {/* Labels overlaid on SVG bounds */}
                                    <div className="absolute top-0 bottom-0 -left-10 sm:-left-12 w-8 sm:w-10 flex flex-col justify-between pointer-events-none">
                                        {[...chartInfo.yTicks].reverse().map((v, i) => (
                                            <span key={`yt-${i}`} className="text-[10px] sm:text-xs text-slate-500 text-right pr-1 font-mono leading-none">{fmtNum(v)}</span>
                                        ))}
                                    </div>
                                    <div className="absolute top-1/2 -left-14 sm:-left-16 -translate-y-1/2 -rotate-90 text-[9px] sm:text-xs tracking-widest uppercase text-slate-400 font-bold whitespace-nowrap origin-center" style={{ width: 0 }}>
                                        {chartInfo.chart.yLabel}
                                    </div>
                                    <div className="absolute -bottom-6 left-0 right-0 flex justify-between pointer-events-none">
                                        {chartInfo.xTicks.map((v, i) => (
                                            <span key={`xt-${i}`} className="text-[10px] sm:text-xs text-slate-500 font-mono leading-none pt-1" style={{ transform: 'translateX(-50%)' }}>{fmtNum(v)}</span>
                                        ))}
                                    </div>
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs tracking-widest uppercase text-slate-400 font-bold">
                                        {chartInfo.chart.xLabel}
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/30 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-2"><div className="w-4 h-1 bg-primary rounded-full"></div>Load Data</div>
                                {chartInfo.chart.lines.filter(l => l.label).map((line, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-4 h-[2px]" style={{ borderTop: `2px ${line.style === 'dashed' ? 'dashed' : line.style === 'dotted' ? 'dotted' : 'solid'} ${line.color}` }}></div>
                                        <span>{line.label}</span>
                                    </div>
                                ))}
                                {chartInfo.chart.markers.map((m, i) => (
                                    <div key={`ml-${i}`} className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[currentColor] flex-shrink-0"></div>
                                        {m.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Load Schedule Table */}
                        <div className="glass-panel rounded-2xl flex flex-col shadow-sm max-h-[600px] overflow-hidden animate-fade-in [animation-delay:200ms] print:break-inside-avoid">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-white/50 dark:bg-slate-800/20">
                                <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">table_chart</span>
                                    Load Schedule
                                </h3>
                                <button onClick={addStep} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-sm text-xs font-bold transition-all flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Add Step
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-xs sm:text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700/50">
                                    <tr className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                            <th className="px-3 sm:px-5 py-3 sm:py-4 w-10 text-center">Step</th>
                                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-right">Load</th>
                                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-right">Settle</th>
                                            <th className="hidden sm:table-cell px-5 py-4 text-right w-24">Hold (min)</th>
                                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-center">Status</th>
                                            <th className="px-3 sm:px-5 py-3 sm:py-4 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {steps.map((s, i) => (
                                            <tr key={i} className={`transition-colors group ${s.status === 'active' ? 'bg-amber-500/5 dark:bg-amber-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                                                <td className="px-3 sm:px-5 py-2 sm:py-3 text-center text-slate-400 font-mono font-bold">{s.step}</td>
                                                <td className="px-3 sm:px-5 py-2 sm:py-3 text-right">
                                                    <input className="bg-transparent text-slate-900 dark:text-white text-right w-14 sm:w-20 outline-none focus:ring-2 ring-primary/30 rounded px-1 sm:px-2 py-1 font-mono text-xs sm:text-sm transition-shadow border border-slate-200 dark:border-transparent hover:border-slate-300 dark:hover:border-slate-700" type="number"
                                                        value={s.load} onChange={(e) => updateStep(i, 'load', Number(e.target.value))} />
                                                </td>
                                                <td className="px-3 sm:px-5 py-2 sm:py-3 text-right">
                                                    <input className="bg-transparent text-slate-900 dark:text-white text-right w-14 sm:w-24 outline-none focus:ring-2 ring-primary/30 rounded px-1 sm:px-2 py-1 font-mono text-xs sm:text-sm transition-shadow border border-slate-200 dark:border-transparent hover:border-slate-300 dark:hover:border-slate-700" type="number" step="0.1"
                                                        value={s.settlement} onChange={(e) => updateStep(i, 'settlement', Number(e.target.value))} />
                                                </td>
                                                <td className="hidden sm:table-cell px-5 py-3 text-right">
                                                    <input className="bg-transparent text-slate-900 dark:text-white text-right w-16 outline-none focus:ring-2 ring-primary/30 rounded px-2 py-1 font-mono transition-shadow border border-slate-200 dark:border-transparent hover:border-slate-300 dark:hover:border-slate-700" type="number"
                                                        value={s.holdTime} onChange={(e) => updateStep(i, 'holdTime', Number(e.target.value))} />
                                                </td>
                                                <td className="px-3 sm:px-5 py-2 sm:py-3 text-center">
                                                    <span className={`inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                                                        s.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                                        s.status === 'active' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse' :
                                                        'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                                                    }`}>{s.status}</span>
                                                </td>
                                                <td className="px-3 sm:px-5 py-2 sm:py-3 text-center">
                                                    <button onClick={() => deleteStep(i)} className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                        <span className="material-symbols-outlined block text-[16px] sm:text-[18px]">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
