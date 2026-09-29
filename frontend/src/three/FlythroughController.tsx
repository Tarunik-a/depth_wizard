import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export type FlythroughState = 'idle' | 'cinematic' | 'orbit' | 'firstPerson';

interface FlythroughControllerProps {
  state: FlythroughState;
  isPaused: boolean;
  onExit: () => void;
  resetCameraTrigger: number;
}

export const FlythroughController: React.FC<FlythroughControllerProps> = ({
  state,
  isPaused,
  onExit,
  resetCameraTrigger,
}) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const timeRef = useRef<number>(0);

  // Keyboard navigation state for First-Person
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle camera reset
  useEffect(() => {
    if (resetCameraTrigger > 0) {
      camera.position.set(0, 18, 22);
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      timeRef.current = 0;
    }
  }, [resetCameraTrigger, camera]);

  // When switching modes, set initial camera positions
  useEffect(() => {
    if (state === 'cinematic') {
      timeRef.current = 0;
    } else if (state === 'firstPerson') {
      // Position camera close to terrain ground level for immersive first-person walk
      camera.position.set(0, 4, 10);
      camera.lookAt(0, 2, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 2, 0);
        controlsRef.current.update();
      }
    }
  }, [state, camera]);

  useFrame((_, delta) => {
    if (isPaused) return;

    if (state === 'cinematic') {
      // Advance normalized flythrough time
      timeRef.current += delta * 0.28;
      const t = timeRef.current;

      // Cinematic spline path:
      // Loop duration approx 28 seconds (2 * PI / 0.22)
      const angle = t * 0.75;
      
      // Radius modulates between 14 (close canyon sweep) and 24 (high overview)
      const radius = 18 + Math.sin(t * 0.4) * 6;
      
      // Height modulates smoothly between 4.8 (low skimming over roofs) and 18 (survey altitude)
      const height = 10 + Math.cos(t * 0.35) * 6.5 + Math.sin(t * 0.8) * 2.0;

      const camX = Math.sin(angle) * radius;
      const camZ = Math.cos(angle) * radius;

      camera.position.lerp(new THREE.Vector3(camX, Math.max(height, 4.0), camZ), 0.05);

      // Camera lookAt focal tracking: tracks central terrain structures with subtle lead angle
      const lookX = Math.sin(t * 0.3) * 4.5;
      const lookZ = Math.cos(t * 0.3) * 4.5;
      const lookY = 1.5 + Math.sin(t * 0.5) * 1.5;

      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(lookX, lookY, lookZ), 0.05);
        controlsRef.current.update();
      }
    } else if (state === 'orbit') {
      // Continuous smooth 360 circular orbit
      timeRef.current += delta * 0.25;
      const angle = timeRef.current;
      const radius = 22;
      camera.position.x = Math.cos(angle) * radius;
      camera.position.z = Math.sin(angle) * radius;
      camera.position.y = 15;
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    } else if (state === 'firstPerson') {
      // First-Person Walk Controls (WASD + Space/C + Shift)
      const isShift = keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight'];
      const speed = (isShift ? 18.0 : 8.0) * delta;

      // Extract forward and strafe vectors based on current camera orientation
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      // Project forward onto horizontal XZ plane
      forward.y = 0;
      forward.normalize();

      const side = new THREE.Vector3();
      side.crossVectors(camera.up, forward).normalize(); // strafe vector

      if (keysPressed.current['KeyW']) camera.position.addScaledVector(forward, speed);
      if (keysPressed.current['KeyS']) camera.position.addScaledVector(forward, -speed);
      if (keysPressed.current['KeyA']) camera.position.addScaledVector(side, speed);
      if (keysPressed.current['KeyD']) camera.position.addScaledVector(side, -speed);
      if (keysPressed.current['Space']) camera.position.y += speed;
      if (keysPressed.current['KeyC']) camera.position.y = Math.max(camera.position.y - speed, 1.5);

      // Keep minimum height above terrain base
      if (camera.position.y < 1.5) camera.position.y = 1.5;

      // In first-person mode, update OrbitControls target to look forward
      if (controlsRef.current) {
        const targetPos = camera.position.clone().add(forward.multiplyScalar(10));
        controlsRef.current.target.copy(targetPos);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.8}
      panSpeed={0.8}
      zoomSpeed={1.0}
      maxPolarAngle={Math.PI / 2.05} // Prevents looking from beneath the terrain
      minDistance={2.5}
      maxDistance={70.0}
      enabled={state !== 'cinematic'} // allow manual interaction in orbit and first-person
    />
  );
};
