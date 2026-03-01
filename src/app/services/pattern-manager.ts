import { Injectable, signal, inject, effect, OnDestroy } from '@angular/core';
import { PatternMatrix } from '../models/pattern-matrix.model';
import { CloudPatternRepository } from '../repositories/cloud-pattern.repository';

@Injectable({ providedIn: 'root' })
export class PatternManagerService implements OnDestroy {
  private readonly repository = inject(CloudPatternRepository);
  private inProgressKey = signal<string | null>(null);
  private prevPct = 0;
  private cloudUnsubscribe: (() => void) | null = null;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;

  readonly activeProjectId = signal<string>('');
  readonly projectList = signal<string[]>([]);
  readonly loading = signal(false);
  readonly statusMessage = signal('');
  readonly remoteResource = {
    isLoading: () => this.loading(),
    reload: () => this.loadCurrentProject(),
  };
  readonly pattern = signal<PatternMatrix>({
    m: { r: 0, c: 0, t: 'Loading...' },
    l: {},
    g: []
  });

  constructor() {
    effect(() => {
      const id = this.activeProjectId();
      if (!id || id === 'Loading...' || id === 'New Pattern') return;
      void this.loadProjectById(id);
    }, { allowSignalWrites: true });

    void this.initialize();
  }

  ngOnDestroy(): void {
    this.cloudUnsubscribe?.();
    this.cloudUnsubscribe = null;
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
  }

  notify(message: string, durationMs = 2200): void {
    this.statusMessage.set(message);
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.statusMessage.set(''), durationMs);
  }

  private async initialize(): Promise<void> {
    this.cloudUnsubscribe?.();
    this.cloudUnsubscribe = this.repository.watchAvailablePatterns((patterns) => {

      const ids = patterns
        .map((pattern) => pattern.m?.t)
        .filter((title): title is string => !!title && title.trim().length > 0);

      this.projectList.set(ids);

      const current = this.activeProjectId();
      if (ids.length > 0 && (!current || !ids.includes(current))) {
        this.activeProjectId.set(ids[0]);
      }

      if (!this.activeProjectId() && ids.length === 0) {
        this.pattern.set({
          m: { r: 0, c: 0, t: 'New Pattern' },
          l: {},
          g: [],
        });
      }
    });
  }

  private async refreshProjectList(): Promise<void> {
    try {
      const patterns = await this.repository.getAvailablePatterns();
      const sorted = [...patterns].sort((a, b) => {
        const timeA = (a as PatternMatrix & { _lastSaved?: number })._lastSaved ?? 0;
        const timeB = (b as PatternMatrix & { _lastSaved?: number })._lastSaved ?? 0;
        return timeB - timeA;
      });

      const ids = sorted
        .map((pattern) => pattern.m?.t)
        .filter((title): title is string => !!title && title.trim().length > 0);

      this.projectList.set(ids);
    } catch (error) {
      console.error('Could not refresh list from Cloud:', error);
    }
  }

  async forceRefreshProjects(): Promise<void> {
    await this.refreshProjectList();

    const current = this.activeProjectId();
    const ids = this.projectList();
    if (!current && ids.length > 0) {
      this.activeProjectId.set(ids[0]);
    }
  }

  private async loadProjectById(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const loaded = await this.repository.loadPattern(id);
      if (loaded) {
        this.pattern.set(loaded);
      }
    } catch (error) {
      console.error('Load failed:', error);
      this.notify('No se pudo cargar el proyecto desde la nube.');
    } finally {
      setTimeout(() => this.loading.set(false), 300);
    }
  }

  private loadCurrentProject(): void {
    const id = this.activeProjectId();
    if (!id) return;
    void this.loadProjectById(id);
  }

  async saveCurrentPattern(): Promise<void> {
    const currentData = this.pattern();
    if (currentData.m.t && currentData.m.t !== 'Loading...') {
      await this.repository.saveProgress(currentData.m.t, currentData);
      await this.refreshProjectList();
    }
  }

  async importNewProject(jsonString: string): Promise<string> {
    this.loading.set(true);
    try {
      const rawData = JSON.parse(jsonString) as unknown;
      const data = this.normalizeImportedPattern(rawData);

      const uniqueTitle = this.getUniqueName(data.m.t);
      const cleanedData: PatternMatrix = {
        ...data,
        m: {
          ...data.m,
          t: uniqueTitle,
        },
      };

      this.pattern.set(cleanedData);
      this.activeProjectId.set(cleanedData.m.t);

      const currentIds = this.projectList();
      if (!currentIds.includes(cleanedData.m.t)) {
        this.projectList.set([cleanedData.m.t, ...currentIds]);
      }

      await this.repository.saveProgress(cleanedData.m.t, cleanedData);
      await this.refreshProjectList();
      this.notify('Proyecto sincronizado con la nube.');

      return cleanedData.m.t;
    } catch (error) {
      console.error('Import failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown import error.';
      throw new Error(message);
    } finally {
      setTimeout(() => this.loading.set(false), 500);
    }
  }

  exportProject(): void {
    const currentData = this.pattern();
    if (!currentData || !currentData.m?.t || currentData.m.t === 'Loading...') return;

    this.loading.set(true);

    try {
      const exportData = {
        ...currentData,
        _exportDate: new Date().toISOString(),
        _appVersion: '2.0.0-cloud',
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      const downloadName = this.getUniqueName(currentData.m.t, { ignoreCurrent: true });
      const link = document.createElement('a');
      link.href = url;
      link.download = `${downloadName || 'pattern'}.fcjson`;
      link.click();

      window.URL.revokeObjectURL(url);
      this.notify('Exportación completada.');
    } catch (error) {
      console.error('Export failed:', error);
      this.notify('No se pudo exportar el proyecto.', 2800);
    } finally {
      setTimeout(() => this.loading.set(false), 500);
    }
  }

  private getUniqueName(name: string, options?: { ignoreCurrent?: boolean }): string {
    const baseName = name.trim() || 'Imported Pattern';
    const names = options?.ignoreCurrent
      ? this.projectList().filter((existing) => existing !== name)
      : this.projectList();

    if (!names.includes(baseName)) return baseName;

    let counter = 1;
    let newName = `${baseName} (${counter})`;

    while (names.includes(newName)) {
      counter++;
      newName = `${baseName} (${counter})`;
    }

    return newName;
  }

  private normalizeImportedPattern(rawData: unknown): PatternMatrix {
    const root = this.asRecord(rawData);
    const metadata = this.asRecord(root['m']);
    const legend = this.asRecord(root['l']);

    if (!Array.isArray(root['g'])) {
      throw new Error('Missing or invalid grid.');
    }

    const grid = root['g'].map((row) => {
      if (!Array.isArray(row)) {
        throw new Error('Invalid grid row.');
      }
      return row.map((cell) => String(cell));
    });

    const parsedRows = Number(metadata['r']);
    const parsedCols = Number(metadata['c']);
    const rows = Number.isFinite(parsedRows) && parsedRows > 0 ? parsedRows : grid.length;
    const cols = Number.isFinite(parsedCols) && parsedCols > 0
      ? parsedCols
      : (grid[0]?.length ?? 0);

    const rawTitle = typeof metadata['t'] === 'string' ? metadata['t'].trim() : '';
    const title = rawTitle || 'Imported Pattern ' + Date.now();

    const progress = this.normalizeProgress(root['progress']);

    return {
      m: { r: rows, c: cols, t: title },
      l: legend as PatternMatrix['l'],
      g: grid,
      progress,
    };
  }

  private normalizeProgress(rawProgress: unknown): Record<string, number> {
    if (!rawProgress) return {};

    const progressRecord = this.asRecord(rawProgress);
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(progressRecord)) {
      const step = Number(value);
      if (!Number.isFinite(step)) continue;
      if (step !== 0 && step !== 1 && step !== 2) continue;
      normalized[key] = step;
    }

    return normalized;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Invalid pattern structure.');
    }
    return value as Record<string, unknown>;
  }

  async renameProject(oldTitle: string, newTitle: string) {
    if (!newTitle || oldTitle === newTitle) return;

    const project = await this.repository.loadPattern(oldTitle);
    if (!project) return;

    const renamed: PatternMatrix = {
      ...project,
      m: { ...project.m, t: newTitle },
    };

    await this.repository.saveProgress(newTitle, renamed);
    await this.repository.deletePattern(oldTitle);
    await this.refreshProjectList();

    if (this.activeProjectId() === oldTitle) {
      this.activeProjectId.set(newTitle);
    }

    this.pattern.set(renamed);
  }

  async deleteProject(title: string) {
    await this.repository.deletePattern(title);
    await this.refreshProjectList();

    if (this.activeProjectId() === title) {
      const next = this.projectList()[0] || '';
      this.activeProjectId.set(next);

      if (!next) {
        this.pattern.set({
          m: { r: 0, c: 0, t: 'New Pattern' },
          l: {},
          g: [],
        });
      }
    }
  }

  /**
   * Sector = the clicked cell + its immediate same-color neighbors (8-directional, 1 step only).
   * 
   * Flow:
   *  - Click pending sector   → clear previous in-progress → mark sector as in-progress
   *  - Click in-progress sector again → mark sector as done
   *  - Click done sector      → reset sector to pending
   */
  handleCellClick(row: number, col: number): void {
    this.pattern.update(current => {
      const progress = { ...(current.progress ?? {}) };
      const coordKey = `${row},${col}`;
      const currentStep = progress[coordKey] ?? 0;
      const targetKey = current.g[row][col];

      // Get sector: clicked cell + same-color immediate neighbors
      const sector = this.getSector(current.g, row, col, targetKey);

      if (currentStep === 1) {
        // Already in-progress → mark whole sector as done
        sector.forEach(k => { progress[k] = 2; });
        this.inProgressKey.set(null);
      } else if (currentStep === 2) {
        // Done → reset sector to pending
        sector.forEach(k => { progress[k] = 0; });
        this.inProgressKey.set(null);
      } else {
        // Pending → clear any existing in-progress sector first
        const prevKey = this.inProgressKey();
        if (prevKey) {
          const [pr, pc] = prevKey.split(',').map(Number);
          if (current.g[pr]?.[pc]) {
            const prevSector = this.getSector(current.g, pr, pc, current.g[pr][pc]);
            prevSector.forEach(k => {
              if ((progress[k] ?? 0) === 1) progress[k] = 0;
            });
          }
        }
        // Mark new sector as in-progress
        sector.forEach(k => { progress[k] = 1; });
        this.inProgressKey.set(coordKey);
      }

      return { ...current, progress };
    });

    this.saveCurrentPattern();
    this.checkCompletion();
  }

  private checkCompletion(): void {
    const p = this.pattern();
    const progress = p.progress ?? {};
    const legend = p.l as any;
    let total = 0;
    let done = 0;
    for (let r = 0; r < p.g.length; r++) {
      for (let c = 0; c < p.g[r].length; c++) {
        const def = legend[p.g[r][c]];
        if (!def || def.isBackground) continue;
        total++;
        if ((progress as any)[r + ',' + c] === 2) done++;
      }
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (pct === 100 && this.prevPct !== 100) {
      this.onComplete();
    }
    this.prevPct = pct;
  }

  private onComplete(): void {
    window.dispatchEvent(new CustomEvent('pattern-complete'));
  }

  /**
   * Returns all coord keys for the contiguous sector of same-color cells (4-way BFS flood-fill).
   */
  private getSector(grid: string[][], row: number, col: number, targetKey: string): string[] {
    const found: string[] = [];
    const visited = new Set<string>();
    const queue: [number, number][] = [[row, col]];

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const key = r + ',' + c;
      if (visited.has(key)) continue;
      if (r < 0 || r >= grid.length) continue;
      if (c < 0 || c >= grid[r].length) continue;
      if (grid[r][c] !== targetKey) continue;
      visited.add(key);
      found.push(key);
      queue.push([r - 1, c]);
      queue.push([r + 1, c]);
      queue.push([r, c - 1]);
      queue.push([r, c + 1]);
      queue.push([r - 1, c - 1]);
      queue.push([r - 1, c + 1]);
      queue.push([r + 1, c - 1]);
      queue.push([r + 1, c + 1]);
    }

    return found;
  }
}
