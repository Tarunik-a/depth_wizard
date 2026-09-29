import {
  Project,
  HeightfieldData,
  GCPPoint,
  Measurement,
  ExplainTerrainResponse
} from '../types';

const BASE_URL = '/api';

export const api = {
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${BASE_URL}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async initializeDemo(): Promise<Project> {
    const res = await fetch(`${BASE_URL}/demo/initialize`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to initialize demo dataset');
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch project ${id}`);
    return res.json();
  },

  async createProject(name: string, reconstruction_mode: string = 'relative'): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, reconstruction_mode }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  async uploadAndProcess(
    projectId: string,
    file: File,
    preferredMode: 'relative' | 'metric' = 'relative',
    invertDepth: boolean = false,
    normalizeDepth: boolean = true
  ): Promise<Project> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('preferred_mode', preferredMode);
    formData.append('invert_depth', String(invertDepth));
    formData.append('normalize_depth', String(normalizeDepth));

    const res = await fetch(`${BASE_URL}/projects/${projectId}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload error' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async reprocess(
    projectId: string,
    invertDepth: boolean = false,
    normalizeDepth: boolean = true
  ): Promise<Project> {
    const res = await fetch(
      `${BASE_URL}/projects/${projectId}/process?invert_depth=${invertDepth}&normalize_depth=${normalizeDepth}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error('Failed to reprocess project');
    return res.json();
  },

  async getMesh(projectId: string, gridSize: number = 128): Promise<HeightfieldData> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/mesh?grid_size=${gridSize}`);
    if (!res.ok) throw new Error('Failed to fetch mesh heightfield');
    return res.json();
  },

  async calibrateGCP(projectId: string, points: GCPPoint[]): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'gcp', gcp_points: points }),
    });
    if (!res.ok) throw new Error('Calibration failed');
    return res.json();
  },

  async calibrateDEM(projectId: string, file: File): Promise<Project> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/projects/${projectId}/calibrate/dem`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'DEM calibration failed' }));
      throw new Error(err.detail || 'DEM calibration failed');
    }
    return res.json();
  },

  async addMeasurement(
    projectId: string,
    req: {
      type: 'distance' | 'height' | 'slope' | 'point' | 'area';
      start_point: { x: number; y: number; z: number };
      end_point?: { x: number; y: number; z: number } | null;
      polygon_points?: { x: number; y: number; z: number }[];
    }
  ): Promise<Measurement> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/measure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Failed to record measurement');
    return res.json();
  },

  async deleteMeasurement(projectId: string, measurementId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/measure/${measurementId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete measurement');
  },

  async explainTerrain(projectId: string): Promise<ExplainTerrainResponse> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/explain`);
    if (!res.ok) throw new Error('Failed to generate terrain insights');
    return res.json();
  },

  async getReport(projectId: string, format: 'json' | 'html' = 'json') {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/report?format=${format}`);
    if (!res.ok) throw new Error('Failed to fetch report');
    if (format === 'html') return res.text();
    return res.json();
  },

  getExportUrl(projectId: string, type: 'obj' | 'dsm' | 'depth' | 'csv' | 'report'): string {
    return `${BASE_URL}/projects/${projectId}/export?type=${type}`;
  },
};
