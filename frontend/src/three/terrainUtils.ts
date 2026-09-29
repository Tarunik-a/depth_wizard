import * as THREE from 'three';
import { HeightfieldData } from '../types';

/**
 * Approximate Turbo Colormap for scientific elevation visualization.
 * Maps normalized elevation t in [0, 1] to an RGB color.
 * Low: Deep blue/cyan -> Mid: Green/Yellow -> High: Orange/Red/Magenta
 */
export function turboColormap(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));

  // Polynomial approximation of Google's Turbo colormap
  const r = Math.sin(clamped * Math.PI * 1.5 - 0.2) * 0.5 + 0.5;
  const g = Math.sin(clamped * Math.PI * 2.0 - 0.5) * 0.5 + 0.5;
  const b = Math.cos(clamped * Math.PI * 1.4) * 0.5 + 0.5;

  const color = new THREE.Color();
  // Refined scientific palette
  if (clamped < 0.25) {
    const s = clamped / 0.25;
    color.setRGB(0.18 + s * 0.05, 0.25 + s * 0.45, 0.85 - s * 0.1);
  } else if (clamped < 0.5) {
    const s = (clamped - 0.25) / 0.25;
    color.setRGB(0.23 + s * 0.45, 0.70 + s * 0.25, 0.75 - s * 0.55);
  } else if (clamped < 0.75) {
    const s = (clamped - 0.5) / 0.25;
    color.setRGB(0.68 + s * 0.30, 0.95 - s * 0.25, 0.20 - s * 0.15);
  } else {
    const s = (clamped - 0.75) / 0.25;
    color.setRGB(0.98 + s * 0.02, 0.70 - s * 0.55, 0.05 + s * 0.25);
  }

  return color;
}

/**
 * Creates a procedural fallback canvas texture (dark GIS satellite grid).
 */
export function createDefaultGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark slate background
  ctx.fillStyle = '#0D1525';
  ctx.fillRect(0, 0, 512, 512);

  // Grid lines
  ctx.strokeStyle = '#1E2D4A';
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x <= 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Center crosshair
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(240, 240, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Builds a complete solid 3D terrain block BufferGeometry from a 2D Heightfield.
 * Generates:
 * 1. Surface displaced vertices & UVs
 * 2. Surface vertex colors (Turbo colormap)
 * 3. Base skirts around the 4 borders down to baseDepth (-1.5)
 */
export function buildTerrainGeometry(
  heightfield: HeightfieldData,
  verticalExaggeration: number = 1.2,
  sizeX: number = 24,
  baseDepth: number = -1.2
): THREE.BufferGeometry {
  const gw = heightfield.grid_width;
  const gh = heightfield.grid_height;
  const aspect = heightfield.aspect_ratio || 1.0;
  const sizeZ = sizeX / aspect;
  const heights = heightfield.normalized_heights;

  const maxElevation = 4.2 * verticalExaggeration;

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Helper function to get height safely
  const getHeight = (row: number, col: number) => {
    if (row < 0) row = 0;
    if (row >= gh) row = gh - 1;
    if (col < 0) col = 0;
    if (col >= gw) col = gw - 1;
    return (heights[row] && heights[row][col] !== undefined) ? heights[row][col] : 0;
  };

  // 1. Generate Surface Vertices (gw x gh)
  for (let i = 0; i < gh; i++) {
    for (let j = 0; j < gw; j++) {
      const u = j / (gw - 1);
      const v = 1 - i / (gh - 1); // 1 at top row, 0 at bottom row

      const x = (u - 0.5) * sizeX;
      const z = (1 - v - 0.5) * sizeZ; // maps row 0 to top (-Z)
      const hNorm = getHeight(i, j);
      const y = hNorm * maxElevation;

      positions.push(x, y, z);
      uvs.push(u, v);

      const c = turboColormap(hNorm);
      colors.push(c.r, c.g, c.b);
    }
  }

  // 2. Generate Surface Triangles
  for (let i = 0; i < gh - 1; i++) {
    for (let j = 0; j < gw - 1; j++) {
      const a = i * gw + j;
      const b = i * gw + (j + 1);
      const c = (i + 1) * gw + (j + 1);
      const d = (i + 1) * gw + j;

      // Two triangles per quad cell
      indices.push(a, d, c);
      indices.push(a, c, b);
    }
  }

  // 3. Generate Skirts (Side borders dropping down to baseDepth for solid 3D block)
  const addSkirtEdge = (
    coordIndices: number[],
    getUV: (idx: number, isBottom: boolean) => [number, number]
  ) => {
    for (let k = 0; k < coordIndices.length - 1; k++) {
      const topIdx1 = coordIndices[k];
      const topIdx2 = coordIndices[k + 1];

      const x1 = positions[topIdx1 * 3];
      const y1 = positions[topIdx1 * 3 + 1];
      const z1 = positions[topIdx1 * 3 + 2];

      const x2 = positions[topIdx2 * 3];
      const y2 = positions[topIdx2 * 3 + 1];
      const z2 = positions[topIdx2 * 3 + 2];

      // Add two bottom vertices
      const botIdx1 = positions.length / 3;
      positions.push(x1, baseDepth, z1);
      const uv1 = getUV(k, true);
      uvs.push(uv1[0], uv1[1]);
      colors.push(0.05, 0.08, 0.15); // dark skirt base

      const botIdx2 = positions.length / 3;
      positions.push(x2, baseDepth, z2);
      const uv2 = getUV(k + 1, true);
      uvs.push(uv2[0], uv2[1]);
      colors.push(0.05, 0.08, 0.15);

      // Quad on skirt
      indices.push(topIdx1, botIdx1, botIdx2);
      indices.push(topIdx1, botIdx2, topIdx2);
    }
  };

  // North border (row = 0)
  const northIndices: number[] = [];
  for (let j = 0; j < gw; j++) northIndices.push(0 * gw + j);
  addSkirtEdge(northIndices, (k) => [k / (gw - 1), 1]);

  // South border (row = gh - 1)
  const southIndices: number[] = [];
  for (let j = gw - 1; j >= 0; j--) southIndices.push((gh - 1) * gw + j);
  addSkirtEdge(southIndices, (k) => [1 - k / (gw - 1), 0]);

  // West border (col = 0)
  const westIndices: number[] = [];
  for (let i = gh - 1; i >= 0; i--) westIndices.push(i * gw + 0);
  addSkirtEdge(westIndices, (k) => [0, k / (gh - 1)]);

  // East border (col = gw - 1)
  const eastIndices: number[] = [];
  for (let i = 0; i < gh; i++) eastIndices.push(i * gw + (gw - 1));
  addSkirtEdge(eastIndices, (k) => [1, 1 - k / (gh - 1)]);

  // Construct BufferGeometry
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);

  geom.computeVertexNormals();
  return geom;
}
