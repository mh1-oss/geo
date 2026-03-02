import { useState } from 'react';
import { useProject } from '../store/ProjectContext';
import type { SoilLayer } from '../lib/storage';

const SOIL_COLORS: Record<string, string> = {
    clay: '#5A8A5A', sand: '#D4A76A', silt: '#7A6B5D', gravel: '#8B7355', rock: '#6B6B6B'
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
        <main className="flex flex-1 overflow-hidden h-full">
            {/* Left Column: Layer Builder */}
            <div className="flex flex-col w-[60%] border-r border-[#223649] bg-background-dark min-w-[500px]">
                <div className="p-6 border-b border-[#223649] bg-[#182634]/50 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-[#94a3b8] mb-1">
                            <span>{activeProject?.name || 'Project'}</span>
                            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            <span className="text-primary">Soil Profile</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Soil Stratigraphy Editor</h1>
                    </div>
                </div>
                {/* Controls */}
                <div className="p-4 flex justify-between items-center bg-background-dark">
                    <h3 className="text-lg font-semibold text-white">Layer Builder</h3>
                    <button onClick={addLayer} className="flex items-center justify-center rounded-lg h-8 px-3 bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium border border-primary/20">
                        <span className="material-symbols-outlined text-[18px] mr-1">add</span>
                        Add Layer
                    </button>
                </div>
                {/* Table */}
                <div className="flex-1 overflow-auto px-4 pb-4">
                    <div className="rounded-xl border border-[#223649] bg-[#182634] overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#182634] border-b border-[#223649]">
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider w-[40px]">#</th>
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Layer Name</th>
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Type</th>
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider text-right">Thickness (m)</th>
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider text-right">γ (kN/m³)</th>
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider text-right">cu / φ</th>
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider text-right">SPT-N</th>
                                    <th className="p-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {layers.map((layer, i) => (
                                    <tr
                                        key={layer.id}
                                        className={`border-b border-[#223649] cursor-pointer transition-colors ${selectedId === layer.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-[#1e3045]'}`}
                                        onClick={() => setSelectedId(layer.id)}
                                    >
                                        <td className="p-3 text-sm text-[#94a3b8]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: layer.color }}></div>
                                                {i + 1}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                className="bg-transparent text-white text-sm w-full outline-none focus:bg-[#101a23] rounded px-1"
                                                value={layer.name}
                                                onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select
                                                className="bg-transparent text-slate-300 text-sm outline-none cursor-pointer"
                                                value={layer.type}
                                                onChange={(e) => updateLayer(layer.id, { type: e.target.value as SoilLayer['type'], color: SOIL_COLORS[e.target.value] || '#888' })}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="clay">Clay</option>
                                                <option value="sand">Sand</option>
                                                <option value="silt">Silt</option>
                                                <option value="gravel">Gravel</option>
                                                <option value="rock">Rock</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-right">
                                            <input className="bg-transparent text-white text-sm text-right w-16 outline-none focus:bg-[#101a23] rounded px-1 font-mono" type="number" step="0.5" value={layer.thickness}
                                                onChange={(e) => updateLayer(layer.id, { thickness: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} />
                                        </td>
                                        <td className="p-3 text-right">
                                            <input className="bg-transparent text-white text-sm text-right w-14 outline-none focus:bg-[#101a23] rounded px-1 font-mono" type="number" step="0.5" value={layer.unitWeight}
                                                onChange={(e) => updateLayer(layer.id, { unitWeight: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} />
                                        </td>
                                        <td className="p-3 text-right text-sm font-mono text-slate-300">
                                            {(layer.type === 'clay' || layer.type === 'silt') ? `${layer.cu || 0} kPa` : `${layer.phi || 0}°`}
                                        </td>
                                        <td className="p-3 text-right">
                                            <input className="bg-transparent text-white text-sm text-right w-12 outline-none focus:bg-[#101a23] rounded px-1 font-mono" type="number" value={layer.spt || 0}
                                                onChange={(e) => updateLayer(layer.id, { spt: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} />
                                        </td>
                                        <td className="p-3">
                                            <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} className="text-slate-500 hover:text-red-400 transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {layers.length === 0 && (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-500 text-sm">No layers defined. Click "Add Layer" to start.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Summary */}
                    <div className="mt-4 flex gap-4 text-xs text-slate-400">
                        <span>Total Depth: <span className="text-white font-bold">{totalDepth.toFixed(1)} m</span></span>
                        <span>Layers: <span className="text-white font-bold">{layers.length}</span></span>
                    </div>
                </div>
            </div>

            {/* Right Column: Properties + Visualization */}
            <div className="flex-1 flex flex-col bg-[#182634] overflow-hidden">
                {/* Selected Layer Properties */}
                {selectedLayer ? (
                    <div className="p-6 border-b border-[#223649] bg-[#1c2f42]">
                        <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedLayer.color }}></div>
                            {selectedLayer.name} — Properties
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {(selectedLayer.type === 'clay' || selectedLayer.type === 'silt') ? (
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Undrained Shear Strength (kPa)</span>
                                    <input className="bg-[#101a23] border border-[#223649] rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                                        type="number" value={selectedLayer.cu || 0}
                                        onChange={(e) => updateSelectedField('cu', Number(e.target.value))} />
                                </label>
                            ) : (
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Friction Angle (°)</span>
                                    <input className="bg-[#101a23] border border-[#223649] rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                                        type="number" value={selectedLayer.phi || 0}
                                        onChange={(e) => updateSelectedField('phi', Number(e.target.value))} />
                                </label>
                            )}
                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Unit Weight (kN/m³)</span>
                                <input className="bg-[#101a23] border border-[#223649] rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                                    type="number" step="0.5" value={selectedLayer.unitWeight}
                                    onChange={(e) => updateSelectedField('unitWeight', Number(e.target.value))} />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 border-b border-[#223649] bg-[#1c2f42] text-center text-slate-500 text-sm">
                        Select a layer to edit its properties
                    </div>
                )}

                {/* Stratigraphy Visualization */}
                <div className="flex-1 p-6 flex flex-col overflow-hidden">
                    <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Stratigraphy Profile</h3>
                    <div className="flex-1 relative bg-[#101a23] rounded-xl border border-[#223649] overflow-hidden flex">
                        {/* Depth scale */}
                        <div className="w-12 flex flex-col justify-between py-4 px-2 text-[10px] text-[#94a3b8] border-r border-[#223649] text-right">
                            <span>0 m</span>
                            {totalDepth > 0 && <span>{(totalDepth / 2).toFixed(1)} m</span>}
                            <span>{totalDepth.toFixed(1)} m</span>
                        </div>
                        {/* Soil Column */}
                        <div className="flex-1 flex flex-col">
                            {layers.map((layer) => {
                                const pct = totalDepth > 0 ? (layer.thickness / totalDepth) * 100 : 0;
                                return (
                                    <div
                                        key={layer.id}
                                        className={`relative flex items-center px-4 border-b border-slate-600/30 cursor-pointer transition-all ${selectedId === layer.id ? 'ring-2 ring-primary ring-inset' : 'hover:brightness-110'}`}
                                        style={{ height: `${Math.max(pct, 8)}%`, backgroundColor: layer.color + '80' }}
                                        onClick={() => setSelectedId(layer.id)}
                                    >
                                        <div className="flex items-center gap-3 z-10">
                                            <span className="text-white text-xs font-bold drop-shadow">{layer.name}</span>
                                            <span className="text-white/60 text-[10px] font-mono">{layer.thickness}m</span>
                                        </div>
                                        {/* Pattern overlay */}
                                        {(layer.type === 'sand' || layer.type === 'gravel') && (
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                                        )}
                                    </div>
                                );
                            })}
                            {layers.length === 0 && (
                                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">layers</span>
                                        Add layers to visualize
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* SPT Bar Chart */}
                        <div className="w-24 flex flex-col border-l border-[#223649]">
                            <div className="text-center text-[10px] text-[#94a3b8] py-1 border-b border-[#223649] bg-[#182634]">SPT-N</div>
                            {layers.map((layer) => {
                                const pct = totalDepth > 0 ? (layer.thickness / totalDepth) * 100 : 0;
                                const sptWidth = Math.min((layer.spt || 0) / 50 * 100, 100);
                                return (
                                    <div key={layer.id} className="flex items-center px-2" style={{ height: `${Math.max(pct, 8)}%` }}>
                                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${sptWidth}%` }}></div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 ml-1 min-w-[20px]">{layer.spt || 0}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
