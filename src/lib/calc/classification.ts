import { ModulusType, ClassificationResult } from './types';

export function classifyPile(
    L: number,
    EI: number,
    modulusType: ModulusType,
    k: number, // Use k for constant, nh for linear
): ClassificationResult {
    let stiffnessFactor = 0;
    let factorName: 'R' | 'T' = 'R';
    let classification: 'rigid' | 'long' | 'intermediate' = 'intermediate';

    if (modulusType === 'constant') {
        // User requested: R = sqrt(EI/k), standard is R = (EI/k*d)^0.25
        // Implementing exact user request: R = sqrt(EI/k)
        stiffnessFactor = Math.sqrt(EI / k);
        factorName = 'R';
    } else {
        // T = (EI/nh)^(1/5)
        stiffnessFactor = Math.pow(EI / k, 0.2);
        factorName = 'T';
    }

    const ratio = L / stiffnessFactor;
    if (ratio <= 2) {
        classification = 'rigid';
    } else if (ratio >= 4) {
        classification = 'long';
    } else {
        classification = 'intermediate';
    }

    return {
        stiffnessFactor,
        factorName,
        classification,
        L_over_factor: ratio,
    };
}

export function computeEI(diameter: number, youngsModulus: number, wallThickness?: number): number {
    // youngsModulus in GPa -> convert to suitable units (e.g. kPa)
    const E = youngsModulus * 1000000; // kPa
    const rOuter = diameter / 2;
    const rInner = wallThickness ? (diameter / 2 - wallThickness) : 0;
    const I = (Math.PI / 4) * (Math.pow(rOuter, 4) - Math.pow(rInner, 4));
    return E * I; // kN.m2
}

export function computeYieldMoment(diameter: number, yieldStrength: number, wallThickness?: number): number {
    const fy = yieldStrength * 1000; // kPa
    const rOuter = diameter / 2;
    const rInner = wallThickness ? (diameter / 2 - wallThickness) : 0;
    const I = (Math.PI / 4) * (Math.pow(rOuter, 4) - Math.pow(rInner, 4));
    const Z = I / rOuter; // Section modulus
    return fy * Z; // kN.m
}
