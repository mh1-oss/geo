import { useProject } from '../store/ProjectContext';
import { useLanguage } from '../store/LanguageContext';

export function SoilProfile() {
    const { activeProject } = useProject();
    const { t } = useLanguage();

    if (!activeProject) return null;

    const { soil, pile } = activeProject;

    // SVG scaling constants
    const viewBoxWidth = 500;
    const viewBoxHeight = 600;
    const margin = 40;

    const drawHeight = viewBoxHeight - 2 * margin;
    const drawWidth = viewBoxWidth - 2 * margin;

    // Total depth to show: Pile length + 20%
    const totalDepth = pile.length * 1.2;
    const scaleY = drawHeight / totalDepth;

    // Soil block dimensions
    const groundLevelY = margin;
    const bottomLevelY = margin + drawHeight;
    const soilRectWidth = drawWidth * 0.7;
    const soilX = margin + (drawWidth - soilRectWidth) / 2;

    const isClay = soil.type === 'clay';
    const fillStyle = isClay
        ? "url(#clayPattern)"
        : "url(#sandPattern)";

    const bgColor = isClay ? "#e8e1d7" : "#f1e5c3";

    return (
        <div className="w-full h-full flex items-center justify-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full max-h-[600px] drop-shadow-sm">
                <defs>
                    <pattern id="clayPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 0,10 L 20,10" stroke="#d5ccbb" strokeWidth="1" strokeDasharray="5,5" />
                    </pattern>
                    <pattern id="sandPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="#d9cdad" />
                        <circle cx="8" cy="7" r="1" fill="#d9cdad" />
                    </pattern>
                </defs>

                {/* Ground Line */}
                <line x1={margin - 20} y1={groundLevelY} x2={viewBoxWidth - margin + 20} y2={groundLevelY} stroke="#857158" strokeWidth="3" />
                <path d={`M ${margin - 20},${groundLevelY} L ${margin},${groundLevelY + 10} L ${margin + 20},${groundLevelY}`} stroke="#857158" strokeWidth="2" fill="none" />

                {/* Soil Block */}
                <rect
                    x={soilX}
                    y={groundLevelY}
                    width={soilRectWidth}
                    height={drawHeight}
                    fill={bgColor}
                    stroke="#857158"
                    strokeWidth="2"
                    rx="4"
                />

                {/* Soil Pattern Overlay */}
                <rect
                    x={soilX}
                    y={groundLevelY}
                    width={soilRectWidth}
                    height={drawHeight}
                    fill={fillStyle}
                    className="mix-blend-multiply opacity-50"
                    rx="4"
                />

                {/* Depth Axis (Left) */}
                <line x1={margin} y1={groundLevelY} x2={margin} y2={bottomLevelY} stroke="#64748b" strokeWidth="2" />
                {Array.from({ length: 6 }).map((_, i) => {
                    const depth = (totalDepth / 5) * i;
                    const y = groundLevelY + depth * scaleY;
                    return (
                        <g key={i}>
                            <line x1={margin - 5} y1={y} x2={margin + 5} y2={y} stroke="#64748b" strokeWidth="2" />
                            <text x={margin - 10} y={y + 4} fill="#64748b" fontSize="14" fontWeight="600" textAnchor="end">
                                -{depth.toFixed(1)}m
                            </text>
                        </g>
                    );
                })}

                {/* Pile Extent Line (Right) */}
                <line
                    x1={soilX + soilRectWidth + 20}
                    y1={groundLevelY}
                    x2={soilX + soilRectWidth + 20}
                    y2={groundLevelY + pile.length * scaleY}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                />
                <path d={`M ${soilX + soilRectWidth + 15} ${groundLevelY} L ${soilX + soilRectWidth + 25} ${groundLevelY}`} stroke="#3b82f6" strokeWidth="2" />
                <path d={`M ${soilX + soilRectWidth + 15} ${groundLevelY + pile.length * scaleY} L ${soilX + soilRectWidth + 25} ${groundLevelY + pile.length * scaleY}`} stroke="#3b82f6" strokeWidth="2" />

                <text
                    x={soilX + soilRectWidth + 35}
                    y={groundLevelY + (pile.length * scaleY) / 2}
                    fill="#3b82f6"
                    fontSize="14"
                    fontWeight="bold"
                    transform={`rotate(90 ${soilX + soilRectWidth + 35} ${groundLevelY + (pile.length * scaleY) / 2})`}
                    textAnchor="middle"
                >
                    Pile Embedment ({pile.length} m)
                </text>

                {/* Soil Properties Label */}
                <g transform={`translate(${soilX + soilRectWidth / 2}, ${groundLevelY + drawHeight / 2})`}>
                    <rect x="-80" y="-40" width="160" height="80" fill="white" fillOpacity="0.9" rx="8" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="0" y="-15" fill="#334155" fontSize="18" fontWeight="bold" textAnchor="middle" className="capitalize">
                        {t('Homogeneous')} {t(soil.type)}
                    </text>
                    <text x="0" y="10" fill="#64748b" fontSize="14" textAnchor="middle">
                        γ = {soil.gamma} kN/m³
                    </text>
                    <text x="0" y="30" fill="#64748b" fontSize="14" fontStyle="italic" textAnchor="middle">
                        {isClay ? `Cᵤ = ${soil.cu} kPa` : `φ = ${soil.phi}°`}
                    </text>
                </g>

            </svg>

            <div className="absolute top-6 left-6 bg-white/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700">
                {t('Idealized Soil Profile')}
            </div>
        </div>
    );
}
