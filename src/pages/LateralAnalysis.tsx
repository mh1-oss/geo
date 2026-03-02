import { useState, useMemo } from 'react';
import { useProject } from '../store/ProjectContext';
import { calculateBroms } from '../lib/calc/broms';
import { calculateBrinchHansen } from '../lib/calc/brinchHansen';
import { classifyPile, computeEI, computeYieldMoment } from '../lib/calc/classification';

export default function LateralAnalysis() {
    const { activeProject, updateActiveProject } = useProject();
    const lat = activeProject?.lateral;
    const soil = activeProject?.soil;

    const [pileLength, setPileLength] = useState(lat?.pileLength || 24.0);
    const [diameter, setDiameter] = useState(lat?.diameter || 1200);
    const [stickUp, setStickUp] = useState(lat?.stickUp || 0.5);
    const [youngsModulus, setYoungsModulus] = useState(lat?.youngsModulus || 28.5);
    const [momentOfInertia, setMomentOfInertia] = useState(lat?.momentOfInertia || 0.1017);
    const [headCondition, setHeadCondition] = useState<'free' | 'fixed'>(lat?.headCondition || 'free');
    const [shearLoad, setShearLoad] = useState(lat?.shearLoad || 850);
    const [momentLoad, setMomentLoad] = useState(lat?.momentLoad || 420);
    const [axialLoad, setAxialLoad] = useState(lat?.axialLoad || 2500);
    const [activeChart, setActiveChart] = useState<'deflection' | 'moment' | 'shear'>('deflection');

    const results = useMemo(() => {
        const D = diameter / 1000;
        const L = pileLength;
        const e = stickUp;
        const EI = youngsModulus * 1e6 * momentOfInertia; // kN·m²
        const k = soil?.k || 2.5;

        // Classification
        const classification = classifyPile(L, EI, soil?.modulusType || 'constant', k * 1000);

        // Yield moment
        const wallThickness = activeProject?.pile?.wallThickness;
        const My = wallThickness
            ? computeYieldMoment(D, activeProject?.pile?.yieldStrength || 350, wallThickness)
            : youngsModulus * 1e6 * momentOfInertia / (D / 2); // Approximate

        // Broms method
        let bromsResult = null;
        try {
            bromsResult = calculateBroms({
                soilType: soil?.type || 'clay',
                pileCondition: classification.classification === 'intermediate' ? 'long' : classification.classification,
                headCondition,
                L, D, e,
                yieldMoment: My,
                cu: soil?.cu,
                gamma: soil?.gamma,
                phi: soil?.phi,
            });
        } catch { /* ignore */ }

        // Brinch Hansen
        let bhResult = null;
        try {
            bhResult = calculateBrinchHansen({
                soilType: soil?.type || 'clay',
                L, D, e, slices: 20,
                gamma: soil?.gamma,
                cu: soil?.cu,
                phi: soil?.phi,
            });
        } catch { /* ignore */ }

        return { classification, bromsResult, bhResult, D, L, e, EI, My };
    }, [pileLength, diameter, stickUp, youngsModulus, momentOfInertia, headCondition, soil, activeProject?.pile]);

    function saveParams() {
        updateActiveProject({
            lateral: { pileLength, diameter, stickUp, youngsModulus, momentOfInertia, headCondition, shearLoad, momentLoad, axialLoad }
        });
    }

    const bh = results.bhResult;
    const broms = results.bromsResult;

    return (
        <main className="flex flex-1 overflow-hidden h-full">
            {/* Left Side: Parameters */}
            <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-y-auto">
                <div className="p-5 border-b border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">{activeProject?.name || 'Project'}</div>
                    <h2 className="text-xl font-bold text-white">Lateral Load Analysis</h2>
                    <p className="text-sm text-slate-500 mt-1">Broms & Brinch Hansen methods</p>
                </div>
                <div className="flex-1">
                    {/* Pile Geometry */}
                    <div className="border-b border-slate-800">
                        <div className="px-5 py-3 text-sm font-semibold text-white">1. Pile Geometry</div>
                        <div className="px-5 pb-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Pile Length (L)</label>
                                <div className="flex items-center">
                                    <input className="flex-1 bg-[#0f1720] border border-slate-700 rounded-l-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary h-9 font-mono"
                                        type="number" value={pileLength} onChange={(e) => setPileLength(Number(e.target.value))} />
                                    <span className="bg-slate-800 border border-l-0 border-slate-700 text-slate-500 px-3 py-2 rounded-r-md text-sm w-12 h-9 flex items-center justify-center">m</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Diameter (D)</label>
                                <div className="flex items-center">
                                    <input className="flex-1 bg-[#0f1720] border border-slate-700 rounded-l-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary h-9 font-mono"
                                        type="number" value={diameter} onChange={(e) => setDiameter(Number(e.target.value))} />
                                    <span className="bg-slate-800 border border-l-0 border-slate-700 text-slate-500 px-3 py-2 rounded-r-md text-sm w-12 h-9 flex items-center justify-center">mm</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Stick-up Length</label>
                                <div className="flex items-center">
                                    <input className="flex-1 bg-[#0f1720] border border-slate-700 rounded-l-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary h-9 font-mono"
                                        type="number" step="0.1" value={stickUp} onChange={(e) => setStickUp(Number(e.target.value))} />
                                    <span className="bg-slate-800 border border-l-0 border-slate-700 text-slate-500 px-3 py-2 rounded-r-md text-sm w-12 h-9 flex items-center justify-center">m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Section Properties */}
                    <div className="border-b border-slate-800">
                        <div className="px-5 py-3 text-sm font-semibold text-white">2. Section Properties (EI)</div>
                        <div className="px-5 pb-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Young's Modulus (E)</label>
                                <div className="flex items-center">
                                    <input className="flex-1 bg-[#0f1720] border border-slate-700 rounded-l-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary h-9 font-mono"
                                        type="number" step="0.5" value={youngsModulus} onChange={(e) => setYoungsModulus(Number(e.target.value))} />
                                    <span className="bg-slate-800 border border-l-0 border-slate-700 text-slate-500 px-3 py-2 rounded-r-md text-sm w-12 h-9 flex items-center justify-center">GPa</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Moment of Inertia (I)</label>
                                <div className="flex items-center">
                                    <input className="flex-1 bg-[#0f1720] border border-slate-700 rounded-l-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary h-9 font-mono"
                                        type="number" step="0.001" value={momentOfInertia} onChange={(e) => setMomentOfInertia(Number(e.target.value))} />
                                    <span className="bg-slate-800 border border-l-0 border-slate-700 text-slate-500 px-3 py-2 rounded-r-md text-sm w-12 h-9 flex items-center justify-center">m⁴</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Head Condition */}
                    <div className="border-b border-slate-800">
                        <div className="px-5 py-3 text-sm font-semibold text-white">3. Boundary Condition</div>
                        <div className="px-5 pb-5">
                            <div className="flex rounded-lg overflow-hidden border border-slate-700">
                                <button
                                    className={`flex-1 py-2 text-sm font-medium transition-colors ${headCondition === 'free' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    onClick={() => setHeadCondition('free')}
                                >Free Head</button>
                                <button
                                    className={`flex-1 py-2 text-sm font-medium transition-colors ${headCondition === 'fixed' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    onClick={() => setHeadCondition('fixed')}
                                >Fixed Head</button>
                            </div>
                        </div>
                    </div>
                    {/* Loads */}
                    <div className="border-b border-slate-800">
                        <div className="px-5 py-3 text-sm font-semibold text-white">4. Applied Loads</div>
                        <div className="px-5 pb-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Shear (kN)</span>
                                <input className="bg-[#0f1720] border border-slate-700 rounded px-2 py-1 text-sm text-white w-20 text-right font-mono focus:outline-none focus:border-primary"
                                    type="number" value={shearLoad} onChange={(e) => setShearLoad(Number(e.target.value))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Moment (kN·m)</span>
                                <input className="bg-[#0f1720] border border-slate-700 rounded px-2 py-1 text-sm text-white w-20 text-right font-mono focus:outline-none focus:border-primary"
                                    type="number" value={momentLoad} onChange={(e) => setMomentLoad(Number(e.target.value))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Axial (kN)</span>
                                <input className="bg-[#0f1720] border border-slate-700 rounded px-2 py-1 text-sm text-white w-20 text-right font-mono focus:outline-none focus:border-primary"
                                    type="number" value={axialLoad} onChange={(e) => setAxialLoad(Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-slate-800">
                    <button onClick={saveParams} className="w-full py-3 px-4 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">save</span>
                        Save & Update
                    </button>
                </div>
            </aside>

            {/* Center: Results Dashboard */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background-dark">
                <div className="flex-1 p-6 overflow-y-auto">
                    {/* Classification Card */}
                    <div className="bg-[#182634] rounded-xl border border-[#223649] p-5 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold">Pile Classification</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${results.classification.classification === 'long' ? 'bg-blue-500/20 text-blue-400' :
                                    results.classification.classification === 'rigid' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-purple-500/20 text-purple-400'
                                }`}>
                                {results.classification.classification}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-[#101a23] rounded-lg p-3">
                                <span className="text-[10px] text-slate-500 uppercase block">{results.classification.factorName}</span>
                                <span className="text-lg font-bold text-white font-mono">{results.classification.stiffnessFactor.toFixed(2)}</span>
                            </div>
                            <div className="bg-[#101a23] rounded-lg p-3">
                                <span className="text-[10px] text-slate-500 uppercase block">L/{results.classification.factorName}</span>
                                <span className="text-lg font-bold text-white font-mono">{results.classification.L_over_factor.toFixed(2)}</span>
                            </div>
                            <div className="bg-[#101a23] rounded-lg p-3">
                                <span className="text-[10px] text-slate-500 uppercase block">EI</span>
                                <span className="text-lg font-bold text-white font-mono">{(results.EI / 1e3).toFixed(0)}k</span>
                            </div>
                        </div>
                    </div>

                    {/* Results comparison */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Broms */}
                        <div className="bg-[#182634] rounded-xl border border-[#223649] p-5">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                <span className="w-3 h-3 rounded bg-blue-500"></span>
                                Broms Method
                            </h3>
                            {broms ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm">Hu</span>
                                        <span className="text-white font-bold font-mono">{Math.round(broms.Hu).toLocaleString()} kN</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm">Mmax</span>
                                        <span className="text-white font-bold font-mono">{Math.round(broms.Mmax).toLocaleString()} kN·m</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm">Critical Depth</span>
                                        <span className="text-white font-bold font-mono">{broms.criticalDepth.toFixed(2)} m</span>
                                    </div>
                                    <div className="mt-2 px-3 py-2 rounded bg-[#101a23] text-xs text-slate-400">
                                        <span className="text-white font-medium">{broms.failureMode}</span>
                                        <br />{broms.notes[0]}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm">Cannot compute — check soil parameters</p>
                            )}
                        </div>
                        {/* Brinch Hansen */}
                        <div className="bg-[#182634] rounded-xl border border-[#223649] p-5">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                <span className="w-3 h-3 rounded bg-teal-500"></span>
                                Brinch Hansen
                            </h3>
                            {bh ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm">Hu</span>
                                        <span className="text-white font-bold font-mono">{Math.round(bh.Hu).toLocaleString()} kN</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm">Rotation Depth</span>
                                        <span className="text-white font-bold font-mono">{bh.rotationDepth.toFixed(2)} m</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm">Slices</span>
                                        <span className="text-white font-bold font-mono">{bh.reactions.length}</span>
                                    </div>
                                    <div className="mt-2 px-3 py-2 rounded bg-[#101a23] text-xs text-slate-400">
                                        {bh.warnings[0]}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm">Cannot compute — check soil parameters</p>
                            )}
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="bg-[#182634] rounded-xl border border-[#223649] overflow-hidden">
                        <div className="flex border-b border-[#223649]">
                            {(['deflection', 'moment', 'shear'] as const).map(tab => (
                                <button key={tab}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${activeChart === tab ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:text-white'}`}
                                    onClick={() => setActiveChart(tab)}
                                >{tab === 'deflection' ? 'Soil Reaction' : tab}</button>
                            ))}
                        </div>
                        <div className="p-6">
                            {bh && bh.reactions.length > 0 ? (
                                <div className="relative h-64 bg-[#101a23] rounded-lg border border-[#223649] overflow-hidden">
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        {/* Center line */}
                                        <line x1="50" y1="0" x2="50" y2="100" stroke="#223649" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                                        {/* Grid */}
                                        {[20, 40, 60, 80].map(v => (
                                            <line key={v} x1="0" y1={v} x2="100" y2={v} stroke="#223649" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
                                        ))}
                                        {(() => {
                                            const data = bh.reactions.map(r => ({
                                                depth: r.depth,
                                                value: activeChart === 'deflection' ? r.reaction : activeChart === 'moment' ? r.moment : r.shear,
                                            }));
                                            const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1);
                                            const maxD = results.L;
                                            const points = data.map(d => `${50 + (d.value / maxVal) * 45},${(d.depth / maxD) * 95}`).join(' ');
                                            return (
                                                <>
                                                    <polyline points={points} fill="none" stroke={activeChart === 'deflection' ? '#0d7ff2' : activeChart === 'moment' ? '#14b8a6' : '#f59e0b'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                                    {data.map((d, i) => (
                                                        <circle key={i} cx={50 + (d.value / maxVal) * 45} cy={(d.depth / maxD) * 95} r="1" fill={activeChart === 'deflection' ? '#0d7ff2' : activeChart === 'moment' ? '#14b8a6' : '#f59e0b'} />
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                    {/* Axis labels */}
                                    <div className="absolute left-2 top-2 text-[9px] text-slate-500">0m</div>
                                    <div className="absolute left-2 bottom-2 text-[9px] text-slate-500">{results.L}m</div>
                                    <div className="absolute bottom-2 right-2 text-[9px] text-primary capitalize">{activeChart}</div>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                                    Set soil parameters and apply loads to see results
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
