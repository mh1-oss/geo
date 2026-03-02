import { useMemo } from 'react';
import { useProject } from '../store/ProjectContext';
import { analyzeLoadTest, InterpretationMethod } from '../lib/calc/loadTestMethods';

const ALL_METHODS: InterpretationMethod[] = [
    'Davisson Offset Limit', 'Chin-Kondner Extrapolation', 'De Beer Log-Log',
    'Brinch-Hansen 90%', 'Brinch-Hansen 80%', 'Mazurkiewicz',
    'Fuller & Hoy (0.05 in/ton)', 'Butler & Hoy', 'Van der Veen',
];

const METHOD_DESCRIPTIONS: Record<string, { theory: string; procedure: string; notes: string }> = {
    'Davisson Offset Limit': {
        theory: "Davisson's Offset Limit method defines the ultimate pile capacity as the load at which the load-settlement curve intersects a line drawn parallel to the elastic compression line, offset by a value equal to 3.81 mm + D/120, where D is the pile diameter in mm. The elastic compression line represents the theoretical elastic shortening of the pile as a column under axial load.",
        procedure: "The elastic compression line is plotted from the origin with slope AE/L (where A = cross-sectional area, E = Young's modulus, and L = pile length). A parallel offset line is then drawn displaced by the offset value. The intersection of this offset line with the measured load-settlement curve determines the failure load Qult.",
        notes: "This method is widely used in North American practice and is the standard criterion referenced in ASTM D1143. It tends to give conservative estimates for friction piles and is most reliable for piles exhibiting plunging failure."
    },
    'Chin-Kondner Extrapolation': {
        theory: "Chin's method is based on the assumption that the load-settlement relationship follows a hyperbolic function. By plotting the ratio Δ/Q (settlement divided by load) against settlement Δ, the data should form a straight line. The inverse of the slope of this line gives the ultimate pile capacity.",
        procedure: "For each load increment, calculate the ratio Δ/Q. Plot Δ/Q (y-axis) versus Δ (x-axis). Fit a straight line through the data points. The ultimate capacity is Qult = 1/C₁, where C₁ is the slope of the fitted line.",
        notes: "Chin's method typically overestimates the actual failure load by 20-40%. A correction factor of 0.8 is sometimes applied. The method works best when there are sufficient data points in the non-linear range of the load-settlement curve."
    },
    'De Beer Log-Log': {
        theory: "De Beer's method plots the load-settlement data on a double logarithmic scale (log Q vs log Δ). The data typically forms two approximately linear segments. The intersection of these two segments identifies the ultimate pile capacity.",
        procedure: "Plot log₁₀(Load) versus log₁₀(Settlement). Identify two distinct linear trends in the data — one representing the initial elastic response and the other the plastic/failure response. The load corresponding to their intersection point is taken as the ultimate capacity.",
        notes: "This method is particularly useful for identifying the transition point from elastic to plastic behavior. It works best with well-defined load-settlement data that shows clear curvature."
    },
    'Brinch-Hansen 90%': {
        theory: "Brinch Hansen's 90% criterion defines failure as the load Q at which the settlement S exceeds twice the settlement at 90% of Q. This criterion captures the point where the pile response transitions from a hardening to a softening behavior.",
        procedure: "Plot √S (x-axis) versus S/Q (y-axis). Perform a linear regression on the data. Scan through load values to find the load Q where the settlement S(Q) ≥ 2 × S(0.9Q), using interpolation between the measured data points.",
        notes: "The 90% criterion is more conservative than the 80% criterion and is commonly used in European practice. It provides a rational definition of failure based on the rate of settlement increase."
    },
    'Brinch-Hansen 80%': {
        theory: "Brinch Hansen's 80% criterion uses the parabolic model: Q = Qult × 2√(S/Sf) × (1 - S/(2Sf)), where Sf is the settlement at failure. By plotting √S versus S/Q, the data is linearized as S/Q = C₁√S + C₂.",
        procedure: "Plot √S (x-axis) versus S/Q (y-axis). Perform linear regression to obtain slope C₁ and intercept C₂. The ultimate capacity is calculated analytically as Qult = 1/(2√(C₁ × C₂)), and the failure settlement as Sf = (C₂/C₁)².",
        notes: "This method provides an analytical closed-form solution and does not require iterative searching. It is named '80%' because the failure criterion corresponds to the point where the mobilized capacity ratio reaches 80% on the parabolic model."
    },
    'Mazurkiewicz': {
        theory: "Mazurkiewicz's method is a graphical extrapolation technique. Equal increments of settlement are projected vertically to the load-settlement curve, then horizontally to the load axis. The resulting load values, when plotted against the next load value, form a straight line that intersects the 45° (Q = Qnext) line at the ultimate capacity.",
        procedure: "Select equal settlement increments. For each increment, read the corresponding load from the curve. Plot each load Qn against the subsequent load Qn+1. The intersection of this line with the 45° line (Qn = Qn+1) gives Qult. Construction lines are drawn on the load-settlement chart to visualize this process.",
        notes: "This method is robust and works well even when the load-settlement curve does not clearly define failure. It typically gives results close to the Davisson method for friction piles."
    },
    'Fuller & Hoy (0.05 in/ton)': {
        theory: "Fuller and Hoy's method defines the ultimate pile capacity as the load at which the rate of settlement equals 0.05 inches per ton (approximately 0.14 mm/kN). This rate represents the boundary between acceptable and excessive settlement behavior.",
        procedure: "Draw a tangent line with slope 0.05 in/ton (converted to mm/kN) through the steepest portion of the load-settlement curve. The intersection of this tangent with the initial elastic portion of the curve defines the failure load.",
        notes: "This method is practical and conservative. The 0.05 in/ton criterion was empirically derived from case histories and represents a commonly accepted rate of settlement for pile foundations."
    },
    'Butler & Hoy': {
        theory: "Butler and Hoy's method determines the ultimate capacity as the intersection of two tangent lines drawn on the load-settlement curve: the initial tangent (early elastic portion) and a line parallel to the final portion of the curve with a slope of 0.05 in/ton.",
        procedure: "Fit a tangent line to the initial (elastic) portion of the load-settlement curve. Fit a second line with the standard slope of 0.05 in/ton (0.14 mm/kN) to the final portion of the curve. The load at the intersection of these two lines is the ultimate capacity.",
        notes: "This method accounts for both the initial stiffness and the terminal rate of settlement of the pile, providing a balanced estimate of the failure load."
    },
    'Van der Veen': {
        theory: "Van der Veen's method assumes that the load-settlement curve follows an exponential function: Q = Qult × (1 - e^(-α×S)), where α is a shape parameter. The method uses trial values of Qult to find the one that best linearizes the transformed data.",
        procedure: "For each trial Qult, calculate -ln(1 - Q/Qult) for each data point. Plot these values against settlement S. If the correct Qult is chosen, these points will lie on a straight line through the origin with slope α. The Qult value that yields the highest R² is selected as the ultimate capacity.",
        notes: "This method provides an excellent fit to most pile load test data (R² > 0.99 is common). The exponential model captures the asymptotic nature of the load-settlement response and allows extrapolation beyond the tested load range. The fitted curve and Qult asymptote are shown on the load-settlement diagram."
    }
};

function niceNum(range: number, round: boolean): number {
    const e = Math.floor(Math.log10(range));
    const f = range / Math.pow(10, e);
    let nf: number;
    if (round) { if (f < 1.5) nf = 1; else if (f < 3) nf = 2; else if (f < 7) nf = 5; else nf = 10; }
    else { if (f <= 1) nf = 1; else if (f <= 2) nf = 2; else if (f <= 5) nf = 5; else nf = 10; }
    return nf * Math.pow(10, e);
}
function niceTicks(min: number, max: number, n = 6): number[] {
    if (max === min) return [min];
    const range = niceNum(max - min, false);
    const d = niceNum(range / (n - 1), true);
    const lo = Math.floor(min / d) * d;
    const hi = Math.ceil(max / d) * d;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + d * 0.5; v += d) ticks.push(parseFloat(v.toPrecision(8)));
    return ticks;
}
function fmtNum(v: number): string {
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 1) return v.toFixed(1);
    return v.toPrecision(3);
}

export default function LoadTestReport() {
    const { activeProject } = useProject();
    const lt = activeProject?.loadTest;
    const selectedMethod = (lt?.failureCriteria as InterpretationMethod) || 'Davisson Offset Limit';
    const steps = lt?.steps || [];
    const pileDiameter = lt?.pileDiameter || 600;
    const pileLength = lt?.pileLength || 24.5;
    const material = lt?.material || 'Concrete (C40)';
    const methodInfo = METHOD_DESCRIPTIONS[selectedMethod] || METHOD_DESCRIPTIONS['Davisson Offset Limit'];

    const analysis = useMemo(() => analyzeLoadTest(selectedMethod, steps, pileDiameter, pileLength), [selectedMethod, steps, pileDiameter, pileLength]);

    const allResults = useMemo(() => ALL_METHODS.map(m => ({
        method: m,
        result: analyzeLoadTest(m, steps, pileDiameter, pileLength),
    })), [steps, pileDiameter, pileLength]);

    // Chart data
    const chart = analysis.chart;
    const dp = chart.dataPoints;
    const allXs = [...dp.map(p => p.x), ...chart.lines.flatMap(l => l.points.map(p => p.x))].filter(v => isFinite(v));
    const allYs = [...dp.map(p => p.y), ...chart.lines.flatMap(l => l.points.map(p => p.y))].filter(v => isFinite(v));
    const xTicks = niceTicks(allXs.length ? Math.min(...allXs, 0) : 0, allXs.length ? Math.max(...allXs) * 1.05 : 1, 7);
    const yTicks = niceTicks(allYs.length ? Math.min(...allYs, 0) : 0, allYs.length ? Math.max(...allYs) * 1.05 : 1, 7);
    const xMin = xTicks[0], xMax = xTicks[xTicks.length - 1];
    const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];
    const xRange = xMax - xMin || 1, yRange = yMax - yMin || 1;
    const toX = (x: number) => ((x - xMin) / xRange) * 100;
    const toY = (y: number) => 100 - ((y - yMin) / yRange) * 100;

    const capacityValues = allResults.map(r => r.result.ultimateCapacity).filter((v): v is number => v !== null);
    const avgCapacity = capacityValues.length ? Math.round(capacityValues.reduce((a, b) => a + b, 0) / capacityValues.length) : null;
    const minCapacity = capacityValues.length ? Math.min(...capacityValues) : null;
    const maxCapacity = capacityValues.length ? Math.max(...capacityValues) : null;

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="flex-1 overflow-y-auto bg-slate-200 print:bg-white">
            {/* Print button — hidden on print */}
            <div className="sticky top-0 z-50 bg-[#131d27] border-b border-slate-800 px-6 py-3 flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-lg font-bold text-white">Report Preview</h1>
                    <p className="text-slate-400 text-xs">{selectedMethod} — {activeProject?.name || 'Project'}</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-lg">print</span>
                    Print Report
                </button>
            </div>

            {/* ================================ */}
            {/* PRINTABLE REPORT — A4 white pages */}
            {/* ================================ */}
            <div className="max-w-[210mm] mx-auto print:max-w-none">

                {/* ─── PAGE 1: COVER ─── */}
                <div className="bg-white shadow-xl print:shadow-none mb-4 print:mb-0 report-page" style={{ minHeight: '297mm' }}>
                    <div className="p-12 lg:p-16 flex flex-col justify-between" style={{ minHeight: '297mm' }}>
                        {/* Top bar */}
                        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">GeoPile Pro</h1>
                                <p className="text-sm text-slate-500 font-medium">Engineering Suite v2.4</p>
                            </div>
                            <div className="text-right text-xs text-slate-400">
                                <p>Report ID: RPT-{Date.now().toString(36).toUpperCase()}</p>
                                <p>{today}</p>
                            </div>
                        </div>

                        {/* Title area */}
                        <div className="flex-1 flex flex-col justify-center py-20">
                            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">Pile Load Test Analysis Report</p>
                            <h2 className="text-5xl font-black text-slate-900 leading-tight mb-6">{selectedMethod}</h2>
                            <div className="w-24 h-1 bg-blue-600 rounded mb-8"></div>
                            <p className="text-xl text-slate-600 max-w-md leading-relaxed">
                                Static pile load test interpretation and ultimate capacity determination for {activeProject?.name || 'the project site'}.
                            </p>
                        </div>

                        {/* Project info grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t-2 border-slate-200 pt-8">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project</p>
                                <p className="text-sm font-bold text-slate-800">{activeProject?.name || 'Unnamed'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Test Method</p>
                                <p className="text-sm font-bold text-slate-800">{lt?.method || 'Static Axial (ASTM D1143)'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pile Diameter</p>
                                <p className="text-sm font-bold text-slate-800">{pileDiameter} mm</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pile Length</p>
                                <p className="text-sm font-bold text-slate-800">{pileLength} m</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── PAGE 2: METHOD DESCRIPTION & RESULTS ─── */}
                <div className="bg-white shadow-xl print:shadow-none mb-4 print:mb-0 report-page p-10 lg:p-14" style={{ minHeight: '297mm' }}>
                    {/* Section 1: Method Description */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                            <span className="text-2xl font-black text-slate-300">01</span>
                            <h3 className="text-xl font-bold text-slate-800">Method Description</h3>
                        </div>

                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Theoretical Background</h4>
                        <p className="text-sm text-slate-600 leading-relaxed mb-5">{methodInfo.theory}</p>

                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Procedure</h4>
                        <p className="text-sm text-slate-600 leading-relaxed mb-5">{methodInfo.procedure}</p>

                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Notes & Limitations</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{methodInfo.notes}</p>
                    </div>

                    {/* Section 2: Test Parameters */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                            <span className="text-2xl font-black text-slate-300">02</span>
                            <h3 className="text-xl font-bold text-slate-800">Test Parameters</h3>
                        </div>

                        <table className="w-full text-sm border border-slate-200">
                            <tbody className="divide-y divide-slate-100">
                                <tr><td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50 w-1/3">Pile Diameter (D)</td><td className="px-4 py-2.5 font-bold text-slate-800">{pileDiameter} mm</td></tr>
                                <tr><td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50">Pile Length (L)</td><td className="px-4 py-2.5 font-bold text-slate-800">{pileLength} m</td></tr>
                                <tr><td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50">Material</td><td className="px-4 py-2.5 font-bold text-slate-800">{material}</td></tr>
                                <tr><td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50">Interpretation Method</td><td className="px-4 py-2.5 font-bold text-blue-700">{selectedMethod}</td></tr>
                                <tr><td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50">Number of Load Steps</td><td className="px-4 py-2.5 font-bold text-slate-800">{steps.filter(s => s.status === 'completed').length}</td></tr>
                                <tr><td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50">Maximum Applied Load</td><td className="px-4 py-2.5 font-bold text-slate-800">{steps.length > 0 ? Math.max(...steps.map(s => s.load)).toLocaleString() : '—'} kN</td></tr>
                                <tr><td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50">Maximum Settlement</td><td className="px-4 py-2.5 font-bold text-slate-800">{steps.length > 0 ? Math.max(...steps.map(s => s.settlement)).toFixed(1) : '—'} mm</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 3: Results Summary */}
                    <div>
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                            <span className="text-2xl font-black text-slate-300">03</span>
                            <h3 className="text-xl font-bold text-slate-800">Analysis Results</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="border-2 border-blue-100 rounded-lg p-5 text-center bg-blue-50/50">
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Ultimate Capacity (Qult)</p>
                                <p className="text-3xl font-black text-blue-700 font-mono">{analysis.ultimateCapacity ? analysis.ultimateCapacity.toLocaleString() : '—'}</p>
                                <p className="text-xs text-blue-400 mt-1">kN</p>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-5 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Max Settlement</p>
                                <p className="text-3xl font-black text-slate-800 font-mono">{analysis.maxSettlement !== null ? analysis.maxSettlement.toFixed(1) : '—'}</p>
                                <p className="text-xs text-slate-400 mt-1">mm</p>
                            </div>
                            <div className="border-2 border-emerald-100 rounded-lg p-5 text-center bg-emerald-50/50">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Safe Working Load (FS=2.5)</p>
                                <p className="text-3xl font-black text-emerald-700 font-mono">{analysis.safeWorkLoad ? analysis.safeWorkLoad.toLocaleString() : '—'}</p>
                                <p className="text-xs text-emerald-400 mt-1">kN</p>
                            </div>
                        </div>

                        {analysis.ultimateCapacity && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-sm text-slate-600 leading-relaxed">
                                <p className="font-bold text-slate-800 mb-2">Interpretation:</p>
                                <p>
                                    Using the <strong>{selectedMethod}</strong> interpretation method, the ultimate pile capacity is determined to be <strong>{analysis.ultimateCapacity.toLocaleString()} kN</strong>.
                                    {analysis.maxSettlement !== null && <> The corresponding settlement at failure is <strong>{analysis.maxSettlement.toFixed(1)} mm</strong>, which is equivalent to <strong>{((analysis.maxSettlement / pileDiameter) * 100).toFixed(2)}%</strong> of the pile diameter.</>}
                                    {' '}Applying a factor of safety of 2.5, the recommended safe working load is <strong>{analysis.safeWorkLoad?.toLocaleString()} kN</strong>.
                                    {' '}The maximum applied test load of {Math.max(...steps.map(s => s.load)).toLocaleString()} kN represents <strong>{((Math.max(...steps.map(s => s.load)) / analysis.ultimateCapacity) * 100).toFixed(0)}%</strong> of the interpreted ultimate capacity.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── PAGE 3: CHART & DATA ─── */}
                <div className="bg-white shadow-xl print:shadow-none mb-4 print:mb-0 report-page p-10 lg:p-14" style={{ minHeight: '297mm' }}>
                    {/* Section 4: Chart */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                            <span className="text-2xl font-black text-slate-300">04</span>
                            <h3 className="text-xl font-bold text-slate-800">{chart.title}</h3>
                        </div>

                        <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden" style={{ height: 380 }}>
                            {/* Y labels */}
                            <div className="absolute top-4 bottom-8 left-0 w-14 flex flex-col justify-between pointer-events-none">
                                {[...yTicks].reverse().map((v, i) => (
                                    <span key={`yt-${i}`} className="text-[9px] text-slate-500 text-right pr-1.5 font-mono leading-none">{fmtNum(v)}</span>
                                ))}
                            </div>
                            {/* X labels */}
                            <div className="absolute bottom-0 left-14 right-4 flex justify-between pointer-events-none pb-0.5">
                                {xTicks.map((v, i) => (
                                    <span key={`xt-${i}`} className="text-[9px] text-slate-500 font-mono leading-none">{fmtNum(v)}</span>
                                ))}
                            </div>
                            {/* Axis labels */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-medium">{chart.xLabel}</div>
                            <div className="absolute top-1/2 left-0.5 -translate-y-1/2 -rotate-90 text-[8px] text-slate-500 font-medium whitespace-nowrap origin-center" style={{ width: 0 }}>{chart.yLabel}</div>

                            <svg className="absolute top-4 left-14 right-4 bottom-8" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="hidden">
                                {yTicks.map((v, i) => <line key={`hg-${i}`} x1="0" y1={toY(v)} x2="100" y2={toY(v)} stroke="#e2e8f0" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
                                {xTicks.map((v, i) => <line key={`vg-${i}`} x1={toX(v)} y1="0" x2={toX(v)} y2="100" stroke="#e2e8f0" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
                                {chart.lines.map((line, idx) => (
                                    <polyline key={`cl-${idx}`} points={line.points.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ')}
                                        fill="none" stroke={line.color} strokeWidth="1.5"
                                        strokeDasharray={line.style === 'dashed' ? '6,4' : line.style === 'dotted' ? '2,3' : 'none'}
                                        vectorEffect="non-scaling-stroke" />
                                ))}
                                {dp.length > 1 && <polyline points={dp.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                                {dp.map((p, i) => <circle key={`dp-${i}`} cx={toX(p.x)} cy={toY(p.y)} r="2.5" fill="#2563eb" stroke="#fff" strokeWidth="0.8" />)}
                                {chart.markers.map((m, idx) => (
                                    <g key={`mk-${idx}`}>
                                        <circle cx={toX(m.x)} cy={toY(m.y)} r="6" fill="none" stroke="#dc2626" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                        <line x1={toX(m.x)} y1={toY(m.y)} x2={toX(m.x)} y2="100" stroke="#dc2626" strokeWidth="0.5" strokeDasharray="3,4" vectorEffect="non-scaling-stroke" opacity="0.4" />
                                        <line x1={toX(m.x)} y1={toY(m.y)} x2="0" y2={toY(m.y)} stroke="#dc2626" strokeWidth="0.5" strokeDasharray="3,4" vectorEffect="non-scaling-stroke" opacity="0.4" />
                                    </g>
                                ))}
                            </svg>
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-slate-500">
                            <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-blue-600 rounded"></div>Measured Data</div>
                            {chart.lines.filter(l => l.label).map((line, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                    <div className="w-4 h-0.5" style={{ borderTop: `2px ${line.style === 'dashed' ? 'dashed' : line.style === 'dotted' ? 'dotted' : 'solid'} ${line.color}` }}></div>
                                    {line.label}
                                </div>
                            ))}
                            {chart.markers.length > 0 && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-red-600"></div>Failure Point (Qult)</div>}
                        </div>
                    </div>

                    {/* Section 5: Load Schedule Data */}
                    <div>
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-3">
                            <span className="text-2xl font-black text-slate-300">05</span>
                            <h3 className="text-xl font-bold text-slate-800">Load Schedule Data</h3>
                        </div>
                        <table className="w-full text-sm border border-slate-200">
                            <thead>
                                <tr className="bg-slate-100 text-[10px] text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-2.5 text-left border-b border-slate-200">Step</th>
                                    <th className="px-4 py-2.5 text-right border-b border-slate-200">Load (kN)</th>
                                    <th className="px-4 py-2.5 text-right border-b border-slate-200">Settlement (mm)</th>
                                    <th className="px-4 py-2.5 text-right border-b border-slate-200">Hold Time (min)</th>
                                    <th className="px-4 py-2.5 text-right border-b border-slate-200">Δ/Q (mm/kN)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {steps.filter(s => s.status === 'completed').map((s, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2 text-slate-600 font-mono">{s.step}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">{s.load.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-700">{s.settlement.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-500">{s.holdTime}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-500">{s.load > 0 ? (s.settlement / s.load).toFixed(5) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ─── PAGE 4: COMPARISON & CONCLUSION ─── */}
                <div className="bg-white shadow-xl print:shadow-none mb-4 print:mb-0 p-10 lg:p-14" style={{ minHeight: '297mm' }}>
                    {/* Section 6: Methods Comparison */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                            <span className="text-2xl font-black text-slate-300">06</span>
                            <h3 className="text-xl font-bold text-slate-800">Interpretation Methods Comparison</h3>
                        </div>

                        <table className="w-full text-sm border border-slate-200 mb-6">
                            <thead>
                                <tr className="bg-slate-100 text-[10px] text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-2.5 text-left border-b border-slate-200">Method</th>
                                    <th className="px-4 py-2.5 text-right border-b border-slate-200">Qult (kN)</th>
                                    <th className="px-4 py-2.5 text-right border-b border-slate-200">SWL (kN)</th>
                                    <th className="px-4 py-2.5 text-center border-b border-slate-200">Chart Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allResults.map(({ method, result }, i) => (
                                    <tr key={i} className={method === selectedMethod ? 'bg-blue-50 font-bold' : ''}>
                                        <td className="px-4 py-2.5 text-slate-800">
                                            {method === selectedMethod && <span className="text-blue-600 mr-1">▸</span>}
                                            {method}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono">{result.ultimateCapacity ? result.ultimateCapacity.toLocaleString() : '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{result.safeWorkLoad ? result.safeWorkLoad.toLocaleString() : '—'}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-400 text-xs">{result.chart.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {avgCapacity && minCapacity && maxCapacity && (
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="border border-slate-200 rounded-lg p-4 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Minimum Qult</p>
                                    <p className="text-xl font-black text-slate-800 font-mono">{minCapacity.toLocaleString()} kN</p>
                                </div>
                                <div className="border border-slate-200 rounded-lg p-4 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Average Qult</p>
                                    <p className="text-xl font-black text-slate-800 font-mono">{avgCapacity.toLocaleString()} kN</p>
                                </div>
                                <div className="border border-slate-200 rounded-lg p-4 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Maximum Qult</p>
                                    <p className="text-xl font-black text-slate-800 font-mono">{maxCapacity.toLocaleString()} kN</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 7: Engineering Conclusions */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                            <span className="text-2xl font-black text-slate-300">07</span>
                            <h3 className="text-xl font-bold text-slate-800">Engineering Conclusions & Recommendations</h3>
                        </div>

                        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                            {analysis.ultimateCapacity && avgCapacity && minCapacity && maxCapacity ? (
                                <>
                                    <p>
                                        <strong>1. Ultimate Capacity:</strong> The pile load test was conducted on a {pileDiameter} mm diameter, {pileLength} m long {material.toLowerCase()} pile.
                                        The test consisted of {steps.filter(s => s.status === 'completed').length} load increments reaching a maximum applied load of {Math.max(...steps.map(s => s.load)).toLocaleString()} kN
                                        with a corresponding maximum settlement of {Math.max(...steps.map(s => s.settlement)).toFixed(1)} mm.
                                    </p>
                                    <p>
                                        <strong>2. Method-Specific Result:</strong> Using the <em>{selectedMethod}</em> interpretation criterion, the ultimate pile capacity is determined as <strong>{analysis.ultimateCapacity.toLocaleString()} kN</strong>.
                                        {analysis.maxSettlement !== null && <> The settlement at the interpreted failure load is {analysis.maxSettlement.toFixed(1)} mm ({((analysis.maxSettlement / pileDiameter) * 100).toFixed(2)}% of pile diameter).</>}
                                    </p>
                                    <p>
                                        <strong>3. Multi-Method Comparison:</strong> Across all {capacityValues.length} applicable interpretation methods, the ultimate capacity ranges from {minCapacity.toLocaleString()} kN to {maxCapacity.toLocaleString()} kN,
                                        with an arithmetic mean of {avgCapacity.toLocaleString()} kN. The coefficient of variation is {((Math.sqrt(allResults.map(r => r.result.ultimateCapacity).filter((v): v is number => v !== null).reduce((acc, v) => acc + (v - avgCapacity) ** 2, 0) / capacityValues.length) / avgCapacity) * 100).toFixed(1)}%,
                                        indicating {((Math.sqrt(allResults.map(r => r.result.ultimateCapacity).filter((v): v is number => v !== null).reduce((acc, v) => acc + (v - avgCapacity) ** 2, 0) / capacityValues.length) / avgCapacity) * 100) < 15 ? 'good consistency' : 'moderate variability'} among the different interpretation methods.
                                    </p>
                                    <p>
                                        <strong>4. Recommended Design Load:</strong> Adopting the <em>{selectedMethod}</em> result with a factor of safety (FS) of 2.5, the recommended allowable (safe working) load is <strong>{analysis.safeWorkLoad?.toLocaleString()} kN</strong>.
                                        For critical structures, the engineer may consider using the minimum interpreted capacity ({minCapacity.toLocaleString()} kN) divided by the required FS, yielding an allowable load of {Math.round(minCapacity / 2.5).toLocaleString()} kN.
                                    </p>
                                    <p>
                                        <strong>5. Settlement Performance:</strong> Under the recommended safe working load of {analysis.safeWorkLoad?.toLocaleString()} kN, the anticipated settlement
                                        is expected to remain well within the allowable limits for typical structures. At the maximum test load, the settlement-to-diameter ratio was {((Math.max(...steps.map(s => s.settlement)) / pileDiameter) * 100).toFixed(2)}%.
                                    </p>
                                </>
                            ) : (
                                <p className="text-slate-400 italic">Insufficient data to generate conclusions. Please run the simulation in the Load Test Lab first and ensure at least the first few steps are completed.</p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t-2 border-slate-200 pt-6 mt-auto">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <div>
                                <p className="font-bold text-slate-500">GeoPile Pro Engineering Suite v2.4</p>
                                <p>This report was generated automatically and should be reviewed by a qualified engineer.</p>
                            </div>
                            <div className="text-right">
                                <p>{today}</p>
                                <p>Page 4 of 4</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
