import { useState, useMemo } from 'react';
import { useLanguage } from '../store/LanguageContext';
import { calculateBroms } from '../lib/calc/broms';
import { calculateBrinchHansen } from '../lib/calc/brinchHansen';
import { computeEI, computeYieldMoment, classifyPile } from '../lib/calc/classification';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { RefreshCw, Play } from 'lucide-react';

export function SensitivityAnalysis({ overrides, setOverrides, baseProject, currentResults }: any) {
    const { t } = useLanguage();

    // The active parameters including any overrides
    const soil = { ...baseProject.soil, ...overrides };
    const pile = { ...baseProject.pile, ...overrides };
    const load = { ...baseProject.load, ...overrides };

    const [sweepParam, setSweepParam] = useState<'cu' | 'phi' | 'length' | 'diameter'>('length');

    // Generate data for the mini-chart by sweeping the selected parameter
    const chartData = useMemo(() => {
        const data = [];
        let min = 0;
        let max = 100;
        let steps = 20;

        if (sweepParam === 'cu') { min = 10; max = 300; }
        if (sweepParam === 'phi') { min = 20; max = 45; }
        if (sweepParam === 'length') { min = Math.max(load.e + 1, 3); max = 50; }
        if (sweepParam === 'diameter') { min = 0.3; max = 3.0; }

        const stepSize = (max - min) / steps;

        for (let i = 0; i <= steps; i++) {
            const val = min + i * stepSize;

            // Temporary objects for calculation
            const tempSoil = { ...soil };
            const tempPile = { ...pile };

            if (sweepParam === 'cu') tempSoil.cu = val;
            if (sweepParam === 'phi') tempSoil.phi = val;
            if (sweepParam === 'length') tempPile.length = val;
            if (sweepParam === 'diameter') tempPile.diameter = val;

            try {
                const EI = computeEI(tempPile.diameter, tempPile.youngsModulus, tempPile.wallThickness);
                const My = computeYieldMoment(tempPile.diameter, tempPile.yieldStrength, tempPile.wallThickness);
                const modulusParam = tempSoil.modulusType === 'constant' ? (tempSoil.k || 1) : (tempSoil.nh || 1);
                const classif = classifyPile(tempPile.length, EI, tempSoil.modulusType, modulusParam);

                const bromsHu = calculateBroms({
                    soilType: tempSoil.type,
                    pileCondition: classif.classification,
                    headCondition: 'free',
                    L: tempPile.length,
                    D: tempPile.diameter,
                    yieldMoment: My,
                    e: load.e,
                    cu: tempSoil.cu,
                    gamma: tempSoil.gamma,
                    phi: tempSoil.phi,
                }).Hu;

                const bhHu = calculateBrinchHansen({
                    soilType: tempSoil.type,
                    L: tempPile.length,
                    D: tempPile.diameter,
                    e: load.e,
                    slices: 15, // faster slices for sweep
                    gamma: tempSoil.gamma,
                    cu: tempSoil.cu,
                    phi: tempSoil.phi,
                }).Hu;

                const minHu = Math.min(bromsHu, bhHu);
                data.push({
                    paramValue: val,
                    Hu: minHu
                });
                // eslint-disable-next-line no-empty
            } catch (e) {
                // Ignore calc errors for extreme bounds
            }
        }
        return data;
    }, [sweepParam, soil, pile, load]);

    const handleOverride = (key: string, val: number) => {
        setOverrides((prev: any) => ({ ...prev, [key]: val }));
    };

    const resetOverrides = () => setOverrides({});

    const currentHu = Math.min(currentResults.bromsRes.Hu, currentResults.bhRes.Hu);

    // Recompute base Hu without overrides for % comparison
    const baseHu = useMemo(() => {
        try {
            const tempSoil = baseProject.soil;
            const tempPile = baseProject.pile;
            const EI = computeEI(tempPile.diameter, tempPile.youngsModulus, tempPile.wallThickness);
            const My = computeYieldMoment(tempPile.diameter, tempPile.yieldStrength, tempPile.wallThickness);
            const classif = classifyPile(tempPile.length, EI, tempSoil.modulusType, tempSoil.modulusType === 'constant' ? tempSoil.k : tempSoil.nh);

            const bromsHu = calculateBroms({ soilType: tempSoil.type, pileCondition: classif.classification, headCondition: 'free', L: tempPile.length, D: tempPile.diameter, yieldMoment: My, e: baseProject.load.e, cu: tempSoil.cu, gamma: tempSoil.gamma, phi: tempSoil.phi }).Hu;
            const bhHu = calculateBrinchHansen({ soilType: tempSoil.type, L: tempPile.length, D: tempPile.diameter, e: baseProject.load.e, slices: 20, gamma: tempSoil.gamma, cu: tempSoil.cu, phi: tempSoil.phi }).Hu;

            return Math.min(bromsHu, bhHu);
        } catch { return currentHu; }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseProject]);

    const percentChange = ((currentHu - baseHu) / baseHu) * 100;

    // Which property holds the "current value" of the sweepParam?
    let currentValueForReferenceLine = 0;
    if (sweepParam === 'cu') currentValueForReferenceLine = soil.cu;
    else if (sweepParam === 'phi') currentValueForReferenceLine = soil.phi;
    else if (sweepParam === 'length') currentValueForReferenceLine = pile.length;
    else if (sweepParam === 'diameter') currentValueForReferenceLine = pile.diameter;

    return (
        <div className="flex flex-col gap-6 h-full pb-6">

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">{t('Real-Time Sensitivity')}</h3>
                        <p className="text-sm text-slate-500 mt-1">{t('Adjust parameters to see live effects on pile capacity')}</p>
                    </div>
                    <button
                        onClick={resetOverrides}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm transition-colors border border-slate-200"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {t('Reset Overrides')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Sliders */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-sm font-medium text-slate-700">{t('Pile Length (m)')}</label>
                                <span className="text-sm font-bold text-blue-600">{pile.length.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min={Math.max(3, load.e + 1)} max={50} step={0.5}
                                value={pile.length}
                                onChange={(e) => handleOverride('length', parseFloat(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-sm font-medium text-slate-700">{t('Pile Diameter (m)')}</label>
                                <span className="text-sm font-bold text-blue-600">{pile.diameter.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min={0.3} max={3.0} step={0.05}
                                value={pile.diameter}
                                onChange={(e) => handleOverride('diameter', parseFloat(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>

                        {baseProject.soil.type === 'clay' ? (
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-sm font-medium text-slate-700">{t('Undrained Shear Strength S_u (kPa)')}</label>
                                    <span className="text-sm font-bold text-blue-600">{soil.cu.toFixed(0)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={10} max={300} step={5}
                                    value={soil.cu}
                                    onChange={(e) => handleOverride('cu', parseFloat(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-sm font-medium text-slate-700">{t('Friction Angle φ (°)')}</label>
                                    <span className="text-sm font-bold text-blue-600">{soil.phi.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={20} max={45} step={1}
                                    value={soil.phi}
                                    onChange={(e) => handleOverride('phi', parseFloat(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                            </div>
                        )}
                    </div>

                    {/* Live Result Impact */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex flex-col justify-center items-center text-center">
                        <p className="text-slate-500 font-medium mb-2 uppercase tracking-wide text-xs">{t('Live Ultimate Capacity (Hu)')}</p>
                        <div className="text-5xl font-black text-slate-800 mb-4 tracking-tight">
                            {currentHu.toFixed(1)} <span className="text-2xl text-slate-400 font-medium tracking-normal">kN</span>
                        </div>

                        {Object.keys(overrides).length > 0 ? (
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${percentChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}% {t('from base')}
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200 text-slate-600">
                                {t('Base Model Active')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Parameter Sweep Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 min-h-[350px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Play className="w-5 h-5 text-indigo-500" />
                        {t('Sweep Analysis')}
                    </h3>

                    <div className="flex items-center gap-3">
                        <label className="text-sm text-slate-500">{t('Sweep Parameter:')}</label>
                        <select
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block p-2"
                            value={sweepParam}
                            onChange={(e) => setSweepParam(e.target.value as any)}
                        >
                            <option value="length">{t('Pile Length')}</option>
                            <option value="diameter">{t('Pile Diameter')}</option>
                            {baseProject.soil.type === 'clay' ? (
                                <option value="cu">{t('Undrained Strength')}</option>
                            ) : (
                                <option value="phi">{t('Friction Angle')}</option>
                            )}
                        </select>
                    </div>
                </div>

                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                type="number"
                                dataKey="paramValue"
                                name={sweepParam.toUpperCase()}
                                domain={['dataMin', 'dataMax']}
                                label={{ value: sweepParam.toUpperCase(), position: 'insideBottom', offset: -10 }}
                            />
                            <YAxis
                                dataKey="Hu"
                                name="Capacity (kN)"
                                label={{ value: 'Ultimate Capacity (kN)', angle: -90, position: 'insideLeft', offset: -10 }}
                            />
                            <Tooltip formatter={(value: number) => [value.toFixed(1), 'Hu (kN)']} />
                            <ReferenceLine x={currentValueForReferenceLine} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Current', fill: '#ef4444' }} />
                            <Line type="monotone" dataKey="Hu" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
