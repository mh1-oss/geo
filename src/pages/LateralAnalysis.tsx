import { useState, useMemo } from 'react';
import { useProject } from '../store/ProjectContext';
import { calculateBroms } from '../lib/calc/broms';
import { calculateBrinchHansen } from '../lib/calc/brinchHansen';
import { classifyPile, computeYieldMoment } from '../lib/calc/classification';

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
        <div className="flex flex-1 w-full h-full flex-col lg:flex-row relative">
            {/* Left Sidebar: Configuration */}
            <aside className="w-full lg:w-[340px] flex flex-col glass-panel flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-auto lg:h-full lg:overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                        <span className="material-symbols-outlined block text-[24px]">architecture</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Lateral Analysis</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">{activeProject?.name || 'Unsaved Project'}</p>
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-8 flex-1">
                    
                    {/* 1. Pile Geometry */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
                            Pile Geometry
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Pile Length</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">L</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" value={pileLength} onChange={(e) => setPileLength(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">m</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Diameter</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">D</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" value={diameter} onChange={(e) => setDiameter(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">mm</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Stick-up Length</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">e</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" step="0.1" value={stickUp} onChange={(e) => setStickUp(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">m</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Section Properties */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-amber-500">settings_applications</span>
                            Section Properties (EI)
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between group">
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Elastic Modulus</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">E</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" step="0.5" value={youngsModulus} onChange={(e) => setYoungsModulus(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">GPa</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <div className="pr-2">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">Moment of Inertia</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">I</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-24 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" step="0.001" value={momentOfInertia} onChange={(e) => setMomentOfInertia(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">m⁴</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Boundary Condition */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-emerald-500">vertical_align_center</span>
                            Head Condition
                        </h3>
                        <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/30 p-1">
                            <button
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${headCondition === 'free' ? 'bg-white dark:bg-slate-800 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                onClick={() => setHeadCondition('free')}
                            >Free Head</button>
                            <button
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${headCondition === 'fixed' ? 'bg-white dark:bg-slate-800 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                onClick={() => setHeadCondition('fixed')}
                            >Fixed Head</button>
                        </div>
                    </div>

                    {/* 4. Applied Loads */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-rose-500">fitness_center</span>
                            Applied Loads
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between group">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Shear (H)</span>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" value={shearLoad} onChange={(e) => setShearLoad(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">kN</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Moment (M)</span>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" value={momentLoad} onChange={(e) => setMomentLoad(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">kN·m</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Axial (V)</span>
                                <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all group-hover:border-primary/30">
                                    <input className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-1.5 outline-none"
                                        type="number" value={axialLoad} onChange={(e) => setAxialLoad(Number(e.target.value))} />
                                    <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">kN</span>
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
                    
                    {/* Classification Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                        <div className="col-span-1 md:col-span-2 glass-panel p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                <span className="material-symbols-outlined text-[120px]">category</span>
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Pile Flexibility</h3>
                            <div className="flex items-end gap-3">
                                <div className={`px-4 py-1.5 rounded-lg border-2 text-lg font-black uppercase tracking-wide
                                    ${results.classification.classification === 'long' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                                    results.classification.classification === 'rigid' ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' :
                                    'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'}`}>
                                    {results.classification.classification}
                                </div>
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-semibold pb-1">Behavior Mode</span>
                            </div>
                        </div>
                        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-indigo-500/50">
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 line-clamp-1">{results.classification.factorName} Stiffness Factor</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{results.classification.stiffnessFactor.toFixed(2)}</span>
                        </div>
                        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-violet-500/50">
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Flexibility Ratio (L/T or L/R)</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{results.classification.L_over_factor.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Results Comparison Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in [animation-delay:100ms]">
                        {/* Broms Result */}
                        <div className="glass-panel rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-white/50 dark:bg-slate-800/20">
                                <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                    Broms Method Result
                                </h3>
                                {broms && (
                                    <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="p-6">
                                {broms ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700/30">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Ultimate Lateral Capacity</span>
                                                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-1">
                                                    {Math.round(broms.Hu).toLocaleString()} <span className="text-sm text-slate-400">kN</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700/30">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Max Moment</span>
                                                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-1">
                                                    {Math.round(broms.Mmax).toLocaleString()} <span className="text-sm text-slate-400">kN·m</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/30">
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Critical Depth</span>
                                            <span className="font-mono font-bold text-slate-900 dark:text-white">{broms.criticalDepth.toFixed(2)} m</span>
                                        </div>
                                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">{broms.failureMode}</span>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{broms.notes[0]}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                                            <span className="material-symbols-outlined text-[32px]">warning</span>
                                        </div>
                                        <h4 className="text-slate-900 dark:text-white font-bold mb-1">Cannot Compute Broms</h4>
                                        <p className="text-slate-500 text-sm max-w-xs">Check soil parameters. This method relies on complete soil friction angle or undrained shear strength.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Brinch Hansen Result */}
                        <div className="glass-panel rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-white/50 dark:bg-slate-800/20">
                                <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>
                                    Brinch Hansen Result
                                </h3>
                                {bh && (
                                    <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="p-6">
                                {bh ? (
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-100 dark:border-slate-700/30 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Ultimate Lateral Capacity</span>
                                                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-1">
                                                    {Math.round(bh.Hu).toLocaleString()} <span className="text-base text-slate-400">kN</span>
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-500/20">
                                                <span className="material-symbols-outlined">trending_flat</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/30">
                                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Rotation Center</span>
                                                <span className="font-mono font-bold text-slate-900 dark:text-white">{bh.rotationDepth.toFixed(2)} m</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/30">
                                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Analysis Slices</span>
                                                <span className="font-mono font-bold text-slate-900 dark:text-white">{bh.reactions.length}</span>
                                            </div>
                                        </div>
                                        {bh.warnings && bh.warnings.length > 0 && (
                                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-400/90 flex gap-2">
                                                <span className="material-symbols-outlined text-[18px] flex-shrink-0">info</span>
                                                <p>{bh.warnings[0]}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                                            <span className="material-symbols-outlined text-[32px]">warning</span>
                                        </div>
                                        <h4 className="text-slate-900 dark:text-white font-bold mb-1">Cannot Compute Limit State</h4>
                                        <p className="text-slate-500 text-sm max-w-xs">Need fully defined soil stratigraphy to compute Brinch Hansen lateral pressures.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="glass-panel rounded-2xl flex flex-col overflow-hidden shadow-sm animate-fade-in [animation-delay:200ms]">
                        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-800/20">
                            <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                Pile Response Profiles
                            </h3>
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                {(['deflection', 'moment', 'shear'] as const).map(tab => (
                                    <button key={tab}
                                        className={`px-4 py-1.5 text-xs font-bold capitalize rounded-md transition-all ${activeChart === tab ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        onClick={() => setActiveChart(tab)}
                                    >{tab === 'deflection' ? 'Soil Reaction' : tab}</button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-6 pr-6 pb-16 pl-10 relative">
                            {bh && bh.reactions.length > 0 ? (
                                <div className="relative h-[400px] w-full border-t border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/20 overflow-visible" style={{ marginLeft: 30, marginRight: 20, width: 'calc(100% - 50px)' }}>
                                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                                        {/* Center line (Depth Axis) */}
                                        <line x1="50%" y1="0" x2="50%" y2="100%" className="stroke-slate-300 dark:stroke-slate-600 stroke-2" vectorEffect="non-scaling-stroke" strokeDasharray="4,4" />
                                        
                                        {/* Grid Lines Horiz (Depth) */}
                                        {[20, 40, 60, 80].map(v => (
                                            <line key={`hg-${v}`} x1="0" y1={`${v}%`} x2="100%" y2={`${v}%`} className="stroke-slate-200 dark:stroke-slate-800 stroke-1" vectorEffect="non-scaling-stroke" />
                                        ))}
                                        
                                        {/* Grid Lines Vert */}
                                        {[0, 25, 75, 100].map(v => (
                                            <line key={`vg-${v}`} x1={`${v}%`} y1="0" x2={`${v}%`} y2="100%" className="stroke-slate-200 dark:stroke-slate-800 stroke-1" vectorEffect="non-scaling-stroke" />
                                        ))}

                                        {(() => {
                                            const data = bh.reactions.map(r => ({
                                                depth: r.depth,
                                                value: activeChart === 'deflection' ? r.reaction : activeChart === 'moment' ? r.moment : r.shear,
                                            }));
                                            const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 0.01);
                                            const maxD = results.L;
                                            
                                            // Scale value to +/- 45% around 50% center
                                            const points = data.map(d => {
                                                const x = 50 + (d.value / maxVal) * 45;
                                                const y = (d.depth / maxD) * 100;
                                                return `${x}%,${y}%`;
                                            }).join(' ');

                                            const strokeColor = activeChart === 'deflection' ? '#3b82f6' : activeChart === 'moment' ? '#14b8a6' : '#f59e0b';
                                            
                                            return (
                                                <>
                                                    <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                                                    {data.map((d, i) => {
                                                        const x = 50 + (d.value / maxVal) * 45;
                                                        const y = (d.depth / maxD) * 100;
                                                        return (
                                                            <circle key={`pt-${i}`} cx={`${x}%`} cy={`${y}%`} r="4" className="fill-white dark:fill-slate-900 stroke-2" stroke={strokeColor} />
                                                        );
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                    
                                    {/* Labels overlaid */}
                                    <div className="absolute top-0 bottom-0 -left-8 w-6 flex flex-col justify-between items-end pointer-events-none text-[10px] text-slate-500 font-mono">
                                        <span>0m</span>
                                        <span>{(results.L * 0.2).toFixed(1)}</span>
                                        <span>{(results.L * 0.4).toFixed(1)}</span>
                                        <span>{(results.L * 0.6).toFixed(1)}</span>
                                        <span>{(results.L * 0.8).toFixed(1)}</span>
                                        <span>{results.L.toFixed(1)}m</span>
                                    </div>
                                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] tracking-widest uppercase text-slate-400 font-bold whitespace-nowrap">
                                        Depth (m)
                                    </div>
                                    
                                    <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-0 pointer-events-none text-[10px] text-slate-500 font-mono">
                                        <span>-Max</span>
                                        <span className="translate-x-[50%]">Zero</span>
                                        <span>+Max</span>
                                    </div>
                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] tracking-widest uppercase text-primary font-bold">
                                        {activeChart === 'deflection' ? 'Soil Reaction (kN/m)' : activeChart === 'moment' ? 'Bending Moment (kN·m)' : 'Shear Force (kN)'}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-700 mb-4">query_stats</span>
                                    <span className="font-semibold">Insufficient Data for Profile Visualization</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                </div>
            </main>
        </div>
    );
}
