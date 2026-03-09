import { describe, it, expect } from 'vitest';
import { analyzeLoadTest } from '../loadTestMethods';
import { LoadTestStep } from '../../storage';

const mockSteps: LoadTestStep[] = [
    { step: 1, load: 0, settlement: 0, holdTime: 10, status: 'completed' },
    { step: 2, load: 625, settlement: 1.24, holdTime: 15, status: 'completed' },
    { step: 3, load: 1250, settlement: 3.15, holdTime: 20, status: 'completed' },
    { step: 4, load: 1875, settlement: 5.80, holdTime: 20, status: 'completed' },
    { step: 5, load: 2500, settlement: 8.45, holdTime: 30, status: 'completed' },
    { step: 6, load: 3125, settlement: 12.30, holdTime: 30, status: 'completed' },
    { step: 7, load: 3750, settlement: 18.50, holdTime: 30, status: 'completed' },
    { step: 8, load: 4375, settlement: 28.40, holdTime: 30, status: 'completed' },
];

describe('Pile Load Test Interpretation Methods', () => {

    it('Davisson: returns load-settlement chart with Davisson line', () => {
        const result = analyzeLoadTest('Davisson Offset Limit', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('load-settlement');
        expect(result.chart.title).toContain('Davisson');
        expect(result.chart.lines.length).toBeGreaterThanOrEqual(1);
        expect(result.chart.lines.some(l => l.label.includes('Davisson'))).toBe(true);
        expect(result.ultimateCapacity).toBeGreaterThan(2000);
        expect(result.ultimateCapacity).toBeLessThan(5000);
    });

    it('Chin: returns chin-hyperbolic chart (S/Q vs S)', () => {
        const result = analyzeLoadTest('Chin-Kondner Extrapolation', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('chin-hyperbolic');
        expect(result.chart.xLabel).toContain('Settlement');
        expect(result.chart.yLabel).toContain('/Q');
        expect(result.chart.dataPoints.length).toBeGreaterThan(0);
        // Chin: each data point is { x: settlement, y: settlement/load }
        expect(result.chart.dataPoints[0].y).toBeCloseTo(mockSteps[1].settlement / mockSteps[1].load, 3);
        expect(result.ultimateCapacity).toBeGreaterThan(3000);
    });

    it('De Beer: returns debeer-loglog chart (log-log scale)', () => {
        const result = analyzeLoadTest('De Beer Log-Log', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('debeer-loglog');
        expect(result.chart.xLabel).toContain('log');
        expect(result.chart.yLabel).toContain('log');
        expect(result.chart.lines.length).toBe(2); // two linear segments
        if (result.ultimateCapacity !== null) {
            expect(result.ultimateCapacity).toBeGreaterThan(1000);
        }
    });

    it('Brinch-Hansen 90%: returns brinch-hansen-sqrt chart (Δ vs √Δ/Q)', () => {
        const result = analyzeLoadTest('Brinch-Hansen 90%', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('brinch-hansen-sqrt');
        expect(result.chart.xLabel).toContain('Δ'); // 'Settlement Δ (mm)'
        expect(result.chart.yLabel).toContain('√Δ / Q');
        expect(result.chart.dataPoints.length).toBeGreaterThan(0);
        // Verify data transform: x = settlement, y = sqrt(settlement)/load
        const firstNonZero = mockSteps.filter(s => s.load > 0 && s.settlement > 0)[0];
        expect(result.chart.dataPoints[0].x).toBeCloseTo(firstNonZero.settlement, 3);
        expect(result.chart.dataPoints[0].y).toBeCloseTo(Math.sqrt(firstNonZero.settlement) / firstNonZero.load, 3);
        if (result.ultimateCapacity !== null) {
            expect(result.ultimateCapacity).toBeGreaterThan(2000);
        }
    });

    it('Brinch-Hansen 80%: returns brinch-hansen-sqrt chart', () => {
        const result = analyzeLoadTest('Brinch-Hansen 80%', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('brinch-hansen-sqrt');
        expect(result.chart.title).toContain('80%');
        // 80% criterion uses Qu = 1/(2*sqrt(C1*C2)) — value depends on data shape
        if (result.ultimateCapacity !== null) {
            expect(result.ultimateCapacity).toBeGreaterThan(100);
        }
    });

    it('Mazurkiewicz: returns load-settlement chart with construction lines', () => {
        const result = analyzeLoadTest('Mazurkiewicz', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('load-settlement');
        expect(result.chart.title).toContain('Mazurkiewicz');
        // Should have construction lines (vertical + horizontal for equal settlements)
        expect(result.chart.lines.length).toBeGreaterThan(3);
        if (result.ultimateCapacity !== null) {
            expect(result.ultimateCapacity).toBeGreaterThan(3000);
        }
    });

    it('Fuller & Hoy: returns load-settlement chart with 0.05 in/ton tangent', () => {
        const result = analyzeLoadTest('Fuller & Hoy (0.05 in/ton)', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('load-settlement');
        if (result.ultimateCapacity !== null) {
            expect(result.ultimateCapacity).toBeGreaterThan(2000);
            expect(result.chart.lines.some(l => l.label.includes('0.05'))).toBe(true);
        }
    });

    it('Butler & Hoy: returns load-settlement chart with two tangent lines', () => {
        const result = analyzeLoadTest('Butler & Hoy', mockSteps, 600, 24.5);
        expect(result.chart.type).toBe('load-settlement');
        if (result.ultimateCapacity !== null) {
            expect(result.ultimateCapacity).toBeGreaterThan(2000);
            expect(result.chart.lines.length).toBeGreaterThanOrEqual(2); // initial tangent + 0.05 tangent (+ optional extrapolation)
        }
    });

    it('Van der Veen: returns load-settlement chart with fitted exponential curve', () => {
        const result = analyzeLoadTest('Van der Veen', mockSteps, 600, 24.5);
        expect(result.chart.title).toContain('Van der Veen');
        expect(result.chart.yLabel).toContain('Load');
        expect(result.chart.xLabel).toContain('Settlement');
        expect(result.chart.dataPoints.length).toBeGreaterThan(0);
        if (result.ultimateCapacity !== null) {
            expect(result.ultimateCapacity).toBeGreaterThan(4375);
            expect(result.chart.lines.length).toBeGreaterThanOrEqual(1);
            // Check for fitted curve line
            expect(result.chart.lines.some(l => l.label.includes('Van der Veen Fit'))).toBe(true);
        }
    });
});
