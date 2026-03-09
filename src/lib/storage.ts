import { SoilParams, PileParams, LoadParams } from './calc/types';

export interface SoilLayer {
    id: string;
    name: string;
    type: 'clay' | 'sand' | 'silt' | 'gravel' | 'rock';
    thickness: number;       // m
    unitWeight: number;      // kN/m³
    cu?: number;             // kPa (undrained shear strength for clay)
    phi?: number;            // degrees (friction angle for sand)
    spt?: number;            // SPT N-value
    color: string;
}

export interface PipePileParams {
    L1: number;  // Penetration depth (m)
    L2: number;  // Plug length (m)
    D1: number;  // Outer diameter (mm)
    D2: number;  // Wall thickness (mm)
}

export interface LoadTestStep {
    step: number;
    load: number;        // kN
    settlement: number;  // mm
    holdTime: number;    // minutes
    status: 'completed' | 'active' | 'scheduled';
}

export interface LoadTestData {
    method: string;
    failureCriteria: string;
    pileDiameter: number;   // mm
    pileLength: number;     // m
    pileArea?: number;      // mm² (optional, for non-circular piles)
    elasticModulus?: number; // MPa (optional, defaults to 30000)
    material: string;
    steps: LoadTestStep[];
    ultimateCapacity: number | null;
    maxSettlement: number | null;
    safeWorkLoad: number | null;
}

export interface LateralParams {
    pileLength: number;      // m
    diameter: number;        // mm
    stickUp: number;         // m
    youngsModulus: number;    // GPa
    momentOfInertia: number; // m⁴
    headCondition: 'free' | 'fixed';
    shearLoad: number;       // kN
    momentLoad: number;      // kN·m
    axialLoad: number;       // kN
}

export interface AxialParams {
    pileType: string;
    diameter: number;     // mm
    length: number;       // m
    alphaFactor: number;
    ksFactor: number;
    nqFactor: number;
}

export interface ProjectData {
    id: string;
    name: string;
    lastModified: number;
    soil: SoilParams;
    pile: PileParams;
    load: LoadParams;
    // Extended data
    soilLayers?: SoilLayer[];
    pipePile?: PipePileParams;
    loadTest?: LoadTestData;
    lateral?: LateralParams;
    axial?: AxialParams;
}

const DEFAULT_SOIL_LAYERS: SoilLayer[] = [
    { id: 'l1', name: 'Fill Material', type: 'sand', thickness: 2.0, unitWeight: 17.0, phi: 28, spt: 8, color: '#8B7355' },
    { id: 'l2', name: 'Soft Clay', type: 'clay', thickness: 5.0, unitWeight: 16.5, cu: 25, spt: 4, color: '#6B8E6B' },
    { id: 'l3', name: 'Medium Clay', type: 'clay', thickness: 8.0, unitWeight: 18.0, cu: 60, spt: 12, color: '#4A7A4A' },
    { id: 'l4', name: 'Dense Sand', type: 'sand', thickness: 6.0, unitWeight: 19.5, phi: 35, spt: 30, color: '#D4A76A' },
    { id: 'l5', name: 'Very Dense Sand', type: 'sand', thickness: 10.0, unitWeight: 20.0, phi: 40, spt: 50, color: '#C49B5C' },
];

const DEFAULT_LOAD_TEST: LoadTestData = {
    method: 'Static Axial (ASTM D1143)',
    failureCriteria: 'Davisson Offset Limit',
    pileDiameter: 600,
    pileLength: 24.5,
    material: 'Concrete (C40)',
    steps: [
        { step: 1, load: 0, settlement: 0, holdTime: 10, status: 'completed' },
        { step: 2, load: 625, settlement: 1.24, holdTime: 15, status: 'completed' },
        { step: 3, load: 1250, settlement: 3.15, holdTime: 20, status: 'completed' },
        { step: 4, load: 1875, settlement: 5.80, holdTime: 20, status: 'completed' },
        { step: 5, load: 2500, settlement: 8.45, holdTime: 30, status: 'completed' },
        { step: 6, load: 3125, settlement: 12.30, holdTime: 30, status: 'completed' },
        { step: 7, load: 3750, settlement: 18.50, holdTime: 30, status: 'completed' },
        { step: 8, load: 4375, settlement: 28.40, holdTime: 30, status: 'completed' },
    ],
    ultimateCapacity: null,
    maxSettlement: null,
    safeWorkLoad: null,
};

export const SEED_PROJECTS: ProjectData[] = [
    {
        id: 'seed-clay-1',
        name: 'Burj Terminal Expansion',
        lastModified: Date.now() - 7200000,
        soil: {
            type: 'clay',
            gamma: 16.5,
            cu: 40,
            modulusType: 'constant',
            k: 2.5
        },
        pile: {
            diameter: 1.2,
            length: 25,
            yieldStrength: 350,
            youngsModulus: 210,
            wallThickness: 0.025
        },
        load: { e: 2.5 },
        soilLayers: DEFAULT_SOIL_LAYERS,
        pipePile: { L1: 24.50, L2: 18.35, D1: 914, D2: 19 },
        loadTest: { ...DEFAULT_LOAD_TEST },
        lateral: {
            pileLength: 24.0, diameter: 1200, stickUp: 0.5,
            youngsModulus: 28.5, momentOfInertia: 0.1017,
            headCondition: 'free', shearLoad: 850, momentLoad: 420, axialLoad: 2500
        },
        axial: {
            pileType: 'Bored Pile (Drilled Shaft)',
            diameter: 1200, length: 24.5,
            alphaFactor: 0.65, ksFactor: 0.70, nqFactor: 45.0
        }
    },
    {
        id: 'seed-sand-1',
        name: 'Marina Tower B',
        lastModified: Date.now() - 3600000,
        soil: {
            type: 'sand',
            gamma: 19.0,
            phi: 35,
            modulusType: 'linear',
            nh: 15
        },
        pile: {
            diameter: 0.8,
            length: 15,
            yieldStrength: 350,
            youngsModulus: 210,
            wallThickness: 0.020
        },
        load: { e: 1.0 },
        soilLayers: [
            { id: 'l1', name: 'Loose Sand', type: 'sand', thickness: 3.0, unitWeight: 17.0, phi: 28, spt: 10, color: '#D4A76A' },
            { id: 'l2', name: 'Medium Sand', type: 'sand', thickness: 5.0, unitWeight: 18.5, phi: 32, spt: 22, color: '#C49B5C' },
            { id: 'l3', name: 'Dense Sand', type: 'sand', thickness: 7.0, unitWeight: 19.5, phi: 38, spt: 40, color: '#B08D4E' },
        ],
        pipePile: { L1: 15.0, L2: 11.5, D1: 800, D2: 16 },
        axial: {
            pileType: 'Driven Pile (Precast)',
            diameter: 800, length: 15.0,
            alphaFactor: 0.50, ksFactor: 0.80, nqFactor: 40.0
        }
    },
    {
        id: 'seed-clay-2',
        name: 'Highway 75 Overpass',
        lastModified: Date.now() - 86400000,
        soil: {
            type: 'clay',
            gamma: 17.5,
            cu: 55,
            modulusType: 'constant',
            k: 3.0
        },
        pile: {
            diameter: 1.0,
            length: 20,
            yieldStrength: 350,
            youngsModulus: 210,
            wallThickness: 0.022
        },
        load: { e: 1.5 },
        soilLayers: [
            { id: 'l1', name: 'Topsoil', type: 'silt', thickness: 1.5, unitWeight: 16.0, cu: 15, spt: 3, color: '#7A6B5D' },
            { id: 'l2', name: 'Stiff Clay', type: 'clay', thickness: 10.0, unitWeight: 18.5, cu: 70, spt: 18, color: '#5A8A5A' },
            { id: 'l3', name: 'Hard Clay', type: 'clay', thickness: 8.5, unitWeight: 19.0, cu: 120, spt: 35, color: '#3A6A3A' },
        ],
        axial: {
            pileType: 'Bored Pile (Drilled Shaft)',
            diameter: 1000, length: 20.0,
            alphaFactor: 0.55, ksFactor: 0.65, nqFactor: 35.0
        }
    }
];

export function loadProjects(): ProjectData[] {
    try {
        const raw = localStorage.getItem('deep-foundation-projects');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (err) {
        console.error('Failed to load projects from localStorage', err);
    }

    // Seed initial projects
    saveProjects(SEED_PROJECTS);
    return SEED_PROJECTS;
}

export function saveProjects(projects: ProjectData[]) {
    try {
        localStorage.setItem('deep-foundation-projects', JSON.stringify(projects));
    } catch (err) {
        console.error('Failed to save projects to localStorage', err);
    }
}
