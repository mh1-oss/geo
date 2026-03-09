import { useState } from 'react';
import { useProject } from '../store/ProjectContext';
import type { SoilLayer } from '../lib/storage';

const SOIL_COLORS: Record<string, string> = {
    clay: '#3b82f6', sand: '#f59e0b', silt: '#8b5cf6', gravel: '#10b981', rock: '#64748b'
};

const SOIL_GRADIENTS: Record<string, string> = {
    clay: 'from-blue-500/20 to-blue-600/20', 
    sand: 'from-amber-500/20 to-amber-600/20', 
    silt: 'from-purple-500/20 to-purple-600/20', 
    gravel: 'from-emerald-500/20 to-emerald-600/20', 
    rock: 'from-slate-500/20 to-slate-600/20'
};

export default function SoilStratigraphy() {
    const { activeProject, updateActiveProject } = useProject();
    const [layers, setLayers] = useState<SoilLayer[]>(activeProject?.soilLayers || []);
    const [selectedId, setSelectedId] = useState<string | null>(layers[0]?.id || null);

    const selectedLayer = layers.find(l => l.id === selectedId) || null;
    const totalDepth = layers.reduce((s, l) => s + l.thickness, 0);

    function updateLayers(newLayers: SoilLayer[]) {
        setLayers(newLayers);
        updateActiveProject({ soilLayers: newLayers });
    }

    function addLayer() {
        const newLayer: SoilLayer = {
            id: `l-${Date.now()}`, name: 'New Layer', type: 'clay',
            thickness: 3.0, unitWeight: 18.0, cu: 50, spt: 10,
            color: SOIL_COLORS.clay,
        };
        updateLayers([...layers, newLayer]);
        setSelectedId(newLayer.id);
    }

    function deleteLayer(id: string) {
        const filtered = layers.filter(l => l.id !== id);
        updateLayers(filtered);
        if (selectedId === id) setSelectedId(filtered[0]?.id || null);
    }

    function updateLayer(id: string, data: Partial<SoilLayer>) {
        updateLayers(layers.map(l => l.id === id ? { ...l, ...data } : l));
    }

    function updateSelectedField(field: keyof SoilLayer, value: any) {
        if (!selectedId) return;
        const data: Partial<SoilLayer> = { [field]: value };
        if (field === 'type') data.color = SOIL_COLORS[value as string] || '#888';
        updateLayer(selectedId, data);
    }

    return (
        <div className="flex flex-1 w-full h-full flex-col lg:flex-row relative">
            {/* Left Column: Layer Builder */}
            <aside className="w-full lg:w-[55%] xl:w-[60%] flex flex-col glass-panel flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-auto lg:h-full lg:overflow-visible">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined block text-[24px]">layers</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Soil Stratigraphy</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">{activeProject?.name || 'Unsaved Project'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-50/50 dark:bg-[#0b111a]/50">
                    {/* Controls */}
                    <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/40">
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <span>Layers: <span className="text-slate-900 dark:text-white font-black">{layers.length}</span></span>
                            <span>Total Depth: <span className="text-primary font-black">{totalDepth.toFixed(1)} m</span></span>
                        </div>
                        <button onClick={addLayer} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md hover:shadow-glow-primary hover:-translate-y-0.5 transition-all flex items-center gap-1.5 focus:ring-2 ring-primary/50 outline-none">
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Add Layer
                        </button>
                    </div>
                    {/* Table */}
                    <div className="flex-1 overflow-auto custom-scrollbar relative p-4">
                        <div className="glass-panel overflow-hidden border border-slate-200 dark:border-slate-800/60 rounded-xl shadow-sm">
                            <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                                <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 sticky top-0 z-10">
                                    <tr className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-4 py-3">Layer Name</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-right">Thickness (m)</th>
                                        <th className="px-4 py-3 text-right">γ (kN/m³)</th>
                                        <th className="px-4 py-3 text-right">cu / φ</th>
                                        <th className="px-4 py-3 text-right">SPT-N</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                    {layers.map((layer, i) => (
                                        <tr
                                            key={layer.id}
                                            className={`transition-colors group cursor-pointer ${selectedId === layer.id ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                                            onClick={() => setSelectedId(layer.id)}
                                        >
                                            <td className="px-4 py-2.5 text-center relative">
                                                {selectedId === layer.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"></div>}
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-3 h-3 rounded-sm shadow-sm opacity-80" style={{ backgroundColor: layer.color }}></div>
                                                    <span className="text-slate-400 font-bold font-mono text-xs">{i + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <input
                                                    className="bg-transparent text-slate-900 dark:text-white text-sm font-semibold w-full outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary/50"
                                                    value={layer.name}
                                                    onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <select
                                                    className="bg-transparent text-slate-700 dark:text-slate-300 text-sm font-medium outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary/50 appearance-none pr-8"
                                                    value={layer.type}
                                                    onChange={(e) => updateLayer(layer.id, { type: e.target.value as SoilLayer['type'], color: SOIL_COLORS[e.target.value] || '#888' })}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="clay" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Clay</option>
                                                    <option value="sand" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Sand</option>
                                                    <option value="silt" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Silt</option>
                                                    <option value="gravel" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Gravel</option>
                                                    <option value="rock" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Rock</option>
                                                </select>
                                                <span className="material-symbols-outlined absolute right-6 text-[18px] text-slate-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">expand_more</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <input className="bg-transparent text-slate-900 dark:text-white text-sm text-right w-20 outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 font-mono transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary/50" type="number" step="0.5" value={layer.thickness}
                                                    onChange={(e) => updateLayer(layer.id, { thickness: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <input className="bg-transparent text-slate-900 dark:text-white text-sm text-right w-16 outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 font-mono transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary/50" type="number" step="0.5" value={layer.unitWeight}
                                                    onChange={(e) => updateLayer(layer.id, { unitWeight: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} />
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-sm font-mono font-bold text-slate-500 dark:text-slate-400">
                                                {(layer.type === 'clay' || layer.type === 'silt') ? `${layer.cu || 0} kPa` : `${layer.phi || 0}°`}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <input className="bg-transparent text-slate-900 dark:text-white text-sm text-right w-16 outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 font-mono transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary/50" type="number" value={layer.spt || 0}
                                                    onChange={(e) => updateLayer(layer.id, { spt: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} />
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                    <span className="material-symbols-outlined block text-[18px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {layers.length === 0 && (
                                        <tr>
                                            <td colSpan={8}>
                                                <div className="py-16 flex flex-col items-center justify-center text-slate-400 group">
                                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                                        <span className="material-symbols-outlined text-[32px]">layers_clear</span>
                                                    </div>
                                                    <p className="text-sm font-semibold mb-2">No soil layers defined</p>
                                                    <button onClick={addLayer} className="text-xs font-bold text-primary hover:underline">Click to add your first layer</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Right Column: Properties + Visualization */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden z-10 relative bg-slate-50 dark:bg-[#0f161d]">
                
                {/* Selected Layer Properties */}
                <div className="p-4 lg:p-6 pb-0">
                    {selectedLayer ? (
                        <div className="glass-panel p-6 rounded-2xl border-l-4 shadow-sm animate-fade-in" style={{ borderLeftColor: selectedLayer.color }}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-slate-900 dark:text-white text-lg font-bold flex items-center gap-2">
                                    <div className="w-4 h-4 rounded shadow-sm opacity-80" style={{ backgroundColor: selectedLayer.color }}></div>
                                    {selectedLayer.name}
                                </h3>
                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border`} style={{ color: selectedLayer.color, backgroundColor: `${selectedLayer.color}15`, borderColor: `${selectedLayer.color}30` }}>
                                    {selectedLayer.type}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(selectedLayer.type === 'clay' || selectedLayer.type === 'silt') ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Undrained Strength</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">cu</span>
                                        </div>
                                        <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all hover:border-primary/30">
                                            <input className="w-full bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-2 outline-none"
                                                type="number" value={selectedLayer.cu || 0}
                                                onChange={(e) => updateSelectedField('cu', Number(e.target.value))} />
                                            <span className="text-xs font-bold text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">kPa</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Friction Angle</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">φ</span>
                                        </div>
                                        <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all hover:border-primary/30">
                                            <input className="w-full bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-2 outline-none"
                                                type="number" value={selectedLayer.phi || 0}
                                                onChange={(e) => updateSelectedField('phi', Number(e.target.value))} />
                                            <span className="text-xs font-bold text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">°</span>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Unit Weight</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">γ</span>
                                    </div>
                                    <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all hover:border-primary/30">
                                        <input className="w-full bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-2 outline-none"
                                            type="number" step="0.5" value={selectedLayer.unitWeight}
                                            onChange={(e) => updateSelectedField('unitWeight', Number(e.target.value))} />
                                        <span className="text-xs font-bold text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">kN/m³</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">SPT N-Value</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">N</span>
                                    </div>
                                    <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/30 rounded-lg overflow-hidden transition-all hover:border-primary/30">
                                        <input className="w-full bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white px-3 py-2 outline-none"
                                            type="number" value={selectedLayer.spt || 0}
                                            onChange={(e) => updateSelectedField('spt', Number(e.target.value))} />
                                        <span className="text-xs font-bold text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 select-none">blows</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">touch_app</span>
                            <span className="text-slate-500 font-medium">Select any layer from the table to edit its advanced properties</span>
                        </div>
                    )}
                </div>

                {/* Stratigraphy Visualization Container */}
                <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
                    <div className="glass-panel flex-1 rounded-2xl flex flex-col overflow-hidden shadow-sm animate-fade-in [animation-delay:100ms]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-white/50 dark:bg-slate-800/20">
                            <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">earthquake</span>
                                Subsurface Profile
                            </h3>
                            <button className="text-xs font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-widest px-2 py-1 rounded bg-primary/5 hover:bg-primary/10">Export Log</button>
                        </div>
                        
                        {/* Visualization Area */}
                        <div className="flex-1 flex overflow-hidden bg-white dark:bg-[#0f1722] relative p-6">
                            
                            {/* Depth scale */}
                            <div className="w-16 flex flex-col justify-between py-[1px] pr-4 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700/50 text-right z-10 shrink-0">
                                <span>0.0m</span>
                                {totalDepth > 0 && <span>{(totalDepth * 0.25).toFixed(1)}</span>}
                                {totalDepth > 0 && <span>{(totalDepth * 0.5).toFixed(1)}</span>}
                                {totalDepth > 0 && <span>{(totalDepth * 0.75).toFixed(1)}</span>}
                                <span>{totalDepth > 0 ? totalDepth.toFixed(1) + 'm' : ''}</span>
                            </div>
                            
                            {/* Soil Column */}
                            <div className="flex-1 flex flex-col max-w-sm mr-6 min-w-[200px]">
                                {layers.map((layer) => {
                                    const pct = totalDepth > 0 ? (layer.thickness / totalDepth) * 100 : 0;
                                    const gradientClass = SOIL_GRADIENTS[layer.type] || 'from-slate-500/20 to-slate-600/20';
                                    
                                    return (
                                        <div
                                            key={layer.id}
                                            className={`relative flex flex-col justify-center px-6 border-b border-slate-300 dark:border-slate-700/60 cursor-pointer overflow-hidden transition-all duration-300 group
                                                ${selectedId === layer.id ? 'ring-2 ring-primary ring-inset z-10 scale-[1.02] shadow-lg rounded-sm' : 'hover:saturate-150'}`}
                                            style={{ height: `${Math.max(pct, 8)}%` }}
                                            onClick={() => setSelectedId(layer.id)}
                                        >
                                            {/* Colored background with gradient component */}
                                            <div className="absolute inset-0 opacity-40 mix-blend-multiply dark:mix-blend-screen transition-opacity group-hover:opacity-50" style={{ backgroundColor: layer.color }}></div>
                                            <div className={`absolute inset-0 bg-gradient-to-b ${gradientClass} opacity-80`}></div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-slate-900 dark:text-white font-bold drop-shadow-md text-sm md:text-base tracking-tight">{layer.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold drop-shadow-md bg-white/40 dark:bg-black/40 px-1.5 py-0.5 rounded capitalize">{layer.type}</span>
                                                    <span className="text-slate-800 dark:text-slate-200 text-xs font-mono font-bold drop-shadow-md">T: {layer.thickness}m</span>
                                                </div>
                                            </div>

                                            {/* Texture overlays based on type */}
                                            {(layer.type === 'sand' || layer.type === 'gravel') && (
                                                <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.15] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '12px 12px', color: layer.type === 'gravel' ? '#000' : '#fff' }}></div>
                                            )}
                                            {layer.type === 'clay' && (
                                                <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)', color: '#000' }}></div>
                                            )}
                                        </div>
                                    );
                                })}
                                {layers.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-4">
                                        <div className="text-center">
                                            <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">layers</span>
                                            <span className="font-semibold text-sm">Add layers to visualize</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* SPT Bar Chart */}
                            <div className="flex-1 max-w-[200px] flex flex-col pt-0 pl-6 border-l border-slate-200 dark:border-slate-800/60 hidden sm:flex">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-[-20px]">SPT N-Value</div>
                                
                                <div className="flex-1 relative flex flex-col">
                                    {/* Grid lines */}
                                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                                        <div className="w-px h-full bg-slate-400"></div>
                                        <div className="w-px h-full bg-slate-400 border-r border-dashed border-slate-400"></div>
                                        <div className="w-px h-full bg-slate-400 border-r border-dashed border-slate-400"></div>
                                        <div className="w-px h-full bg-slate-400 border-r border-dashed border-slate-400"></div>
                                        <div className="w-px h-full bg-slate-400"></div>
                                    </div>
                                    
                                    {layers.map((layer) => {
                                        const pct = totalDepth > 0 ? (layer.thickness / totalDepth) * 100 : 0;
                                        // Assume N=50 is roughly full width
                                        const sptWidth = Math.min((layer.spt || 0) / 50 * 100, 100);
                                        return (
                                            <div key={`spt-${layer.id}`} className="relative flex items-center z-10" style={{ height: `${Math.max(pct, 8)}%` }}>
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-r-sm overflow-hidden flex items-center justify-end group transition-all" style={{ width: `${sptWidth}%`, minWidth: '4px' }}>
                                                    <div className={`h-full w-full opacity-80 group-hover:opacity-100 transition-all shadow-sm ${selectedId === layer.id ? 'bg-primary' : 'bg-slate-400 dark:bg-slate-500'}`}></div>
                                                </div>
                                                <span className={`text-[10px] font-bold font-mono ml-2 transition-colors ${selectedId === layer.id ? 'text-primary' : 'text-slate-400'}`}>
                                                    {layer.spt || 0}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Axis Labels */}
                                    <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[9px] font-mono text-slate-400">
                                        <span>0</span>
                                        <span>25</span>
                                        <span>50+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
