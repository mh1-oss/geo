import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectData } from './storage';
import { classifyPile, computeEI, computeYieldMoment } from './calc/classification';
import { calculateBroms } from './calc/broms';
import { calculateBrinchHansen } from './calc/brinchHansen';

export async function generatePDFReport(project: ProjectData, t: (key: string) => string = (k) => k) {
    const doc = new jsPDF();

    // ==========================================
    // COVER PAGE
    // ==========================================
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(40);
    doc.setFont("helvetica", "bold");
    doc.text("GeoPile Pro", 105, 80, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("Deep Foundation Lateral Analysis Report", 105, 95, { align: 'center' });

    doc.setDrawColor(59, 130, 246); // Blue 500
    doc.setLineWidth(2);
    doc.line(75, 110, 135, 110);

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text(project.name, 105, 130, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 270, { align: 'center' });

    // ==========================================
    // PAGE 2: ANALYSIS RESULTS
    // ==========================================
    doc.addPage();
    doc.setTextColor(30, 41, 59);

    // Calculate values
    const EI = computeEI(project.pile.diameter, project.pile.youngsModulus, project.pile.wallThickness);
    const My = computeYieldMoment(project.pile.diameter, project.pile.yieldStrength, project.pile.wallThickness);
    const modulusParam = project.soil.modulusType === 'constant' ? (project.soil.k || 1) : (project.soil.nh || 1);
    const classification = classifyPile(project.pile.length, EI, project.soil.modulusType, modulusParam);

    const bromsRes = calculateBroms({
        soilType: project.soil.type,
        pileCondition: classification.classification,
        headCondition: 'free',
        L: project.pile.length,
        D: project.pile.diameter,
        yieldMoment: My,
        e: project.load.e,
        cu: project.soil.cu,
        gamma: project.soil.gamma,
        phi: project.soil.phi,
    });

    const bhRes = calculateBrinchHansen({
        soilType: project.soil.type,
        L: project.pile.length,
        D: project.pile.diameter,
        e: project.load.e,
        slices: 30,
        gamma: project.soil.gamma,
        cu: project.soil.cu,
        phi: project.soil.phi,
    });

    // Header Page 2
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(t('Input Parameters'), 14, 22);

    // 1. Soil and Pile Details
    autoTable(doc, {
        startY: 30,
        head: [[t('Parameter Block'), t('Property'), t('Value')]],
        body: [
            [{ content: 'Soil Model', rowSpan: 4, styles: { valign: 'middle', halign: 'center', fillColor: [241, 245, 249] } }, t('Soil Type'), project.soil.type === 'clay' ? t('Clay') : t('Sand')],
            [t('Unit Weight (γ)'), `${project.soil.gamma} kN/m³`],
            [project.soil.type === 'clay' ? t('Undrained Shear (Cu)') : t('Friction Angle (φ)'), project.soil.type === 'clay' ? `${project.soil.cu} kPa` : `${project.soil.phi}°`],
            [t('Modulus Type'), t(project.soil.modulusType === 'constant' ? 'Constant (k)' : 'Linearly Increasing (nh)')],
            [{ content: 'Pile Geometry', rowSpan: 4, styles: { valign: 'middle', halign: 'center', fillColor: [241, 245, 249] } }, t('Diameter (D)'), `${project.pile.diameter} m`],
            [t('Embedment Length (L)'), `${project.pile.length} m`],
            [t('Load Eccentricity (e)'), `${project.load.e} m`],
            [t('Yield Moment (My)'), `${My.toFixed(1)} kN.m`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] }
    });

    // classification
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(t('Lateral Capacity Results'), 14, currentY);

    // 2. Lateral Results Table
    autoTable(doc, {
        startY: currentY + 8,
        head: [[t('Metric'), t('Broms Method'), t('Brinch Hansen')]],
        body: [
            [t('Pile Classification'), { content: t(classification.classification.toUpperCase()), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }],
            [t('Ultimate Capacity (Hu)'), `${bromsRes.Hu.toFixed(1)} kN`, `${bhRes.Hu.toFixed(1)} kN`],
            [t('Max Moment'), `${bromsRes.Mmax.toFixed(1)} kN.m`, 'Derived Numerically'],
            [t('Critical / Rotation Depth'), `${bromsRes.criticalDepth.toFixed(2)} m`, `${bhRes.rotationDepth.toFixed(2)} m`],
            [t('Governing Failure Mode'), t(bromsRes.failureMode), t('Soil Rotation Yield')]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    });

    // 3. Auto-generated Recommendations
    const percentDiff = Math.abs(bromsRes.Hu - bhRes.Hu) / ((bromsRes.Hu + bhRes.Hu) / 2) * 100;
    const recommendedHu = Math.min(bromsRes.Hu, bhRes.Hu);

    let recs = `Based on the deep foundation lateral analysis, the pile exhibits a ${classification.classification.toUpperCase()} behavior with L/${classification.factorName} = ${classification.L_over_factor.toFixed(2)}. `;

    if (bromsRes.failureMode.includes('Yield')) {
        recs += `The structural yield moment of the pile (My = ${My.toFixed(0)} kN.m) governs the capacity under Broms methodology. Consider increasing wall thickness or yield strength to achieve higher lateral resistance. `;
    } else {
        recs += `The soil strength limits the capacity before the pile structural yield is reached. Thus, the system fails via short-pile rotation. `;
    }

    recs += `\n\nMethod Comparison: The analytical models present a ${percentDiff.toFixed(1)}% variance in ultimate capacity prediction. Given standard practice, the minimum ultimate lateral resistance is ${recommendedHu.toFixed(1)} kN. Using a factor of safety of 3.0, the recommended allowable lateral load is ${(recommendedHu / 3).toFixed(1)} kN. `;

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate 900
    doc.text(t('Engineering Recommendations & Insight'), 14, (doc as any).lastAutoTable.finalY + 15);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // slate 500
    const splitText = doc.splitTextToSize(recs, 180);
    doc.text(splitText, 14, (doc as any).lastAutoTable.finalY + 22);

    doc.save(`${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`);
}
