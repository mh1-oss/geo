import { analyzeLoadTest } from './src/lib/calc/loadTestMethods';

const mockSteps = [
    { step: 1, load: 0,  settlement: 0.20, holdTime: 10, status: 'completed' },
    { step: 2, load: 15 * 9.81, settlement: 0.77, holdTime: 15, status: 'completed' },
    { step: 3, load: 30 * 9.81, settlement: 1.32, holdTime: 20, status: 'completed' },
    { step: 4, load: 45 * 9.81, settlement: 1.97, holdTime: 20, status: 'completed' },
    { step: 5, load: 60 * 9.81, settlement: 2.67, holdTime: 30, status: 'completed' },
    { step: 6, load: 75 * 9.81, settlement: 3.71, holdTime: 30, status: 'completed' },
    { step: 7, load: 90 * 9.81, settlement: 5.04, holdTime: 30, status: 'completed' } as any
];

const res = analyzeLoadTest('Butler & Hoy', mockSteps, 285, 18);
console.log(res);
