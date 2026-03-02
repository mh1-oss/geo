import { LoadTestStep } from '../storage';

export type InterpretationMethod =
    | 'Davisson Offset Limit'
    | 'Chin-Kondner Extrapolation'
    | 'De Beer Log-Log'
    | 'Brinch-Hansen 90%'
    | 'Brinch-Hansen 80%'
    | 'Mazurkiewicz'
    | 'Fuller & Hoy (0.05 in/ton)'
    | 'Butler & Hoy'
    | 'Van der Veen'
    | 'Static Axial (ASTM D1143)'
    | 'Rapid Load Test (ASTM D7383)'
    | 'Dynamic Load Test (ASTM D4945)';

export type ChartType = 'load-settlement' | 'chin-hyperbolic' | 'debeer-loglog' | 'brinch-hansen-sqrt';

export interface ChartLine {
    label: string;
    points: { x: number; y: number }[];
    style: 'dashed' | 'solid' | 'dotted';
    color: string;
}

export interface ChartMarker {
    x: number; y: number; label: string; color: string;
}

export interface ChartData {
    type: ChartType;
    title: string;
    xLabel: string;
    yLabel: string;
    dataPoints: { x: number; y: number }[];
    lines: ChartLine[];
    markers: ChartMarker[];
}

export interface AnalysisResult {
    ultimateCapacity: number | null;
    maxSettlement: number | null;
    safeWorkLoad: number | null;
    chart: ChartData;
}

// ─────────────────────────────────────────────────
// 1. Davisson Offset Limit
// ─────────────────────────────────────────────────
export function calculateDavisson(steps: LoadTestStep[], pileDiameter: number, pileLength: number): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed');
    if (cs.length < 2) return emptyResult('load-settlement', 'Davisson', 'Settlement (mm)', 'Load (kN)');

    const D_m = pileDiameter / 1000;
    const davissonOffset = 3.81 + (D_m * 1000) / 120;
    const AE = Math.PI * (D_m / 2) ** 2 * 30e6;

    const elasticLine = cs.map(s => ({
        load: s.load,
        settlement: (s.load * pileLength) / AE * 1000,
    }));
    const davissonLine = cs.map((s, i) => ({
        x: davissonOffset + elasticLine[i].settlement,
        y: s.load,
    }));

    let Qult: number | null = null;
    let Sf: number | null = null;

    for (let i = 1; i < cs.length; i++) {
        const dav = davissonLine[i]?.x || 0;
        if (cs[i].settlement > dav && !Qult) {
            const prev = cs[i - 1];
            const m1 = (cs[i].load - prev.load) / (cs[i].settlement - prev.settlement);
            const m2 = (davissonLine[i].y - davissonLine[i - 1].y) / (davissonLine[i].x - davissonLine[i - 1].x);
            const b1 = cs[i].load - m1 * cs[i].settlement;
            const b2 = davissonLine[i].y - m2 * davissonLine[i].x;
            if (Math.abs(m1 - m2) > 0.0001) {
                Sf = (b2 - b1) / (m1 - m2);
                Qult = m1 * Sf + b1;
            } else {
                Qult = cs[i].load;
                Sf = cs[i].settlement;
            }
            break;
        }
    }

    return buildResult(cs, Qult, Sf, {
        type: 'load-settlement',
        title: "Davisson's Method",
        xLabel: 'Settlement (mm)',
        yLabel: 'Load (kN)',
        dataPoints: cs.map(s => ({ x: s.settlement, y: s.load })),
        lines: [
            { label: 'Elastic Compression', points: elasticLine.map((e, i) => ({ x: e.settlement, y: cs[i].load })), style: 'dotted', color: '#94a3b8' },
            { label: 'Davisson Limit', points: davissonLine, style: 'dashed', color: '#f59e0b' },
        ],
        markers: Qult && Sf ? [{ x: Sf, y: Qult, label: `Qult = ${Math.round(Qult)} kN`, color: '#ef4444' }] : [],
    });
}

// ─────────────────────────────────────────────────
// 2. Chin-Kondner Extrapolation (Hyperbolic)
// ─────────────────────────────────────────────────
export function calculateChin(steps: LoadTestStep[]): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed' && s.load > 0 && s.settlement > 0);
    if (cs.length < 3) return emptyResult('chin-hyperbolic', "Chin's Method", 'Settlement Δ (mm)', 'Δ/Q (mm/kN)');

    // Plot S/Q vs S → straight line with slope C1
    const dataPoints = cs.map(s => ({ x: s.settlement, y: s.settlement / s.load }));

    // Linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = cs.length;
    cs.forEach(s => {
        const x = s.settlement;
        const y = s.settlement / s.load;
        sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    });
    const c1 = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const c2 = (sumY - c1 * sumX) / n;

    const Qult = c1 > 0 ? 1 / c1 : null;

    // Best-fit line for display
    const minX = Math.min(...dataPoints.map(p => p.x));
    const maxX = Math.max(...dataPoints.map(p => p.x)) * 1.3;
    const fitLine: ChartLine = {
        label: `Slope C₁ = ${c1.toFixed(6)}`,
        points: [{ x: minX, y: c1 * minX + c2 }, { x: maxX, y: c1 * maxX + c2 }],
        style: 'dashed',
        color: '#f59e0b',
    };

    return buildResult(cs, Qult, null, {
        type: 'chin-hyperbolic',
        title: "Chin's Method (Hyperbolic)",
        xLabel: 'Settlement Δ (mm)',
        yLabel: 'Δ/Q (mm/kN)',
        dataPoints,
        lines: [fitLine],
        markers: Qult ? [{ x: maxX, y: c1 * maxX + c2, label: `Qult = 1/C₁ = ${Math.round(Qult)} kN`, color: '#ef4444' }] : [],
    });
}

// ─────────────────────────────────────────────────
// 3. De Beer Log-Log Method
// ─────────────────────────────────────────────────
export function calculateDeBeer(steps: LoadTestStep[]): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed' && s.load > 0 && s.settlement > 0);
    if (cs.length < 4) return emptyResult('debeer-loglog', "De Beer's Method", 'log₁₀(Load)', 'log₁₀(Settlement)');

    const dataPoints = cs.map(s => ({ x: Math.log10(s.load), y: Math.log10(s.settlement) }));

    function linReg(pts: { x: number; y: number }[]) {
        let sx = 0, sy = 0, sxy = 0, sx2 = 0;
        pts.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; });
        const nn = pts.length;
        const mm = (nn * sxy - sx * sy) / (nn * sx2 - sx * sx);
        const bb = (sy - mm * sx) / nn;
        return { m: mm, b: bb };
    }
    function sse(pts: { x: number; y: number }[], m: number, b: number) {
        return pts.reduce((a, p) => a + (p.y - (m * p.x + b)) ** 2, 0);
    }

    let best1 = { m: 0, b: 0 }, best2 = { m: 0, b: 0 }, minErr = Infinity;
    for (let i = 2; i < dataPoints.length - 1; i++) {
        const l1 = linReg(dataPoints.slice(0, i));
        const l2 = linReg(dataPoints.slice(i - 1));
        const err = sse(dataPoints.slice(0, i), l1.m, l1.b) + sse(dataPoints.slice(i - 1), l2.m, l2.b);
        if (err < minErr) { minErr = err; best1 = l1; best2 = l2; }
    }

    let Qult: number | null = null, Sf: number | null = null;
    const interX = Math.abs(best1.m - best2.m) > 0.001
        ? (best2.b - best1.b) / (best1.m - best2.m) : null;

    if (interX !== null) {
        Qult = Math.pow(10, interX);
        Sf = Math.pow(10, best1.m * interX + best1.b);
    }

    const xMin = Math.min(...dataPoints.map(p => p.x)) - 0.1;
    const xMax = Math.max(...dataPoints.map(p => p.x)) + 0.1;

    const lines: ChartLine[] = [
        { label: 'Segment 1', points: [{ x: xMin, y: best1.m * xMin + best1.b }, { x: xMax, y: best1.m * xMax + best1.b }], style: 'dashed', color: '#3b82f6' },
        { label: 'Segment 2', points: [{ x: xMin, y: best2.m * xMin + best2.b }, { x: xMax, y: best2.m * xMax + best2.b }], style: 'dashed', color: '#f59e0b' },
    ];

    const markers: ChartMarker[] = interX !== null
        ? [{ x: interX, y: best1.m * interX + best1.b, label: `Qult = ${Math.round(Qult!)} kN`, color: '#ef4444' }]
        : [];

    return buildResult(cs, Qult, Sf, {
        type: 'debeer-loglog',
        title: "De Beer's Log-Log Method",
        xLabel: 'log₁₀(Load kN)',
        yLabel: 'log₁₀(Settlement mm)',
        dataPoints,
        lines,
        markers,
    });
}

// ─────────────────────────────────────────────────
// 4 & 5. Brinch Hansen 90% / 80%
// ─────────────────────────────────────────────────
export function calculateBrinchHansen(steps: LoadTestStep[], type: '90%' | '80%'): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed' && s.load > 0 && s.settlement > 0);
    if (cs.length < 3) return emptyResult('brinch-hansen-sqrt', `Brinch Hansen ${type}`, '√S (√mm)', 'S/Q (mm/kN)');

    // Plot √S (x) vs S/Q (y).
    const dataPoints = cs.map(s => ({ x: Math.sqrt(s.settlement), y: s.settlement / s.load }));

    // Linear regression on all points: y = C1*x + C2
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    dataPoints.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; });
    const nn = dataPoints.length;
    const C1 = (nn * sxy - sx * sy) / (nn * sx2 - sx * sx);
    const C2 = (sy - C1 * sx) / nn;

    // Brinch Hansen 80%: Qu = 1 / (2 * sqrt(C1 * C2))
    // Brinch Hansen 90%: Qu = 1 / (2 * sqrt(C1 * C2)) * correction
    // Actually both use the same formula but with different interpretations
    // 80%: Qu = 1/(2*sqrt(C1*C2)), Su = C2/C1
    // 90%: criterion is S_Q = 2 * S_(0.9Q), which often gives a similar result

    let Qult: number | null = null;
    let Sf: number | null = null;

    if (C1 > 0 && C2 > 0) {
        if (type === '80%') {
            Qult = 1 / (2 * Math.sqrt(C1 * C2));
            Sf = C2 / C1; // settlement at failure (Sf = C2/C1 in sqrt terms, so actual Sf = (C2/C1)^2)
            Sf = (C2 / C1) ** 2;
        } else {
            // 90% criterion: Qu where S = 2 * S(0.9*Qu)
            // Use iterative approach with the actual interpolated curve
            const maxLoad = Math.max(...cs.map(s => s.load));
            const minLoad = maxLoad * 0.3; // start scanning from 30% of max load
            function getSettlementAtLoad(q: number): number | null {
                if (q <= 0) return 0;
                for (let i = 1; i < cs.length; i++) {
                    if (cs[i].load >= q) {
                        const prev = cs[i - 1], curr = cs[i];
                        if (curr.load === prev.load) return curr.settlement;
                        return prev.settlement + (curr.settlement - prev.settlement) * ((q - prev.load) / (curr.load - prev.load));
                    }
                }
                return null;
            }
            for (let q = minLoad; q <= maxLoad; q += maxLoad / 500) {
                const sq = getSettlementAtLoad(q);
                const sq90 = getSettlementAtLoad(q * 0.9);
                if (sq !== null && sq90 !== null && sq90 > 0 && sq >= 2 * sq90) {
                    Qult = q; Sf = sq; break;
                }
            }
        }
    }

    const xMin = Math.min(...dataPoints.map(p => p.x));
    const xMax = Math.max(...dataPoints.map(p => p.x)) * 1.2;
    const fitLine: ChartLine = {
        label: `C₁=${C1.toFixed(5)}, C₂=${C2.toFixed(5)}`,
        points: [{ x: xMin, y: C1 * xMin + C2 }, { x: xMax, y: C1 * xMax + C2 }],
        style: 'dashed', color: '#f59e0b',
    };

    const markers: ChartMarker[] = Qult && Sf
        ? [{ x: Math.sqrt(Sf), y: Sf / Qult, label: `Qult = ${Math.round(Qult)} kN`, color: '#ef4444' }]
        : [];

    return buildResult(cs, Qult, Sf, {
        type: 'brinch-hansen-sqrt',
        title: `Brinch Hansen ${type} Criterion`,
        xLabel: '√Settlement (√mm)',
        yLabel: 'S/Q (mm/kN)',
        dataPoints,
        lines: [fitLine],
        markers,
    });
}

// ─────────────────────────────────────────────────
// 6. Mazurkiewicz's Method
// ─────────────────────────────────────────────────
export function calculateMazurkiewicz(steps: LoadTestStep[]): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed');
    if (cs.length < 4) return emptyResult('load-settlement', 'Mazurkiewicz', 'Settlement (mm)', 'Load (kN)');

    const maxSettle = Math.max(...cs.map(s => s.settlement));
    const nIntervals = 5;
    const dS = maxSettle / nIntervals;

    function getLoadAtSettlement(s: number): number | null {
        if (s <= 0) return 0;
        for (let i = 1; i < cs.length; i++) {
            if (cs[i].settlement >= s) {
                const prev = cs[i - 1], curr = cs[i];
                if (curr.settlement === prev.settlement) return curr.load;
                return prev.load + (curr.load - prev.load) * ((s - prev.settlement) / (curr.settlement - prev.settlement));
            }
        }
        return null;
    }

    const qVals: { s: number; q: number }[] = [];
    for (let i = 1; i <= nIntervals; i++) {
        const s = i * dS;
        const q = getLoadAtSettlement(s);
        if (q !== null) qVals.push({ s, q });
    }
    if (qVals.length < 3) return emptyResult('load-settlement', 'Mazurkiewicz', 'Settlement (mm)', 'Load (kN)');

    // Construction lines: vertical from equal settlements, horizontal to load axis
    const constructionLines: ChartLine[] = [];
    // Vertical lines at equal settlements
    for (const v of qVals) {
        constructionLines.push({
            label: '',
            points: [{ x: v.s, y: 0 }, { x: v.s, y: v.q }],
            style: 'dotted', color: '#64748b',
        });
        // Horizontal from curve to load axis
        constructionLines.push({
            label: '',
            points: [{ x: v.s, y: v.q }, { x: 0, y: v.q }],
            style: 'dotted', color: '#64748b',
        });
    }

    // 45° line intersections: from (0, Q_i) draw 45° to intersect vertical at Q_{i+1}
    // In load-settlement space: intersection points (Q_{i+1} - Q_i, Q_i) but let's use geometric approach
    const intersections: { x: number; y: number }[] = [];
    for (let i = 0; i < qVals.length - 1; i++) {
        // 45° from Q_i on load axis: y = x + Q_i (settlement, load coords, where x=settlement-axis)
        // or more precisely, in load terms: from point (0, Q_i), slope +1 scaled
        // Mazurkiewicz in load-space: from (0, Q_i) draw 45° line (slope=1 in scaled space)
        // Intersect vertical at settlement = qVals[i+1].s
        // y = Q_i + (x - 0) * (maxLoad/maxSettle) -> not quite, it's a 45° in same unit space
        // For simplicity: intersection point = (Q_{i+1}, Q_i) plotted in Q_n vs Q_{n-1} space
        intersections.push({ x: qVals[i + 1].q, y: qVals[i].q });
    }

    // Fit line to intersections and find where it crosses y=x (Qult)
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    intersections.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; });
    const nn = intersections.length;
    const mLine = (nn * sxy - sx * sy) / (nn * sx2 - sx * sx);
    const bLine = (sy - mLine * sx) / nn;

    let Qult: number | null = null;
    if (Math.abs(1 - mLine) > 0.001) {
        Qult = bLine / (1 - mLine);
    }

    // Draw the extrapolated line on the load-settlement chart as a visual
    // The 45° construction is abstract — we'll show settlement lines + failure marker
    if (Qult && Qult > 0) {
        constructionLines.push({
            label: 'Extrapolated Qult',
            points: [{ x: 0, y: Qult }, { x: maxSettle, y: Qult }],
            style: 'dashed', color: '#ef4444',
        });
    }

    return buildResult(cs, Qult, null, {
        type: 'load-settlement',
        title: "Mazurkiewicz's Method",
        xLabel: 'Settlement (mm)',
        yLabel: 'Load (kN)',
        dataPoints: cs.map(s => ({ x: s.settlement, y: s.load })),
        lines: constructionLines,
        markers: Qult ? [{ x: 0, y: Qult, label: `Qult = ${Math.round(Qult)} kN`, color: '#ef4444' }] : [],
    });
}

// ─────────────────────────────────────────────────
// 7. Fuller & Hoy (0.05 in/ton)
// ─────────────────────────────────────────────────
export function calculateFullerHoy(steps: LoadTestStep[]): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed');
    if (cs.length < 3) return emptyResult('load-settlement', 'Fuller & Hoy', 'Settlement (mm)', 'Load (kN)');

    // 0.05 in/ton ≈ 0.1427 mm/kN → dQ/dS = 7.00 kN/mm
    const targetSlope = 1 / 0.1427;
    let Qult: number | null = null, Sf: number | null = null;

    for (let i = 1; i < cs.length; i++) {
        const slope = (cs[i].load - cs[i - 1].load) / (cs[i].settlement - cs[i - 1].settlement);
        if (slope <= targetSlope) {
            Qult = cs[i].load;
            Sf = cs[i].settlement;
            break;
        }
    }

    const lines: ChartLine[] = [];
    if (Qult && Sf) {
        const intercept = Qult - targetSlope * Sf;
        const maxSettle = Math.max(...cs.map(s => s.settlement));
        lines.push({
            label: '0.05 in/ton Tangent',
            points: [
                { x: Math.max(0, -intercept / targetSlope), y: Math.max(0, intercept) },
                { x: maxSettle * 1.1, y: targetSlope * maxSettle * 1.1 + intercept },
            ],
            style: 'dashed', color: '#ec4899',
        });
    }

    return buildResult(cs, Qult, Sf, {
        type: 'load-settlement',
        title: "Fuller & Hoy's Method",
        xLabel: 'Settlement (mm)',
        yLabel: 'Load (kN)',
        dataPoints: cs.map(s => ({ x: s.settlement, y: s.load })),
        lines,
        markers: Qult && Sf ? [{ x: Sf, y: Qult, label: `Qult = ${Math.round(Qult)} kN`, color: '#ef4444' }] : [],
    });
}

// ─────────────────────────────────────────────────
// 8. Butler & Hoy
// ─────────────────────────────────────────────────
export function calculateButlerHoy(steps: LoadTestStep[]): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed');
    if (cs.length < 3) return emptyResult('load-settlement', 'Butler & Hoy', 'Settlement (mm)', 'Load (kN)');

    // Initial tangent from first two non-zero points
    const nonZero = cs.filter(s => s.load > 0 && s.settlement > 0);
    if (nonZero.length < 2) return emptyResult('load-settlement', 'Butler & Hoy', 'Settlement (mm)', 'Load (kN)');
    const initialSlope = nonZero[0].load / nonZero[0].settlement;

    // 0.05 in/ton tangent
    const targetSlope = 1 / 0.1427;
    let tangentB: number | null = null;
    for (let i = 1; i < cs.length; i++) {
        const slope = (cs[i].load - cs[i - 1].load) / (cs[i].settlement - cs[i - 1].settlement);
        if (slope <= targetSlope) {
            tangentB = cs[i].load - targetSlope * cs[i].settlement;
            break;
        }
    }

    if (tangentB === null) return emptyResult('load-settlement', 'Butler & Hoy', 'Settlement (mm)', 'Load (kN)');

    let Sf: number | null = null, Qult: number | null = null;
    if (Math.abs(initialSlope - targetSlope) > 0.001) {
        Sf = tangentB / (initialSlope - targetSlope);
        Qult = initialSlope * Sf;
    }

    const maxSettle = Math.max(...cs.map(s => s.settlement));
    const lines: ChartLine[] = [];
    if (Qult && Sf) {
        lines.push({
            label: 'Initial Tangent',
            points: [{ x: 0, y: 0 }, { x: Sf * 1.3, y: initialSlope * Sf * 1.3 }],
            style: 'dashed', color: '#3b82f6',
        });
        lines.push({
            label: '0.05 in/ton Tangent',
            points: [
                { x: Math.max(0, -tangentB / targetSlope), y: Math.max(0, tangentB) },
                { x: maxSettle, y: targetSlope * maxSettle + tangentB },
            ],
            style: 'dashed', color: '#ec4899',
        });
    }

    return buildResult(cs, Qult, Sf, {
        type: 'load-settlement',
        title: "Butler & Hoy's Method",
        xLabel: 'Settlement (mm)',
        yLabel: 'Load (kN)',
        dataPoints: cs.map(s => ({ x: s.settlement, y: s.load })),
        lines,
        markers: Qult && Sf ? [{ x: Sf, y: Qult, label: `Qult = ${Math.round(Qult)} kN`, color: '#ef4444' }] : [],
    });
}

// ─────────────────────────────────────────────────
// 9. Van der Veen's Method
// ─────────────────────────────────────────────────
export function calculateVanDerVeen(steps: LoadTestStep[]): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed' && s.load > 0 && s.settlement > 0);
    if (cs.length < 4) return emptyResult('load-settlement', "Van der Veen", 'Settlement (mm)', 'Load (kN)');

    // Van der Veen: Q = Qult * (1 - e^(-α*S))
    // Rearranged: -ln(1 - Q/Qult) = α * S
    // Best Qult linearizes the -ln(1-Q/Qult) vs S plot
    const maxLoadMeasured = Math.max(...cs.map(s => s.load));
    const maxSettle = Math.max(...cs.map(s => s.settlement));

    let bestQult = maxLoadMeasured * 1.1;
    let bestR2 = -Infinity;
    let bestAlpha = 0;

    for (let trialQult = maxLoadMeasured * 1.01; trialQult <= maxLoadMeasured * 3; trialQult += maxLoadMeasured * 0.01) {
        const pts: { x: number; y: number }[] = [];
        let valid = true;
        for (const s of cs) {
            const ratio = s.load / trialQult;
            if (ratio >= 1) { valid = false; break; }
            pts.push({ x: s.settlement, y: -Math.log(1 - ratio) });
        }
        if (!valid || pts.length < 3) continue;

        let sumXY = 0, sumX2 = 0, sumY = 0;
        pts.forEach(p => { sumXY += p.x * p.y; sumX2 += p.x * p.x; sumY += p.y; });
        const alpha = sumXY / sumX2;
        if (alpha <= 0) continue;

        const ssTot = pts.reduce((acc, p) => acc + (p.y - sumY / pts.length) ** 2, 0);
        const ssRes = pts.reduce((acc, p) => acc + (p.y - alpha * p.x) ** 2, 0);
        const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
        if (r2 > bestR2) { bestR2 = r2; bestQult = trialQult; bestAlpha = alpha; }
    }

    const Qult = bestR2 > 0.8 ? bestQult : null;

    // Show in LOAD-SETTLEMENT space (standard presentation)
    const dataPoints = cs.map(s => ({ x: s.settlement, y: s.load }));

    const lines: ChartLine[] = [];
    if (Qult) {
        // Fitted curve: Q = Qult * (1 - e^(-α*S))
        const extendedS = maxSettle * 1.5;
        const fittedPts = Array.from({ length: 40 }, (_, i) => {
            const s = (extendedS / 40) * (i + 1);
            return { x: s, y: Qult * (1 - Math.exp(-bestAlpha * s)) };
        });
        lines.push({
            label: `Van der Veen Fit (R²=${bestR2.toFixed(3)})`,
            points: fittedPts,
            style: 'dashed',
            color: '#a855f7',
        });
        // Qult horizontal asymptote
        lines.push({
            label: `Qult = ${Math.round(Qult)} kN`,
            points: [{ x: 0, y: Qult }, { x: extendedS, y: Qult }],
            style: 'dotted',
            color: '#ef4444',
        });
    }

    // Find settlement where fitted curve reaches 95% of Qult
    let failureS: number | null = null;
    if (Qult && bestAlpha > 0) {
        failureS = -Math.log(0.05) / bestAlpha; // S at Q=0.95*Qult
    }

    return buildResult(cs, Qult, failureS, {
        type: 'load-settlement',
        title: "Van der Veen's Method",
        xLabel: 'Settlement (mm)',
        yLabel: 'Load (kN)',
        dataPoints,
        lines,
        markers: Qult ? [{ x: failureS || maxSettle, y: Qult, label: `Qult = ${Math.round(Qult)} kN (α=${bestAlpha.toFixed(4)})`, color: '#ef4444' }] : [],
    });
}

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function buildResult(cs: LoadTestStep[], Qult: number | null, _Sf: number | null, chart: ChartData): AnalysisResult {
    const maxSettlement = cs.length > 0 ? Math.max(...cs.map(s => s.settlement)) : null;
    return {
        ultimateCapacity: Qult ? Math.round(Qult) : null,
        maxSettlement,
        safeWorkLoad: Qult ? Math.round(Qult / 2.5) : null,
        chart,
    };
}

function emptyResult(type: ChartType, title: string, xLabel: string, yLabel: string): AnalysisResult {
    return {
        ultimateCapacity: null, maxSettlement: null, safeWorkLoad: null,
        chart: { type, title, xLabel, yLabel, dataPoints: [], lines: [], markers: [] },
    };
}

export function analyzeLoadTest(method: InterpretationMethod, steps: LoadTestStep[], pileDiameter: number, pileLength: number): AnalysisResult {
    switch (method) {
        case 'Davisson Offset Limit': return calculateDavisson(steps, pileDiameter, pileLength);
        case 'Chin-Kondner Extrapolation': return calculateChin(steps);
        case 'De Beer Log-Log': return calculateDeBeer(steps);
        case 'Brinch-Hansen 90%': return calculateBrinchHansen(steps, '90%');
        case 'Brinch-Hansen 80%': return calculateBrinchHansen(steps, '80%');
        case 'Mazurkiewicz': return calculateMazurkiewicz(steps);
        case 'Fuller & Hoy (0.05 in/ton)': return calculateFullerHoy(steps);
        case 'Butler & Hoy': return calculateButlerHoy(steps);
        case 'Van der Veen': return calculateVanDerVeen(steps);
        default: return calculateDavisson(steps, pileDiameter, pileLength);
    }
}
