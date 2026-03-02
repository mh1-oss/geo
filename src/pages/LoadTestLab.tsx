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

    const analysis = useMemo(() => {
        return analyzeLoadTest(failureCriteria, steps, pileDiameter, pileLength);
    }, [steps, failureCriteria, pileDiameter, pileLength]);

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
        <div className="flex flex-1 w-full overflow-hidden h-full flex-col lg:flex-row">
            {/* Left Sidebar — collapsible on mobile */}
            <aside className="w-full lg:w-72 xl:w-80 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#131d27] overflow-y-auto flex-shrink-0">
                <div className="p-4 lg:p-6">
                    <div className="flex flex-col gap-2 mb-4 lg:mb-8">
                        <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">Simulation Lab</h1>
                        <p className="text-slate-400 text-sm">{activeProject?.name || 'Project'}</p>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit border ${simRunning ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            <span className={`size-1.5 rounded-full ${simRunning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            {simRunning ? `Running Step ${simStep}/${steps.length}` : 'Ready'}
                        </div>
                    </div>
                    <div className="space-y-4 lg:space-y-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Test Method</span>
                            <div className="relative">
                                <select className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 lg:py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm"
                                    value={method} onChange={(e) => setMethod(e.target.value)}>
                                    <option>Static Axial (ASTM D1143)</option>
                                    <option>Rapid Load Test (ASTM D7383)</option>
                                    <option>Dynamic Load Test (ASTM D4945)</option>
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none material-symbols-outlined">expand_more</span>
                            </div>
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Failure Criteria</span>
                            <div className="relative">
                                <select className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 lg:py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm"
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
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none material-symbols-outlined">expand_more</span>
                            </div>
                        </label>
                        <div className="p-3 lg:p-4 rounded-lg border border-slate-800 bg-slate-800/50 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-300">Pile Diameter</span>
                                <div className="flex items-center gap-1"><input className="font-bold text-white bg-transparent text-right w-16 outline-none focus:bg-[#0f1720] rounded px-1 font-mono" type="number" value={pileDiameter} onChange={(e) => setPileDiameter(Number(e.target.value))} /><span className="text-slate-500 text-xs">mm</span></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-300">Length</span>
                                <div className="flex items-center gap-1"><input className="font-bold text-white bg-transparent text-right w-16 outline-none focus:bg-[#0f1720] rounded px-1 font-mono" type="number" step="0.5" value={pileLength} onChange={(e) => setPileLength(Number(e.target.value))} /><span className="text-slate-500 text-xs">m</span></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-300">Material</span>
                                <span className="font-bold text-white">{material}</span>
                            </div>
                        </div>
                        <button onClick={runSimulation} disabled={simRunning}
                            className={`w-full py-2.5 lg:py-3 px-4 font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 ${simRunning ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-primary hover:bg-blue-600 text-white shadow-primary/20'}`}>
                            <span className="material-symbols-outlined">{simRunning ? 'hourglass_top' : 'play_arrow'}</span>
                            {simRunning ? 'Running...' : 'Run Simulation'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Center: Data Table & Results */}
            <main className="flex-1 flex flex-col min-w-0 bg-background-dark overflow-hidden">
                <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    {/* Result Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
                        <div className="bg-[#182634] rounded-xl p-4 lg:p-5 border border-[#223649]">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Ultimate Capacity</p>
                            <p className="text-xl lg:text-2xl font-bold text-white font-mono">{analysis.ultimateCapacity ? `${analysis.ultimateCapacity.toLocaleString()} kN` : '—'}</p>
                        </div>
                        <div className="bg-[#182634] rounded-xl p-4 lg:p-5 border border-[#223649]">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Max Settlement</p>
                            <p className="text-xl lg:text-2xl font-bold text-white font-mono">{analysis.maxSettlement !== null ? `${analysis.maxSettlement.toFixed(1)} mm` : '—'}</p>
                        </div>
                        <div className="bg-[#182634] rounded-xl p-4 lg:p-5 border border-[#223649]">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Safe Working Load</p>
                            <p className="text-xl lg:text-2xl font-bold text-emerald-400 font-mono">{analysis.safeWorkLoad ? `${analysis.safeWorkLoad.toLocaleString()} kN` : '—'}</p>
                        </div>
                    </div>

                    {/* Load Schedule Table */}
                    <div className="bg-[#182634] rounded-xl border border-[#223649] mb-4 lg:mb-6 overflow-hidden">
                        <div className="flex items-center justify-between p-3 lg:p-4 border-b border-[#223649]">
                            <h3 className="text-white font-bold flex items-center gap-2 text-sm lg:text-base">
                                <span className="material-symbols-outlined text-primary text-lg">table_chart</span>
                                Load Schedule
                            </h3>
                            <button onClick={addStep} className="text-xs text-primary hover:text-blue-300 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span> Add Step
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#15202b]">
                                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                                        <th className="px-3 lg:px-4 py-3 text-left">Step</th>
                                        <th className="px-3 lg:px-4 py-3 text-right">Load (kN)</th>
                                        <th className="px-3 lg:px-4 py-3 text-right">Settlement (mm)</th>
                                        <th className="px-3 lg:px-4 py-3 text-right">Hold (min)</th>
                                        <th className="px-3 lg:px-4 py-3 text-center">Status</th>
                                        <th className="px-3 lg:px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#223649]">
                                    {steps.map((s, i) => (
                                        <tr key={i} className={`transition-colors ${s.status === 'active' ? 'bg-primary/10' : 'hover:bg-[#1e3045]'}`}>
                                            <td className="px-3 lg:px-4 py-2 text-slate-400 font-mono">{s.step}</td>
                                            <td className="px-3 lg:px-4 py-2 text-right">
                                                <input className="bg-transparent text-white text-right w-20 outline-none focus:bg-[#101a23] rounded px-1 font-mono" type="number"
                                                    value={s.load} onChange={(e) => updateStep(i, 'load', Number(e.target.value))} />
                                            </td>
                                            <td className="px-3 lg:px-4 py-2 text-right">
                                                <input className="bg-transparent text-white text-right w-20 outline-none focus:bg-[#101a23] rounded px-1 font-mono" type="number" step="0.1"
                                                    value={s.settlement} onChange={(e) => updateStep(i, 'settlement', Number(e.target.value))} />
                                            </td>
                                            <td className="px-3 lg:px-4 py-2 text-right">
                                                <input className="bg-transparent text-white text-right w-16 outline-none focus:bg-[#101a23] rounded px-1 font-mono" type="number"
                                                    value={s.holdTime} onChange={(e) => updateStep(i, 'holdTime', Number(e.target.value))} />
                                            </td>
                                            <td className="px-3 lg:px-4 py-2 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    s.status === 'active' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                                                        'bg-slate-700/50 text-slate-400'
                                                    }`}>{s.status}</span>
                                            </td>
                                            <td className="px-3 lg:px-4 py-2">
                                                <button onClick={() => deleteStep(i)} className="text-slate-600 hover:text-red-400">
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Right Side: Chart */}
            <aside className="w-full lg:w-[420px] xl:w-[460px] flex flex-col border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#131d27] overflow-hidden flex-shrink-0">
                <div className="p-3 lg:p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-white text-xs lg:text-sm font-bold uppercase tracking-wider">{analysis.chart.title}</h3>
                    <span className="text-[9px] text-slate-600 font-mono">{chartInfo.chart.type}</span>
                </div>
                <div className="flex-1 p-3 lg:p-4 flex flex-col min-h-[300px]">
                    {/* Chart Area */}
                    <div className="flex-1 relative bg-[#0f161d] rounded-xl border border-[#223649] overflow-hidden" style={{ minHeight: 240 }}>
                        {/* Y-axis tick labels */}
                        <div className="absolute top-2 bottom-6 left-0 w-12 flex flex-col justify-between pointer-events-none">
                            {[...chartInfo.yTicks].reverse().map((v, i) => (
                                <span key={`yt-${i}`} className="text-[8px] text-slate-500 text-right pr-1 font-mono leading-none">{fmtNum(v)}</span>
                            ))}
                        </div>
                        {/* Y-axis label */}
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 -rotate-90 text-[7px] text-slate-600 font-medium whitespace-nowrap origin-center" style={{ width: 0 }}>
                            {chartInfo.chart.yLabel}
                        </div>
                        {/* X-axis tick labels */}
                        <div className="absolute bottom-0 left-12 right-2 flex justify-between pointer-events-none pb-0.5">
                            {chartInfo.xTicks.map((v, i) => (
                                <span key={`xt-${i}`} className="text-[8px] text-slate-500 font-mono leading-none">{fmtNum(v)}</span>
                            ))}
                        </div>
                        {/* X-axis label */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[7px] text-slate-600 font-medium pb-2.5">{chartInfo.chart.xLabel}</div>

                        {/* SVG Chart — inset past the labels */}
                        <svg className="absolute top-2 left-12 right-2 bottom-6" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Grid lines at tick positions */}
                            {chartInfo.yTicks.map((v, i) => {
                                const y = chartInfo.toSvgY(v);
                                return <line key={`hg-${i}`} x1="0" y1={y} x2="100" y2={y} stroke="#1e293b" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />;
                            })}
                            {chartInfo.xTicks.map((v, i) => {
                                const x = chartInfo.toSvgX(v);
                                return <line key={`vg-${i}`} x1={x} y1="0" x2={x} y2="100" stroke="#1e293b" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />;
                            })}
                            {/* Construction lines */}
                            {chartInfo.chart.lines.map((line, idx) => (
                                <polyline
                                    key={`cl-${idx}`}
                                    points={line.points.map(p => `${chartInfo.toSvgX(p.x)},${chartInfo.toSvgY(p.y)}`).join(' ')}
                                    fill="none" stroke={line.color} strokeWidth="1.5"
                                    strokeDasharray={line.style === 'dashed' ? '4,4' : line.style === 'dotted' ? '2,2' : 'none'}
                                    vectorEffect="non-scaling-stroke"
                                />
                            ))}
                            {/* Data curve */}
                            {chartInfo.dp.length > 1 && (
                                <polyline
                                    points={chartInfo.dp.map(p => `${chartInfo.toSvgX(p.x)},${chartInfo.toSvgY(p.y)}`).join(' ')}
                                    fill="none" stroke="#0d7ff2" strokeWidth="2.5" vectorEffect="non-scaling-stroke"
                                />
                            )}
                            {/* Data points */}
                            {chartInfo.dp.map((p, i) => (
                                <circle key={`dp-${i}`} cx={chartInfo.toSvgX(p.x)} cy={chartInfo.toSvgY(p.y)} r="2" fill="#0d7ff2" />
                            ))}
                            {/* Failure markers */}
                            {chartInfo.chart.markers.map((m, idx) => (
                                <g key={`mk-${idx}`}>
                                    <circle cx={chartInfo.toSvgX(m.x)} cy={chartInfo.toSvgY(m.y)} r="5" fill="none" stroke={m.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                    <line x1={chartInfo.toSvgX(m.x)} y1={chartInfo.toSvgY(m.y)} x2={chartInfo.toSvgX(m.x)} y2="100" stroke={m.color} strokeWidth="0.7" strokeDasharray="3,3" vectorEffect="non-scaling-stroke" opacity="0.4" />
                                    <line x1={chartInfo.toSvgX(m.x)} y1={chartInfo.toSvgY(m.y)} x2="0" y2={chartInfo.toSvgY(m.y)} stroke={m.color} strokeWidth="0.7" strokeDasharray="3,3" vectorEffect="non-scaling-stroke" opacity="0.4" />
                                </g>
                            ))}
                        </svg>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[9px] text-slate-400">
                        <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-primary rounded"></div>Data</div>
                        {chartInfo.chart.lines.filter(l => l.label).map((line, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                                <div className="w-3 h-0.5" style={{ borderTop: `1.5px ${line.style === 'dashed' ? 'dashed' : line.style === 'dotted' ? 'dotted' : 'solid'} ${line.color}` }}></div>
                                <span className="truncate max-w-[120px]">{line.label}</span>
                            </div>
                        ))}
                        {chartInfo.chart.markers.length > 0 && (
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border-2 border-red-500"></div>Qult</div>
                        )}
                    </div>
                    {/* Marker result cards */}
                    {chartInfo.chart.markers.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {chartInfo.chart.markers.map((m, i) => (
                                <div key={i} className="text-[10px] text-red-400 font-mono font-bold bg-red-500/10 px-2 py-1.5 rounded border border-red-500/20">{m.label}</div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
