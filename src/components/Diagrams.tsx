import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLanguage } from '../store/LanguageContext';
import { useProject } from '../store/ProjectContext';

export function Diagrams({ results }: { results: any }) {
    const { t } = useLanguage();
    const { activeProject } = useProject();

    if (!results || !results.bhRes || !results.bhRes.reactions) return null;

    const data = results.bhRes.reactions;

    // Find absolute maximums to provide good scale references if needed, 
    // though Recharts auto-scales pretty well.
    const maxMomentIndex = data.reduce((maxIdx: number, item: any, idx: number) => Math.abs(item.moment) > Math.abs(data[maxIdx].moment) ? idx : maxIdx, 0);
    const maxMomentDepth = data[maxMomentIndex].depth;

    const maxShearIndex = data.reduce((maxIdx: number, item: any, idx: number) => Math.abs(item.shear) > Math.abs(data[maxIdx].shear) ? idx : maxIdx, 0);
    const maxShearDepth = data[maxShearIndex].depth;

    return (
        <div className="flex flex-col gap-6 h-full pb-6">

            {/* Moment Diagram */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 min-h-[400px]">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{t('Bending Moment Diagram')}</h3>
                    <div className="text-sm px-3 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                        {t('Max M:')} <span className="font-bold">{Math.abs(data[maxMomentIndex].moment).toFixed(1)} kN.m</span> @ {maxMomentDepth.toFixed(2)}m
                    </div>
                </div>
                <div className="h-[calc(100%-60px)] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            layout="vertical"
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                                type="number"
                                dataKey="moment"
                                name="Moment (kN.m)"
                                label={{ value: t('Moment (kN.m)'), position: 'insideBottom', offset: -10 }}
                                domain={['dataMin', 'dataMax']}
                            />
                            <YAxis
                                dataKey="depth"
                                type="number"
                                reversed
                                name="Depth (m)"
                                label={{ value: t('Depth (m)'), angle: -90, position: 'insideLeft', offset: -10 }}
                                domain={[0, activeProject?.pile.length || 'dataMax']}
                            />
                            <Tooltip formatter={(value: number) => [value.toFixed(2), t('Moment (kN.m)')]} />
                            <Legend verticalAlign="top" height={36} />
                            <ReferenceLine x={0} stroke="#94a3b8" />
                            <ReferenceLine y={maxMomentDepth} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'right', value: 'M_max', fill: '#f59e0b' }} />
                            <Line type="monotone" dataKey="moment" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={t('Bending Moment')} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Shear Diagram */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 min-h-[400px]">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{t('Shear Force Diagram')}</h3>
                    <div className="text-sm px-3 py-1 bg-rose-50 text-rose-700 rounded-md border border-rose-200">
                        {t('Max V:')} <span className="font-bold">{Math.abs(data[maxShearIndex].shear).toFixed(1)} kN</span> @ {maxShearDepth.toFixed(2)}m
                    </div>
                </div>
                <div className="h-[calc(100%-60px)] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            layout="vertical"
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                                type="number"
                                dataKey="shear"
                                name="Shear (kN)"
                                label={{ value: t('Shear (kN)'), position: 'insideBottom', offset: -10 }}
                                domain={['dataMin', 'dataMax']}
                            />
                            <YAxis
                                dataKey="depth"
                                type="number"
                                reversed
                                name="Depth (m)"
                                label={{ value: t('Depth (m)'), angle: -90, position: 'insideLeft', offset: -10 }}
                                domain={[0, activeProject?.pile.length || 'dataMax']}
                            />
                            <Tooltip formatter={(value: number) => [value.toFixed(2), t('Shear Force (kN)')]} />
                            <Legend verticalAlign="top" height={36} />
                            <ReferenceLine x={0} stroke="#94a3b8" />
                            <Line type="stepAfter" dataKey="shear" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={t('Shear Force')} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Soil Reaction Diagram */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 min-h-[400px]">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{t('Soil Reaction vs Depth')}</h3>
                </div>
                <div className="h-[calc(100%-60px)] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            layout="vertical"
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                                type="number"
                                dataKey="reaction"
                                name="Reaction (kN/m)"
                                label={{ value: t('Reaction (kN/m)'), position: 'insideBottom', offset: -10 }}
                                domain={['dataMin', 'dataMax']}
                            />
                            <YAxis
                                dataKey="depth"
                                type="number"
                                reversed
                                name="Depth (m)"
                                label={{ value: t('Depth (m)'), angle: -90, position: 'insideLeft', offset: -10 }}
                                domain={[0, activeProject?.pile.length || 'dataMax']}
                            />
                            <Tooltip formatter={(value: number) => [value.toFixed(2), t('Soil Reaction (kN/m)')]} />
                            <Legend verticalAlign="top" height={36} />
                            <ReferenceLine x={0} stroke="#94a3b8" />
                            <Line type="monotone" dataKey="reaction" stroke="#3b82f6" strokeWidth={3} fill="#93c5fd" fillOpacity={0.3} dot={false} activeDot={{ r: 6 }} name={t('Lateral Resistance')} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
