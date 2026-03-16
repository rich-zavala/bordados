import { Injectable } from '@angular/core';

export type ViewMode = 'normal' | 'panoramic';

export interface ViewportState {
  scrollLeft: number;
  scrollTop: number;
  windowScrollX: number;
  windowScrollY: number;
  pixelSize: number;
  projectId: string;
  mode: ViewMode;
}

const KEYS: Record<ViewMode, string> = {
  normal: 'aime_viewport_normal_v1',
  panoramic: 'aime_viewport_panoramic_v1',
};

@Injectable({ providedIn: 'root' })
export class ViewportStateService {
  save(mode: ViewMode, state: Omit<ViewportState, 'mode'>): void {
    const full: ViewportState = { ...state, mode };
    localStorage.setItem(
      `${KEYS[mode]}_${state.projectId}`,
      JSON.stringify(full)
    );
  }

  load(mode: ViewMode, projectId: string): ViewportState | null {
    const raw = localStorage.getItem(`${KEYS[mode]}_${projectId}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ViewportState;
      if (parsed.projectId !== projectId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  clear(mode: ViewMode, projectId: string): void {
    localStorage.removeItem(`${KEYS[mode]}_${projectId}`);
  }

  clearAll(projectId: string): void {
    (['normal', 'panoramic'] as ViewMode[]).forEach((mode) =>
      this.clear(mode, projectId)
    );
  }
}
