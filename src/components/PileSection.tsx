import { useProject } from '../store/ProjectContext';
import { useLanguage } from '../store/LanguageContext';
import { motion } from 'framer-motion';

export function PileSection({ results }: { results: any }) {
    const { activeProject } = useProject();
    const { t } = useLanguage();

    if (!activeProject || !results) return null;

    const { pile, load } = activeProject;

    // Extents
    const groundClearance = Math.max(load.e + 2, 5); // display space above ground
    const totalViewDepth = pile.length + groundClearance + 2;

    const viewBoxWidth = 600;
    const viewBoxHeight = 700;
    const margin = 50;

    // Scale mapping real meters to SVG units
    const scale = (viewBoxHeight - 2 * margin) / totalViewDepth;

    const groundY = margin + groundClearance * scale;
    const pileTopY = groundY - load.e * scale;
    const pileBottomY = groundY + pile.length * scale;

    const pileCenterX = viewBoxWidth / 2;

    // In CSS width/diameter just pick a visual constant ratio, e.g., 40px base pile width 
    const svgPileWidth = 40;

    // Derived engineering metrics
    const critDepthY = groundY + results.bromsRes.criticalDepth * scale;
    const rotDepthY = groundY + results.bhRes.rotationDepth * scale;

    return (
        <div className="w-full h-full flex items-center justify-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full max-h-[600px] drop-shadow-sm">

                {/* Background Sky & Ground */}
                <rect x="0" y="0" width={viewBoxWidth} height={groundY} fill="#f0f9ff" />
                <rect x="0" y={groundY} width={viewBoxWidth} height={viewBoxHeight - groundY} fill="#faf8f5" />
                <line x1="0" y1={groundY} x2={viewBoxWidth} y2={groundY} stroke="#857158" strokeWidth="3" />

                {/* Ground text */}
                <text x="20" y={groundY - 10} fill="#64748b" fontSize="14" fontWeight="bold">Ground Level (0.00m)</text>

                {/* Pile */}
                {/* Pile body */}
                <rect
                    x={pileCenterX - svgPileWidth / 2}
                    y={pileTopY}
                    width={svgPileWidth}
                    height={pileBottomY - pileTopY}
                    fill="#94a3b8"
                    stroke="#475569"
                    strokeWidth="2"
                    rx="4"
                />

                {/* Elevation marks */}
                {/* Pile top */}
                <line x1={pileCenterX + svgPileWidth} y1={pileTopY} x2={pileCenterX + svgPileWidth + 80} y2={pileTopY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                <text x={pileCenterX + svgPileWidth + 85} y={pileTopY + 4} fill="#64748b" fontSize="12">+{load.e.toFixed(2)}m</text>

                {/* Load Arrow (Animated) */}
                <g transform={`translate(${pileCenterX - svgPileWidth / 2 - 100}, ${pileTopY})`}>
                    <motion.path
                        d="M0,0 L80,0 L70,-10 M80,0 L70,10"
                        stroke="#ef4444"
                        strokeWidth="4"
                        fill="none"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                    />
                    <text x="30" y="-15" fill="#ef4444" fontSize="16" fontWeight="bold">H_u</text>
                </g>

                {/* Free length 'e' dimension line */}
                {load.e > 0 && (
                    <g transform={`translate(${pileCenterX - svgPileWidth / 2 - 40}, 0)`}>
                        <line x1="0" y1={pileTopY} x2="0" y2={groundY} stroke="#64748b" strokeWidth="1" />
                        <line x1="-5" y1={pileTopY} x2="5" y2={pileTopY} stroke="#64748b" strokeWidth="1" />
                        <line x1="-5" y1={groundY} x2="5" y2={groundY} stroke="#64748b" strokeWidth="1" />
                        <text x="-10" y={pileTopY + (groundY - pileTopY) / 2 + 5} fill="#64748b" fontSize="14" textAnchor="end" fontStyle="italic">e = {load.e}m</text>
                    </g>
                )}

                {/* Critical Depth (Max Moment) marker */}
                <line x1={pileCenterX - 100} y1={critDepthY} x2={pileCenterX + 150} y2={critDepthY} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" />
                <circle cx={pileCenterX} cy={critDepthY} r="6" fill="#f59e0b" />
                <text x={pileCenterX + 160} y={critDepthY + 5} fill="#b45309" fontSize="13" fontWeight="bold">
                    M_max ({results.bromsRes.criticalDepth.toFixed(2)}m)
                </text>

                {/* Point of Rotation marker (Brinch Hansen) */}
                <line x1={pileCenterX - 150} y1={rotDepthY} x2={pileCenterX + 100} y2={rotDepthY} stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4,4" />
                <circle cx={pileCenterX} cy={rotDepthY} r="6" fill="#8b5cf6" />
                <text x={pileCenterX - 160} y={rotDepthY + 5} fill="#6d28d9" fontSize="13" fontWeight="bold" textAnchor="end">
                    Rotation ({results.bhRes.rotationDepth.toFixed(2)}m)
                </text>

                {/* Pile Tip */}
                <line x1={pileCenterX + svgPileWidth} y1={pileBottomY} x2={pileCenterX + svgPileWidth + 80} y2={pileBottomY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                <text x={pileCenterX + svgPileWidth + 85} y={pileBottomY + 4} fill="#64748b" fontSize="12">-{pile.length.toFixed(2)}m</text>

                {/* Total Length dimension line */}
                <g transform={`translate(${pileCenterX + svgPileWidth + 40}, 0)`}>
                    <line x1="0" y1={groundY} x2="0" y2={pileBottomY} stroke="#64748b" strokeWidth="1" />
                    <line x1="-5" y1={groundY} x2="5" y2={groundY} stroke="#64748b" strokeWidth="1" />
                    <line x1="-5" y1={pileBottomY} x2="5" y2={pileBottomY} stroke="#64748b" strokeWidth="1" />
                    <text x="10" y={groundY + (pileBottomY - groundY) / 2 + 5} fill="#64748b" fontSize="14" fontStyle="italic">L = {pile.length}m</text>
                </g>

            </svg>

            <div className="absolute top-6 right-6 bg-white/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm">
                <p className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> {t('Max Bending Moment')}</p>
                <p className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> {t('Point of Rotation')}</p>
            </div>

        </div>
    );
}
