import { describe, it, expect } from 'vitest';
import { classifyPile } from '../classification';
import { calculateBroms, BromsParams } from '../broms';
import { calculateBrinchHansen, BHParams } from '../brinchHansen';

describe('classification logic', () => {
    it('identifies short and long piles correctly under constant modulus', () => {
        // R = Math.sqrt(EI / k)
        // If EI = 100, k = 4 -> R = 5
        // L = 5 (L/R = 1 <= 2) -> rigid

        // EI = 100
        // k = 4 -> R = sqrt(25) = 5
        const resShort = classifyPile(5, 100, 'constant', 4);
        expect(resShort.classification).toBe('rigid');

        // L = 25 (L/R = 5 >= 4) -> long
        const resLong = classifyPile(25, 100, 'constant', 4);
        expect(resLong.classification).toBe('long');
    });

    it('identifies short and long piles under linear modulus', () => {
        // T = Math.pow(EI/nh, 0.2)
        // EI = 3200, nh = 100 -> T = 32^0.2 = 2
        // L = 4 -> rigid
        const resShort = classifyPile(3, 3200, 'linear', 100);
        expect(resShort.classification).toBe('rigid');

        // L = 10 -> long
        const resLong = classifyPile(10, 3200, 'linear', 100);
        expect(resLong.classification).toBe('long');
    });
});

describe('broms logic', () => {
    it('computes short free clay correctly', () => {
        const params: BromsParams = {
            soilType: 'clay',
            pileCondition: 'rigid',
            headCondition: 'free',
            L: 10,
            D: 1,
            e: 0,
            cu: 50 // kPa
        };
        const res = calculateBroms(params);
        expect(res.failureMode).toContain('Soil Failure');
        expect(res.Hu).toBeGreaterThan(0);
    });
});

describe('brinch hansen logic', () => {
    it('finds balance rotation depth', () => {
        const params: BHParams = {
            soilType: 'sand',
            L: 10,
            D: 1,
            e: 2,
            slices: 20,
            gamma: 18,
            phi: 30
        };
        const res = calculateBrinchHansen(params);
        expect(res.Hu).toBeGreaterThan(0); // Hu acts positively to balance
        expect(res.rotationDepth).toBeLessThan(10);
        expect(res.rotationDepth).toBeGreaterThan(0);
    });
});
