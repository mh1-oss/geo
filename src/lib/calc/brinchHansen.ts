export interface BHParams {
    soilType: 'clay' | 'sand';
    L: number;
    D: number;
    e: number; // load eccentricity
    slices: number; // e.g. 10 - 30
    gamma?: number;
    cu?: number;
    phi?: number;
}

export interface BHDistribution {
    depth: number;
    reaction: number; // kN/m
    shear: number; // kN
    moment: number; // kN.m
}

export interface BHResult {
    Hu: number; // kN
    rotationDepth: number; // m
    reactions: BHDistribution[];
    warnings: string[];
}

export function calculateBrinchHansen(params: BHParams): BHResult {
    const { soilType, L, D, e, slices, gamma, cu, phi } = params;
    const warnings: string[] = ["Educational simplified implementation of Brinch Hansen."];

    const dz = L / slices;
    let bestX = L / 2;
    let minMomentUnbalance = Infinity;
    let finalHu = 0;
    let finalReactions: BHDistribution[] = [];

    // Pq and Pc factors
    let Kq = 1;
    let Kc = 1;
    if (soilType === 'sand' && phi) {
        const phiRad = phi * Math.PI / 180;
        // Simplified passive pressure approach
        const Kp = Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);
        Kq = Kp * Kp; // Roughly Kq according to BH
    } else if (soilType === 'clay' && cu) {
        Kc = 9; // Max Nc for deep clay
    }

    // Iterate over possible rotation points
    for (let step = 1; step < slices; step++) {
        const x = step * dz; // trial point of rotation
        let sumForces = 0;
        let sumMomentsBase = 0; // Moment about the top load application point (z = -e)

        const tempReactions: BHDistribution[] = [];

        for (let i = 0; i < slices; i++) {
            const z = i * dz + dz / 2; // mid-depth of slice
            let p_ult = 0;

            if (soilType === 'sand' && gamma) {
                // p_ult = gamma * z * Kq * D
                // Simplified depth factor
                const depthFactor = Math.min(Kq, 1 + Kq * z / D);
                p_ult = gamma * z * depthFactor * D;
            } else if (soilType === 'clay' && cu) {
                // p_ult = cu * Nc * D
                const Nc = Math.min(Kc, 2 + 7 * z / (3 * D)); // varies from 2 to 9
                p_ult = cu * Nc * D;
            }

            // Above rotation point, soil resists laterally pushing backwards
            // Below rotation point, soil resists in the opposite direction
            const sign = (z < x) ? 1 : -1;
            const F = sign * p_ult * dz;

            tempReactions.push({ depth: z, reaction: sign * p_ult, shear: 0, moment: 0 });

            sumForces += F;
            // moment = force * arm about applied load (z + e)
            sumMomentsBase += F * (z + e);
        }

        // To balance moments, sumMomentsBase must be 0? 
        // Actually, Hu applied at z=-e balances the internal soil moments? 
        // No. If we take moment about applied load, Hu has 0 lever arm.
        // So the SOIL MOMENTS about z=-e MUST BE ZERO for equilibrium!
        const unbalance = Math.abs(sumMomentsBase);
        if (unbalance < minMomentUnbalance) {
            minMomentUnbalance = unbalance;
            bestX = x;
            // Hu must balance the horizontal forces: Hu = sum(Soil Forces above) - sum(Soil Forces below)
            finalHu = sumForces; // sumForces already incorporates sign
            finalReactions = tempReactions;
        }
    }

    // Now that we have finalHu and finalReactions, calculate continuous Shear and Moment
    let currentV = finalHu;
    let currentM = finalHu * e;

    // Add shear and moment properties to finalReactions
    const derivedDistributions: BHDistribution[] = finalReactions.map((item) => {
        // Reaction is in kN/m, slice force is reaction * dz
        // The reaction opposes the positive shear
        const sliceForce = item.reaction * dz;

        // Value at the *bottom* of the slice:
        const nextV = currentV - sliceForce;
        // M_next = M_curr + V_curr * dz - sliceForce * dz / 2
        const nextM = currentM + currentV * dz - sliceForce * (dz / 2);

        // We can record the value at the center of the slice for plotting
        const plotV = currentV - sliceForce / 2;
        const plotM = currentM + currentV * (dz / 2) - sliceForce * (dz / 8);

        currentV = nextV;
        currentM = nextM;

        return {
            ...item,
            shear: plotV,
            moment: plotM
        };
    });

    return {
        Hu: finalHu,
        rotationDepth: bestX,
        reactions: derivedDistributions,
        warnings
    };
}
