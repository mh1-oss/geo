import { useState, useMemo } from 'react';
import { useProject } from '../store/ProjectContext';
import { classifyPile, computeEI, computeYieldMoment } from '../lib/calc/classification';
import { calculateBroms, BromsParams } from '../lib/calc/broms';
import { calculateBrinchHansen, BHParams } from '../lib/calc/brinchHansen';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Info, ShieldCheck, Activity, Layers, PenTool, LayoutDashboard, SlidersHorizontal, Box } from 'lucide-react';
import { useLanguage } from '../store/LanguageContext';
import { EngineeringInsight } from './EngineeringInsight';
import { SoilProfile } from './SoilProfile';
import { PileSection } from './PileSection';
import { Diagrams } from './Diagrams';
import { SensitivityAnalysis } from './SensitivityAnalysis';
import { Pile3DView } from './Pile3DView';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export function ResultsDashboard() {
    const { activeProject } = useProject();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'summary' | 'soil' | 'pile' | 'diagrams' | 'sensitivity' | '3d'>('summary');

    // Sensitivity Overrides
    const [overrides, setOverrides] = useState<Partial<any>>({});

    if (!activeProject) return null;

    // Merge overrides with activeProject
    const baseSoil = activeProject.soil;
    const basePile = activeProject.pile;
    const baseLoad = activeProject.load;

    const soil = { ...baseSoil, ...overrides };
    const pile = { ...basePile, ...overrides };
    const load = { ...baseLoad, ...overrides };

    const results = useMemo(() => {
        try {
            const EI = computeEI(pile.diameter, pile.youngsModulus, pile.wallThickness);
            const My = computeYieldMoment(pile.diameter, pile.yieldStrength, pile.wallThickness);

            const modulusParam = soil.modulusType === 'constant' ? (soil.k || 1) : (soil.nh || 1);

            const classification = classifyPile(pile.length, EI, soil.modulusType, modulusParam);

            // Broms
            const bromsParams: BromsParams = {
                soilType: soil.type,
                pileCondition: classification.classification,
                headCondition: 'free', // Defaults mostly to free
                L: pile.length,
                D: pile.diameter,
                yieldMoment: My,
                e: load.e,
                cu: soil.cu,
                gamma: soil.gamma,
                phi: soil.phi,
            };

            const bromsRes = calculateBroms(bromsParams);

            // Brinch Hansen
            const bhParams: BHParams = {
                soilType: soil.type,
                L: pile.length,
                D: pile.diameter,
                e: load.e,
                slices: 30,
                gamma: soil.gamma,
                cu: soil.cu,
                phi: soil.phi,
            };

            const bhRes = calculateBrinchHansen(bhParams);

            const percentDiff = Math.abs(bromsRes.Hu - bhRes.Hu) / ((bromsRes.Hu + bhRes.Hu) / 2) * 100;

            return {
                EI, My,
                classification,
                bromsRes,
                bhRes,
                percentDiff
            };
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [soil, pile, load]);

    if (!results) {
        return (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <p>{t('Incomplete or invalid parameters. Please check your inputs.')}</p>
            </div>
        );
    }

    const { classification, bromsRes, bhRes, percentDiff } = results;

    const tabs = [
        { id: 'summary', label: t('Summary'), icon: LayoutDashboard },
        { id: 'soil', label: t('Soil Profile'), icon: Layers },
        { id: 'pile', label: t('Pile Section'), icon: PenTool },
        { id: 'diagrams', label: t('Diagrams'), icon: Activity },
        { id: 'sensitivity', label: t('Sensitivity'), icon: SlidersHorizontal },
        { id: '3d', label: t('3D View'), icon: Box },
    ] as const;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Custom Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex gap-1 overflow-x-auto">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-400")} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-xl p-1 overflow-y-auto">
                {activeTab === 'summary' && (
                    <div className="space-y-6 animate-in fade-in duration-300">

                        {/* Classification Banner */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">{t('Pile Classification')}</h3>
                                <p className="text-slate-500 text-sm mt-1">{classification.stiffnessFactor.toFixed(2)} {t('stiffness factor')} ({classification.factorName})</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-blue-100 text-blue-800 text-sm font-medium uppercase tracking-wider">
                                    {t(classification.classification === 'rigid' ? 'Rigid Pile' : classification.classification === 'long' ? 'Long Pile' : 'Intermediate Pile')}
                                </span>
                                <p className="text-xs text-slate-400 mt-1">L/{classification.factorName} = {classification.L_over_factor.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Comparison Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Broms */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{t('Broms Method')}</h3>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-4xl font-bold text-slate-800">{bromsRes.Hu.toFixed(1)}</span>
                                    <span className="text-lg text-slate-500 mb-1">kN</span>
                                </div>
                                <div className="space-y-2 mt-4 text-sm text-slate-600">
                                    <p className="flex justify-between"><span>{t('Max Moment')}:</span> <strong>{bromsRes.Mmax.toFixed(1)} kN.m</strong></p>
                                    <p className="flex justify-between"><span>{t('Crit Depth')}:</span> <strong>{bromsRes.criticalDepth.toFixed(2)} m</strong></p>
                                    <p className="flex justify-between"><span>{t('Mode')}:</span> <strong className="text-emerald-600">{t(bromsRes.failureMode)}</strong></p>
                                </div>
                            </div>

                            {/* Brinch Hansen */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{t('Brinch Hansen (Simplified)')}</h3>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-4xl font-bold text-slate-800">{bhRes.Hu.toFixed(1)}</span>
                                    <span className="text-lg text-slate-500 mb-1">kN</span>
                                </div>
                                <div className="space-y-2 mt-4 text-sm text-slate-600">
                                    <p className="flex justify-between"><span>{t('Rotation Depth')}:</span> <strong>{bhRes.rotationDepth.toFixed(2)} m</strong></p>
                                    <p className="flex items-center gap-1 text-orange-500 text-xs mt-2 mt-4 bg-orange-50 p-2 rounded">
                                        <Info className="w-3 h-3" /> {t(bhRes.warnings[0])}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Percent Diff Alert */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-700">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                                <span>{t('Capacity Difference between methods')}</span>
                            </div>
                            <span className="font-bold text-slate-800">{percentDiff.toFixed(1)}%</span>
                        </div>

                        {/* Chart */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-2">{t('Brinch Hansen Soil Reaction vs Depth')}</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        layout="vertical"
                                        data={bhRes.reactions}
                                        margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" dataKey="reaction" name="Soil Reaction (kN/m)" label={{ value: 'Reaction (kN/m)', position: 'insideBottom', offset: -10 }} />
                                        <YAxis dataKey="depth" type="number" reversed name="Depth (m)" label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', offset: -10 }} />
                                        <Tooltip formatter={(value: number) => value.toFixed(2)} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Line type="monotone" dataKey="reaction" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 8 }} name="Lateral Reaction P_ult" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <EngineeringInsight
                            classification={classification}
                            bromsRes={bromsRes}
                            bhRes={bhRes}
                            percentDiff={percentDiff}
                        />

                    </div>
                )}

                {activeTab === 'soil' && (
                    <div className="h-full animate-in fade-in duration-300">
                        <SoilProfile />
                    </div>
                )}

                {activeTab === 'pile' && (
                    <div className="h-full animate-in fade-in duration-300">
                        <PileSection results={results} />
                    </div>
                )}

                {activeTab === 'diagrams' && (
                    <div className="h-full animate-in fade-in duration-300">
                        <Diagrams results={results} />
                    </div>
                )}

                {activeTab === 'sensitivity' && (
                    <div className="h-full animate-in fade-in duration-300">
                        <SensitivityAnalysis overrides={overrides} setOverrides={setOverrides} baseProject={activeProject} currentResults={results} />
                    </div>
                )}

                {activeTab === '3d' && (
                    <div className="h-full animate-in fade-in duration-300">
                        <Pile3DView />
                    </div>
                )}
            </div>
        </div>
    );
}
