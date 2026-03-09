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
    showArrow?: boolean;
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
export function calculateDavisson(steps: LoadTestStep[], pileDiameter: number, pileLength: number, pileArea?: number, elasticModulus?: number): AnalysisResult {
    const cs = steps.filter(s => s.status === 'completed');
    if (cs.length < 2) return emptyResult('load-settlement', 'Davisson', 'Settlement (mm)', 'Load (kN)');

    const D_m = pileDiameter / 1000;
    const davissonOffset = 3.81 + (D_m * 1000) / 120;
    // Convert all to consistent units:
    //   A in m², E in kN/m² → AE in kN
    //   Δ_mm = (Q × L_m) / (A_m² × E_kN/m²) × 1000
    const A_m2 = pileArea ? pileArea / 1e6 : Math.PI * (D_m / 2) ** 2;
    const E_kNm2 = (elasticModulus || 30000) * 1000; // MPa → kN/m²
    const AE = A_m2 * E_kNm2;

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

    // Use tail regression: only points where load > 50% of max load (standard Chin practice)
    const maxLoad = Math.max(...cs.map(s => s.load));
    let tailPts = cs.filter(s => s.load > maxLoad * 0.5);
    if (tailPts.length < 2) tailPts = cs; // fallback to all

    // Linear regression on tail points
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = tailPts.length;
    tailPts.forEach(s => {
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
    if (cs.length < 3) return emptyResult('brinch-hansen-sqrt', `Brinch Hansen ${type}`, 'Settlement Δ (mm)', '√Δ / Q');

    // Textbook (Prakash & Sharma, 1990, Eq 9.3):
    //   Plot x = Δ (settlement), y = √Δ / Q
    //   Regression: √Δ/Q = C₁Δ + C₂
    //   BH 80%: Qu = 1 / (2√(C₁·C₂)),  Δ_v = C₂/C₁
    const dataPoints = cs.map(s => ({ x: s.settlement, y: Math.sqrt(s.settlement) / s.load }));

    // Linear regression on all points: y = C1*x + C2
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    dataPoints.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; });
    const nn = dataPoints.length;
    const C1 = (nn * sxy - sx * sy) / (nn * sx2 - sx * sx);
    const C2 = (sy - C1 * sx) / nn;

    let Qult: number | null = null;
    let Sf: number | null = null;

    if (type === '80%') {
        // BH 80%: Qu = 1 / (2√(C₁·C₂))   [Eq. 9.3a]
        //         Δ_v = C₂/C₁               [Eq. 9.3b]
        if (C1 > 0 && C2 > 0) {
            Qult = 1 / (2 * Math.sqrt(C1 * C2));
            Sf = C2 / C1;
        } else {
            // Graphical fallback: use max applied load
            const maxLoad = Math.max(...cs.map(s => s.load));
            const maxS = Math.max(...cs.map(s => s.settlement));
            Qult = maxLoad;
            Sf = maxS;
        }
    } else {
        // BH 90% criterion (trial & error):
        //   Find (Q_v)ult where Δ(Q_ult) = 2 × Δ(0.9 × Q_ult)
        const maxLoad = Math.max(...cs.map(s => s.load));
        const minLoad = maxLoad * 0.3;
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
        let foundIterative = false;
        for (let q = minLoad; q <= maxLoad; q += maxLoad / 500) {
            const sq = getSettlementAtLoad(q);
            const sq90 = getSettlementAtLoad(q * 0.9);
            if (sq !== null && sq90 !== null && sq90 > 0 && sq >= 2 * sq90) {
                Qult = q; Sf = sq; foundIterative = true; break;
            }
        }
        // Fallback when criterion isn't met within data range
        if (!foundIterative) {
            Qult = maxLoad / 0.9;
            Sf = Math.max(...cs.map(s => s.settlement));
        }
    }

    const xMin = Math.min(...dataPoints.map(p => p.x));
    const xMax = Math.max(...dataPoints.map(p => p.x)) * 1.2;
    const fitLine: ChartLine = {
        label: `C₁=${C1.toFixed(6)}, C₂=${C2.toFixed(5)}`,
        points: [{ x: xMin, y: C1 * xMin + C2 }, { x: xMax, y: C1 * xMax + C2 }],
        style: 'dashed', color: '#f59e0b',
    };

    const markers: ChartMarker[] = Qult && Sf
        ? [{ x: Sf, y: Math.sqrt(Sf) / Qult, label: `Qult = ${Math.round(Qult)} kN`, color: '#ef4444' }]
        : [];

    return buildResult(cs, Qult, Sf, {
        type: 'brinch-hansen-sqrt',
        title: `Brinch Hansen ${type} Criterion`,
        xLabel: 'Settlement Δ (mm)',
        yLabel: '√Δ / Q',
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
    qVals.push({ s: 0, q: 0 }); // Origin
    for (let i = 1; i <= nIntervals; i++) {
        const s = i * dS;
        const q = getLoadAtSettlement(s);
        if (q !== null) qVals.push({ s, q });
    }
    if (qVals.length < 3) return emptyResult('load-settlement', 'Mazurkiewicz', 'Settlement (mm)', 'Load (kN)');

    const constructionLines: ChartLine[] = [];
    
    // Scale k for visual purposes to place the left side points clearly.
    // Let's make the maximum deltaQ take up ~45% of the maxSettle width.
    let maxDelta = 0;
    for(let i=0; i<qVals.length-1; i++) {
        maxDelta = Math.max(maxDelta, qVals[i+1].q - qVals[i].q);
    }
    const k = maxDelta > 0 ? (maxSettle * 0.45) / maxDelta : 1;

    const intersections: { x: number; y: number }[] = [];
    const dxs = [0];

    // Build left-side point sequence for intersections
    for (let i = 0; i < qVals.length - 1; i++) {
        const q_i = qVals[i].q;
        const q_next = qVals[i+1].q;
        const dx = -k * (q_next - q_i);
        intersections.push({ x: dx, y: q_next });
        dxs.push(dx); // dxs[i+1] is the left extent of triangle i
    }

    // 1. Horizontal lines from right curve to left diagram
    for (let i = 1; i < qVals.length; i++) {
        const q = qVals[i].q;
        const s = qVals[i].s;
        
        let leftLimit = dxs[i];
        if (i < qVals.length - 1) {
            leftLimit = Math.min(dxs[i], dxs[i+1]);
        }
        
        // Base line crossing y-axis
        constructionLines.push({
            label: '',
            points: [{ x: s, y: q }, { x: leftLimit, y: q }],
            style: 'solid', color: '#cbd5e1', showArrow: false,
        });

        // Invisible line strictly for adding the left-pointing arrowhead at the y-axis
        constructionLines.push({
            label: '',
            points: [{ x: s, y: q }, { x: 0, y: q }],
            style: 'solid', color: 'transparent', showArrow: true,
        });
    }

    // 2. Vertical lines from curve down to settlement axis
    for (let i = 1; i < qVals.length; i++) {
        constructionLines.push({
            label: '',
            points: [{ x: qVals[i].s, y: qVals[i].q }, { x: qVals[i].s, y: 0 }],
            style: 'dashed', color: '#94a3b8', showArrow: true,
        });
    }

    // 3. Mazurkiewicz Projection Triangles (Left Side)
    for (let i = 0; i < qVals.length - 1; i++) {
        const q_i = qVals[i].q;
        const q_next = qVals[i+1].q;
        const dx = dxs[i+1];
        
        // Diagonal from origin (or previous step on Load axis) up-left
        constructionLines.push({
            label: '',
            points: [{ x: 0, y: q_i }, { x: dx, y: q_next }],
            style: 'solid', color: '#3b82f6', showArrow: true, // blue line, arrow up-left
        });

        // Vertical drop from intersection down to horizontal base of Q_i
        constructionLines.push({
            label: '',
            points: [{ x: dx, y: q_next }, { x: dx, y: q_i }],
            style: 'solid', color: '#3b82f6', showArrow: true,
        });
    }

    // Fit straight line through intersection points to find Qult
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    intersections.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; });
    const nn = intersections.length;
    let Qult: number | null = null;
    
    if (nn > 1) {
        const mLine = (nn * sxy - sx * sy) / (nn * sx2 - sx * sx);
        const bLine = (sy - mLine * sx) / nn;
        Qult = bLine;

        const minX = Math.min(...intersections.map(p => p.x));
        const xExt = minX * 1.2;
        constructionLines.push({
            label: 'Failure Projection',
            points: [{ x: xExt, y: mLine * xExt + bLine }, { x: 0, y: bLine }],
            style: 'dashed', color: '#ef4444', showArrow: true,
        });
        
        // Dashed line showing ultimate load asymptote
        constructionLines.push({
            label: '',
            points: [{ x: 0, y: bLine }, { x: maxSettle, y: bLine }],
            style: 'dashed', color: '#ef4444', showArrow: false,
        });
    }

    return buildResult(cs, Qult, null, {
        type: 'load-settlement',
        title: "Mazurkiewicz's Method",
        xLabel: '<- Projection Diagram | Load Test Data ->',
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

    // 0.05 in/ton: 0.05 in = 1.27 mm, 1 ton = 8.896 kN 
    // dQ/dS = 8.896 / 1.27 ≈ 7.005 kN/mm
    const targetSlope = 8.89644 / 1.27;
    let Qult: number | null = null, Sf: number | null = null;
    let tangentB: number | null = null;

    // 1. Try to find the exact tangent point in raw data
    for (let i = 1; i < cs.length; i++) {
        const slope = (cs[i].load - cs[i - 1].load) / (cs[i].settlement - cs[i - 1].settlement);
        if (slope <= targetSlope) {
            tangentB = cs[i].load - targetSlope * cs[i].settlement;
            Qult = cs[i].load;
            Sf = cs[i].settlement;
            break;
        }
    }

    let extrapolated = false;
    let extrapLine: ChartLine | null = null;

    // 2. Extrapolate using hyperbolic fit (Chin's) if not found
    if (Qult === null) {
        const dataPoints = cs.filter(s => s.load > 0 && s.settlement > 0).map(s => ({ x: s.settlement, y: s.settlement / s.load }));
        if (dataPoints.length >= 3) {
            let sx = 0, sy = 0, sxy = 0, sx2 = 0;
            dataPoints.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; });
            const nn = dataPoints.length;
            const C1 = (nn * sxy - sx * sy) / (nn * sx2 - sx * sx);
            const C2 = (sy - C1 * sx) / nn;
            
            // Hyperbola: Q = S / (C1*S + C2), dQ/dS = C2 / (C1*S + C2)²
            if (C1 > 0 && C2 > 0 && C2 / targetSlope > 0) {
                const sqrtTerm = Math.sqrt(C2 / targetSlope);
                const Se = (sqrtTerm - C2) / C1;
                if (Se > 0) {
                    const Qe = Se / (C1 * Se + C2);
                    Qult = Qe;
                    Sf = Se;
                    tangentB = Qe - targetSlope * Se;
                    extrapolated = true;

                    const maxS = Math.max(...cs.map(s => s.settlement));
                    const extLinePts = [];
                    for(let s = maxS; s <= Se * 1.05; s += (Se - maxS) / 10) {
                        extLinePts.push({ x: s, y: s / (C1 * s + C2) });
                    }
                    extrapLine = { label: 'Hyperbolic Extrapolation', points: extLinePts, style: 'dotted', color: '#94a3b8' };
                }
            }
        }
    }

    const lines: ChartLine[] = [];
    if (extrapLine) lines.push(extrapLine);
    if (Qult && Sf && tangentB !== null) {
        const intercept = tangentB;
        const maxSettle = Math.max(Sf, ...cs.map(s => s.settlement));
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
        title: "Fuller & Hoy's Method" + (extrapolated ? " (Extrapolated)" : ""),
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

    const nonZero = cs.filter(s => s.load > 0 && s.settlement > 0);
    if (nonZero.length < 2) return emptyResult('load-settlement', 'Butler & Hoy', 'Settlement (mm)', 'Load (kN)');
    const initialSlope = nonZero[0].load / nonZero[0].settlement;

    const targetSlope = 8.89644 / 1.27; // ≈ 7.005 kN/mm
    let tangentB: number | null = null;
    let tangentS: number | null = null; 

    // 1. Try raw data
    for (let i = 1; i < cs.length; i++) {
        const slope = (cs[i].load - cs[i - 1].load) / (cs[i].settlement - cs[i - 1].settlement);
        if (slope <= targetSlope) {
            tangentB = cs[i].load - targetSlope * cs[i].settlement;
            tangentS = cs[i].settlement;
            break;
        }
    }

    let extrapolated = false;
    let extrapLine: ChartLine | null = null;

    // 2. Hyperbolic Extrapolation
    if (tangentB === null) {
        const dataPoints = nonZero.map(s => ({ x: s.settlement, y: s.settlement / s.load }));
        if (dataPoints.length >= 3) {
            let sx = 0, sy = 0, sxy = 0, sx2 = 0;
            dataPoints.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; });
            const nn = dataPoints.length;
            const C1 = (nn * sxy - sx * sy) / (nn * sx2 - sx * sx);
            const C2 = (sy - C1 * sx) / nn;
            
            if (C1 > 0 && C2 > 0 && C2 / targetSlope > 0) {
                const sqrtTerm = Math.sqrt(C2 / targetSlope);
                const Se = (sqrtTerm - C2) / C1;
                if (Se > 0) {
                    const Qe = Se / (C1 * Se + C2);
                    tangentB = Qe - targetSlope * Se;
                    tangentS = Se;
                    extrapolated = true;
                    
                    const maxS = Math.max(...cs.map(s => s.settlement));
                    const extLinePts = [];
                    for(let s = maxS; s <= Se * 1.05; s += (Se - maxS) / 10) {
                        extLinePts.push({ x: s, y: s / (C1 * s + C2) });
                    }
                    extrapLine = { label: 'Hyperbolic Extrapolation', points: extLinePts, style: 'dotted', color: '#94a3b8' };
                }
            }
        }
    }

    let Sf: number | null = null, Qult: number | null = null;
    if (tangentB !== null && Math.abs(initialSlope - targetSlope) > 0.001) {
        Sf = tangentB / (initialSlope - targetSlope);
        Qult = initialSlope * Sf;
    }

    const maxSettle = Math.max(...cs.map(s => s.settlement), Sf || 0, tangentS || 0);
    const lines: ChartLine[] = [];
    if (extrapLine) lines.push(extrapLine);
    if (Qult && Sf && tangentB !== null) {
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
        title: "Butler & Hoy's Method" + (extrapolated ? " (Extrapolated)" : ""),
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
function buildResult(cs: LoadTestStep[], Qult: number | null, _Sf: number | null, chart: ChartData, fs: number = 2.5): AnalysisResult {
    const maxSettlement = cs.length > 0 ? Math.max(...cs.map(s => s.settlement)) : null;
    return {
        ultimateCapacity: Qult ? Math.round(Qult) : null,
        maxSettlement,
        safeWorkLoad: Qult ? Math.round(Qult / fs) : null,
        chart,
    };
}

function emptyResult(type: ChartType, title: string, xLabel: string, yLabel: string): AnalysisResult {
    return {
        ultimateCapacity: null, maxSettlement: null, safeWorkLoad: null,
        chart: { type, title, xLabel, yLabel, dataPoints: [], lines: [], markers: [] },
    };
}

export function analyzeLoadTest(method: InterpretationMethod, steps: LoadTestStep[], pileDiameter: number, pileLength: number, pileArea?: number, elasticModulus?: number, fs: number = 2.5): AnalysisResult {
    const wrap = (result: AnalysisResult): AnalysisResult => ({
        ...result,
        safeWorkLoad: result.ultimateCapacity ? Math.round(result.ultimateCapacity / fs) : null,
    });
    switch (method) {
        case 'Davisson Offset Limit': return wrap(calculateDavisson(steps, pileDiameter, pileLength, pileArea, elasticModulus));
        case 'Chin-Kondner Extrapolation': return wrap(calculateChin(steps));
        case 'De Beer Log-Log': return wrap(calculateDeBeer(steps));
        case 'Brinch-Hansen 90%': return wrap(calculateBrinchHansen(steps, '90%'));
        case 'Brinch-Hansen 80%': return wrap(calculateBrinchHansen(steps, '80%'));
        case 'Mazurkiewicz': return wrap(calculateMazurkiewicz(steps));
        case 'Fuller & Hoy (0.05 in/ton)': return wrap(calculateFullerHoy(steps));
        case 'Butler & Hoy': return wrap(calculateButlerHoy(steps));
        case 'Van der Veen': return wrap(calculateVanDerVeen(steps));
        default: return wrap(calculateDavisson(steps, pileDiameter, pileLength, pileArea, elasticModulus));
    }
}
