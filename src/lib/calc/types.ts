export type SoilType = 'clay' | 'sand';
export type BoundaryCondition = 'free' | 'fixed';
export type ModulusType = 'constant' | 'linear';

export interface SoilParams {
    type: SoilType;
    gamma: number; // kN/m3
    cu?: number; // kPa (clay)
    phi?: number; // degrees (sand)
    modulusType: ModulusType;
    k?: number; // MN/m2 (or kPa equivalent) depending on user units
    nh?: number; // MN/m3 (or kN/m3)
}

export interface PileParams {
    diameter: number; // m
    length: number; // m
    yieldStrength: number; // MPa
    youngsModulus: number; // GPa
    wallThickness?: number; // m (if pipe)
}

export interface LoadParams {
    e: number; // m (applied load height above ground)
}

export interface ClassificationResult {
    stiffnessFactor: number;
    factorName: 'R' | 'T';
    classification: 'rigid' | 'long' | 'intermediate';
    L_over_factor: number;
}
