import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useProject } from '../store/ProjectContext';
import { useLanguage } from '../store/LanguageContext';

// Animated Arrow Component
function LoadArrow({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state: any) => {
        if (groupRef.current) {
            // Slight oscillation effect for the load arrow
            groupRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 4) * 0.1;
        }
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Arrow Base / Line */}
            <mesh position={[-1.5 * scale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05 * scale, 0.05 * scale, 3 * scale, 8]} />
                <meshStandardMaterial color="#ef4444" />
            </mesh>
            {/* Arrow Head */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[0.25 * scale, 0.7 * scale, 16]} />
                <meshStandardMaterial color="#ef4444" />
            </mesh>
            <Text
                position={[-1.5 * scale, 0.5 * scale, 0]}
                fontSize={0.4 * scale}
                color="#ef4444"
                anchorX="center"
                anchorY="middle"
            >
                H_u
            </Text>
        </group>
    );
}

function Scene({ project }: { project: any }) {
    const { pile, soil, load } = project;

    // Scale Down variables so they fit nicely in view without clipping
    const scaleFactor = 5 / Math.max(pile.length, 10);
    const D = pile.diameter * scaleFactor;
    const L = pile.length * scaleFactor;
    const e = load.e * scaleFactor;

    const soilColor = soil.type === 'clay' ? '#d6c8b3' : '#e6dabb';
    const soilHeight = L + 3; // Soil goes deeper than pile

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <Environment preset="city" />

            {/* Pile */}
            <mesh position={[0, (-L / 2) + e, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[D / 2, D / 2, L + e, 32]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
            </mesh>

            {/* Load Arrow at top of pile (z=0, y=e) */}
            <LoadArrow position={[-D / 2 - 0.2, e, 0]} scale={scaleFactor * 2} />

            {/* Soil Plane / Layer */}
            <mesh position={[0, -soilHeight / 2, 0]} receiveShadow>
                <boxGeometry args={[15, soilHeight, 15]} />
                <meshStandardMaterial color={soilColor} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>

            {/* Ground Grid */}
            <Grid
                position={[0, 0.01, 0]}
                args={[15, 15]}
                cellSize={1}
                cellThickness={1}
                cellColor="#64748b"
                sectionSize={5}
                sectionThickness={1.5}
                sectionColor="#334155"
                fadeDistance={25}
            />

            {/* Base Contact Shadow */}
            <ContactShadows resolution={512} scale={15} blur={2} opacity={0.6} far={10} color="#000000" />

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                maxPolarAngle={Math.PI / 2 - 0.05} // don't go below ground easily
                target={[0, -L / 3, 0]}
            />
        </>
    );
}

export function Pile3DView() {
    const { activeProject } = useProject();
    const { t } = useLanguage();

    if (!activeProject) return null;

    return (
        <div className="w-full h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden hidden-scroll">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-lg font-bold text-slate-800 drop-shadow-sm">{t('3D WebGL View')}</h3>
                <p className="text-sm text-slate-600 drop-shadow-sm">{t('Left click to rotate, scroll to zoom')}</p>
            </div>

            <div className="flex-1 w-full relative bg-slate-50 cursor-move rounded-xl overflow-hidden">
                <Canvas shadows camera={{ position: [8, 5, 12], fov: 45 }}>
                    <Scene project={activeProject} />
                </Canvas>
            </div>
        </div>
    );
}
