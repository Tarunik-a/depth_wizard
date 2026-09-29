import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Measurement } from '../types';

interface MeasurementMarkersProps {
  measurements: Measurement[];
  activePoints?: { x: number; y: number; z: number }[];
}

function to3DPosition(pt: { x: number; y: number; z: number }): [number, number, number] {
  // If stored in pixel coordinates (e.g. x > 20 or y > 20)
  if (Math.abs(pt.x) > 20 || Math.abs(pt.y) > 20) {
    const u = Math.min(Math.max(pt.x / 512, 0), 1);
    const v = Math.min(Math.max(pt.y / 512, 0), 1);
    const x3d = (u - 0.5) * 24;
    const z3d = (v - 0.5) * 24;
    // Map elevation [38m, 72m] or [0, 100] to 3D surface height
    const normH = Math.max(0, Math.min(1, (pt.z - 38) / Math.max(1, 72 - 38)));
    const y3d = normH * 4.2 * 1.2 + 0.25;
    return [x3d, y3d, z3d];
  }
  // Otherwise point is already in 3D scene coordinates: [x, depth_y, height_z]
  // Three.js uses [X, Y(up), Z(forward/back)]
  return [pt.x, Math.max(0.1, pt.z + 0.2), pt.y];
}

export const MeasurementMarkers: React.FC<MeasurementMarkersProps> = ({
  measurements,
  activePoints = [],
}) => {
  return (
    <group>
      {/* Existing saved measurements */}
      {measurements.map((m) => {
        const start = to3DPosition(m.start_point);
        const end = m.end_point ? to3DPosition(m.end_point) : null;

        // Midpoint for label
        const mid: [number, number, number] = end
          ? [(start[0] + end[0]) / 2, Math.max(start[1], end[1]) + 0.6, (start[2] + end[2]) / 2]
          : [start[0], start[1] + 0.8, start[2]];

        return (
          <group key={m.id}>
            {/* Start marker */}
            <mesh position={start}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={0.6} />
            </mesh>

            {/* End marker & Connecting Line */}
            {end && (
              <>
                <mesh position={end}>
                  <sphereGeometry args={[0.3, 16, 16]} />
                  <meshStandardMaterial color="#00E676" emissive="#00E676" emissiveIntensity={0.6} />
                </mesh>
                <line>
                  <bufferGeometry
                    attach="geometry"
                    {...(() => {
                      const geom = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(...start),
                        new THREE.Vector3(...end),
                      ]);
                      return geom;
                    })()}
                  />
                  <lineBasicMaterial attach="material" color="#00E5FF" linewidth={3} />
                </line>
              </>
            )}

            {/* Label billboard */}
            <Html position={mid} center distanceFactor={22}>
              <div className="bg-dw-surface/95 text-slate-100 border border-dw-cyan text-[11px] font-mono px-2.5 py-1 rounded-md shadow-2xl whitespace-nowrap pointer-events-none flex items-center gap-1.5 backdrop-blur-md">
                <span className="text-dw-cyan font-bold uppercase">{m.type}:</span>
                <span className="font-bold text-white">{m.value} {m.unit}</span>
              </div>
            </Html>
          </group>
        );
      })}

      {/* Active in-progress points */}
      {activePoints.map((pt, idx) => {
        const pos = to3DPosition(pt);
        return (
          <mesh key={`active-${idx}`} position={pos}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#FFB300" emissive="#FFB300" emissiveIntensity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

