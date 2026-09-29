import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { HeightfieldData, Project, SelectedPointInfo, ViewMode } from '../types';
import { buildTerrainGeometry, createDefaultGridTexture } from './terrainUtils';

interface TerrainMeshProps {
  heightfield: HeightfieldData;
  project: Project;
  viewMode: ViewMode;
  wireframe: boolean;
  verticalExaggeration: number;
  onPointClick: (info: SelectedPointInfo) => void;
  onPointHover?: (info: { x: number; y: number; elevation: number }) => void;
}

export const TerrainMesh: React.FC<TerrainMeshProps> = ({
  heightfield,
  project,
  viewMode,
  wireframe,
  verticalExaggeration,
  onPointClick,
  onPointHover,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Asynchronously loaded textures dictionary
  const [textures, setTextures] = useState<{ [key: string]: THREE.Texture | null }>({
    rgb: null,
    depth: null,
    elevation: null,
    hillshade: null,
    slope: null,
  });

  // Default fallback texture so rendering is instant on frame 1
  const defaultTexture = useMemo(() => createDefaultGridTexture(), []);

  // Load project textures safely via TextureLoader without freezing Suspense
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let isMounted = true;

    const urls: { [key: string]: string | undefined | null } = {
      rgb: project.image_url,
      depth: project.depth_map_url,
      elevation: project.dsm_url,
      hillshade: project.hillshade_url,
      slope: project.slope_map_url,
    };

    const loadedMap: { [key: string]: THREE.Texture } = {};

    Object.entries(urls).forEach(([key, url]) => {
      if (!url) return;
      loader.load(
        url,
        (tex) => {
          if (!isMounted) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          loadedMap[key] = tex;
          setTextures((prev) => ({ ...prev, [key]: tex }));
        },
        undefined,
        (err) => {
          console.warn(`[TerrainMesh] Could not load texture for ${key}:`, err);
        }
      );
    });

    return () => {
      isMounted = false;
    };
  }, [
    project.image_url,
    project.depth_map_url,
    project.dsm_url,
    project.hillshade_url,
    project.slope_map_url,
  ]);

  // Construct solid 3D terrain geometry with skirts
  const geometry = useMemo(() => {
    return buildTerrainGeometry(heightfield, verticalExaggeration, 24, -1.2);
  }, [heightfield, verticalExaggeration]);

  // Determine active texture for the chosen View Mode
  const activeTexture = useMemo(() => {
    if (viewMode === 'depth' && textures.depth) return textures.depth;
    if (viewMode === 'elevation' && textures.elevation) return textures.elevation;
    if (viewMode === 'hillshade' && textures.hillshade) return textures.hillshade;
    if (viewMode === 'slope' && textures.slope) return textures.slope;
    if (textures.rgb) return textures.rgb;
    return defaultTexture;
  }, [viewMode, textures, defaultTexture]);

  // Handle raycast click on terrain surface
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!e.uv) return;

    const u = Math.min(Math.max(e.uv.x, 0), 1);
    const v = Math.min(Math.max(e.uv.y, 0), 1);

    const gw = heightfield.grid_width;
    const gh = heightfield.grid_height;

    // Col 0 is left (U=0), Col gw-1 is right (U=1)
    const col = Math.min(Math.floor(u * (gw - 1)), gw - 1);
    // Row 0 is top (V=1), Row gh-1 is bottom (V=0)
    const row = Math.min(Math.floor((1 - v) * (gh - 1)), gh - 1);

    const elevationVal =
      heightfield.heights[row] && heightfield.heights[row][col] !== undefined
        ? heightfield.heights[row][col]
        : 0;
    const relDepthVal =
      heightfield.normalized_heights[row] && heightfield.normalized_heights[row][col] !== undefined
        ? heightfield.normalized_heights[row][col]
        : 0;

    // Finite difference slope and aspect calculation at clicked point
    const rPrev = Math.max(0, row - 1);
    const rNext = Math.min(gh - 1, row + 1);
    const cPrev = Math.max(0, col - 1);
    const cNext = Math.min(gw - 1, col + 1);

    const dz_dx = (heightfield.heights[row][cNext] - heightfield.heights[row][cPrev]) / Math.max(1, cNext - cPrev);
    const dz_dy = (heightfield.heights[rNext][col] - heightfield.heights[rPrev][col]) / Math.max(1, rNext - rPrev);

    const slopeDeg = Math.round(Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy)) * (180 / Math.PI) * 10) / 10;
    const aspectDeg = Math.round((Math.atan2(dz_dy, -dz_dx) * (180 / Math.PI) + 360) % 360);

    // Georeferenced coordinates if bounds exist
    let lat: number | null = null;
    let lon: number | null = null;
    const meta = project.image_metadata;
    if (meta && meta.is_georeferenced && meta.bounds && meta.bounds.length === 4) {
      const [minX, minY, maxX, maxY] = meta.bounds;
      lon = Number((minX + u * (maxX - minX)).toFixed(5));
      lat = Number((minY + v * (maxY - minY)).toFixed(5));
    }

    onPointClick({
      x: Number(e.point.x.toFixed(2)),
      y: Number(e.point.z.toFixed(2)),
      z: Number(e.point.y.toFixed(2)),
      elevation: Number(elevationVal.toFixed(2)),
      relativeDepth: Number(relDepthVal.toFixed(2)),
      latitude: lat,
      longitude: lon,
      slope: slopeDeg,
      aspect: aspectDeg,
      isMetric: heightfield.is_metric,
    });
  };

  return (
    <group>
      {/* Primary Displaced Solid Terrain Mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          if (e.uv && onPointHover) {
            const u = Math.min(Math.max(e.uv.x, 0), 1);
            const v = Math.min(Math.max(e.uv.y, 0), 1);
            const col = Math.min(Math.floor(u * (heightfield.grid_width - 1)), heightfield.grid_width - 1);
            const row = Math.min(Math.floor((1 - v) * (heightfield.grid_height - 1)), heightfield.grid_height - 1);
            const el = heightfield.heights[row] ? heightfield.heights[row][col] || 0 : 0;
            onPointHover({ x: e.point.x, y: e.point.z, elevation: el });
          }
        }}
        receiveShadow
        castShadow
      >
        {viewMode === 'elevation' && !textures.elevation ? (
          // Dynamic Vertex Color Turbo shader when texture isn't ready
          <meshStandardMaterial
            vertexColors
            roughness={0.65}
            metalness={0.1}
            wireframe={wireframe}
          />
        ) : (
          <meshStandardMaterial
            map={activeTexture}
            roughness={viewMode === 'hillshade' ? 0.9 : 0.65}
            metalness={0.08}
            wireframe={wireframe}
          />
        )}
      </mesh>

      {/* Wireframe Overlay: Crisp glowing cyan grid on top of terrain */}
      {wireframe && (
        <mesh geometry={geometry} position={[0, 0.02, 0]}>
          <meshBasicMaterial
            color="#00E5FF"
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Base Pedestal Platform / Foundation */}
      <mesh position={[0, -1.3, 0]} receiveShadow>
        <boxGeometry args={[24.2, 0.2, (24 / (heightfield.aspect_ratio || 1.0)) + 0.2]} />
        <meshStandardMaterial color="#0A0F1D" roughness={0.9} metalness={0.2} />
      </mesh>
    </group>
  );
};
