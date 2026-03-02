import { Injectable, signal, inject, effect, OnDestroy, computed } from '@angular/core';
import { PatternMatrix } from '../models/pattern-matrix.model';
import { CloudPatternRepository } from '../repositories/cloud-pattern.repository';

export type HighlightStyle = {
  name: string;
  css: string;
};

export type PathAnimationStyle = 'ghost' | 'numbers';

interface Coord {
  key: string;
  r: number;
  c: number;
}

const FAVORITE_CORE_STYLES: HighlightStyle[] = [
  { name: 'Classic Blue', css: 'background: rgba(52, 152, 219, 0.4); border: 2px solid #2980b9;' },
  { name: 'Neon Lime', css: 'background: rgba(57, 255, 20, 0.2); box-shadow: inset 0 0 10px #39ff14; border: 1px solid #39ff14;' },
  { name: 'High Contrast Black', css: 'background: #000; opacity: 0.8; border: 1px solid #fff;' },
  { name: 'Deep Red X', css: 'background: linear-gradient(45deg, transparent 45%, #e74c3c 45%, #e74c3c 55%, transparent 55%), linear-gradient(-45deg, transparent 45%, #e74c3c 45%, #e74c3c 55%, transparent 55%);' },
];

const NINE_CLEAN_STYLES: HighlightStyle[] = [
  { name: 'Electric Violet', css: 'background: rgba(142, 68, 173, 0.3); border: 2px solid #9b59b6; box-shadow: inset 0 0 8px rgba(155, 89, 182, 0.5);' },
  { name: 'Alert Orange', css: 'background: rgba(230, 126, 34, 0.3); border: 2px solid #d35400; font-weight: bold;' },
  { name: 'Cyber Teal', css: 'background: rgba(26, 188, 156, 0.25); border: 2px solid #16a085; outline: 1px solid rgba(26, 188, 156, 0.5);' },
  { name: 'Stark White', css: 'background: rgba(255, 255, 255, 0.9); border: 2px solid #000; mix-blend-mode: overlay;' },
  { name: 'Red Focus', css: 'background: transparent; border: 3px solid #e74c3c; box-shadow: 0 0 5px rgba(231, 76, 60, 0.5);' },
  { name: 'Deep Navy', css: 'background: #2c3e50; border: 1px solid #bdc3c7; opacity: 0.85;' },
  { name: 'Gold Precision', css: 'background: rgba(241, 196, 15, 0.2); border: 2px solid #f39c12; box-shadow: 0 0 4px rgba(243, 156, 18, 0.4);' },
  { name: 'Solid Emerald', css: 'background: rgba(39, 174, 96, 0.4); border: 2px solid #27ae60;' },
  { name: 'Industrial Slate', css: 'background: rgba(127, 140, 141, 0.3); border: 2px solid #2c3e50; border-style: double;' },
];

const FINAL_STYLES: HighlightStyle[] = [
  ...FAVORITE_CORE_STYLES,
  ...NINE_CLEAN_STYLES,
  {
    name: 'True Color Shadow',
    css: 'border: 2px solid #000; box-shadow: inset 2px 2px 4px rgba(0,0,0,0.4); z-index: 5;'
  },
];

const DEFAULT_HIGHLIGHT_STYLE_NAME = 'True Color Shadow';
const DEFAULT_HIGHLIGHT_STYLE_INDEX = Math.max(
  0,
  FINAL_STYLES.findIndex((style) => style.name === DEFAULT_HIGHLIGHT_STYLE_NAME),
);

export type StorageMode = 'cloud' | 'local';

export type SymbolProgressStat = {
  key: string;
  char: string;
  color: string;
  total: number;
  done: number;
  percent: number;
};

export type PatternDashboardStats = {
  overallPercent: number;
  total: number;
  done: number;
  remaining: number;
  symbols: SymbolProgressStat[];
};

@Injectable({ providedIn: 'root' })
export class PatternManagerService implements OnDestroy {
  private readonly repository = inject(CloudPatternRepository);
  private inProgressKey = signal<string | null>(localStorage.getItem('active_key'));
  private prevPct = 0;
  private cloudUnsubscribe: (() => void) | null = null;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private pathTimer: ReturnType<typeof setInterval> | null = null;
  private readonly localPrefix = 'pattern_local_';

  readonly activeProjectId = signal<string>('');
  readonly projectList = signal<string[]>([]);
  readonly loading = signal(false);
  readonly statusMessage = signal('');
  readonly storageMode = signal<StorageMode>('cloud');
  readonly pixelSize = signal(20);
  readonly hiddenSymbols = signal<Set<string>>(new Set());
  readonly activeHighlightStyle = signal(DEFAULT_HIGHLIGHT_STYLE_INDEX);
  readonly showOptimalPath = signal<boolean>(
    localStorage.getItem('show_path') === 'true'
  );
  readonly animationStyle = signal<PathAnimationStyle>(
    (localStorage.getItem('anim_style') as PathAnimationStyle) || 'numbers'
  );
  readonly activeStepIndex = signal<number>(0);
  readonly highlightStyles: HighlightStyle[] = FINAL_STYLES;
  readonly optimalSequence = computed(() => {
    if (!this.showOptimalPath()) return [] as string[];

    const focusKey = this.inProgressKey();
    if (!focusKey) return [] as string[];

    const pattern = this.pattern();
    const [row, col] = focusKey.split(',').map(Number);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return [] as string[];
    const targetKey = pattern.g[row]?.[col];
    if (!targetKey) return [] as string[];

    const sectorCells = this.getSector(pattern.g, row, col, targetKey);
    const progress = pattern.progress ?? {};
    const pendingInSector = sectorCells.filter((key) => (progress[key] ?? 0) < 2);
    if (!pendingInSector.length) return [] as string[];

    return this.calculateNearestNeighborPath(pendingInSector, focusKey);
  });
  readonly activeSymbols = computed(() => {
    const pattern = this.pattern();
    const usedKeys = new Set(pattern.g.flat());

    return Object.entries(pattern.l ?? {})
      .filter(([key, value]) => usedKeys.has(key) && !!value && !value.isBackground)
      .map(([key, value]) => ({
        key,
        char: value.s || key,
        color: value.b,
        brightness: this.getBrightness(value.b),
      }))
      .sort((a, b) => b.brightness - a.brightness);
  });
  readonly stats = computed<PatternDashboardStats | null>(() => {
    const pattern = this.pattern();
    if (!pattern?.g?.length) return null;

    const progress = pattern.progress ?? {};
    const symbols = this.activeSymbols();
    if (!symbols.length) return null;

    let totalCells = 0;
    let completedCells = 0;

    const statsByKey: Record<string, SymbolProgressStat> = symbols.reduce((accumulator, symbol) => {
      accumulator[symbol.key] = {
        key: symbol.key,
        char: symbol.char,
        color: symbol.color,
        total: 0,
        done: 0,
        percent: 0,
      };
      return accumulator;
    }, {} as Record<string, SymbolProgressStat>);

    for (let row = 0; row < pattern.g.length; row++) {
      for (let col = 0; col < pattern.g[row].length; col++) {
        const symbolKey = pattern.g[row][col];
        const bucket = statsByKey[symbolKey];
        if (!bucket) continue;

        totalCells++;
        bucket.total++;

        const step = progress[`${row},${col}`] ?? 0;
        if (step === 2) {
          completedCells++;
          bucket.done++;
        }
      }
    }

    const symbolStats = Object.values(statsByKey)
      .filter((symbol) => symbol.total > 0)
      .map((symbol) => ({
        ...symbol,
        percent: symbol.total > 0 ? Math.round((symbol.done / symbol.total) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent || b.done - a.done || a.char.localeCompare(b.char));

    if (!symbolStats.length || totalCells === 0) return null;

    return {
      overallPercent: Math.round((completedCells / totalCells) * 100),
      total: totalCells,
      done: completedCells,
      remaining: totalCells - completedCells,
      symbols: symbolStats,
    };
  });
  readonly currentSectorStats = computed(() => {
    const sequence = this.optimalSequence();
    if (sequence.length === 0) return null;

    const secondsPerStitch = 5;
    const totalSeconds = sequence.length * secondsPerStitch;

    return {
      count: sequence.length,
      estimatedMinutes: Math.ceil(totalSeconds / 60),
    };
  });
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
    const lastId = localStorage.getItem('activeProjectId');
    if (lastId) {
      this.activeProjectId.set(lastId);
    }

    this.loadPersistedSettings();

    effect(() => {
      const id = this.activeProjectId();
      if (!id || id === 'Loading...' || id === 'New Pattern') {
        if (!id) {
          localStorage.removeItem('activeProjectId');
        }
        return;
      }

      localStorage.setItem('activeProjectId', id);
      void this.loadProjectById(id);
    }, { allowSignalWrites: true });

    effect(() => {
      const settings = {
        pixelSize: this.pixelSize(),
        storageMode: this.storageMode(),
        activeStyle: this.activeHighlightStyle(),
        hiddenSymbols: Array.from(this.hiddenSymbols()),
        showOptimalPath: this.showOptimalPath(),
        animationStyle: this.animationStyle(),
      };

      localStorage.setItem('bordados_settings', JSON.stringify(settings));
      localStorage.setItem('storageMode', settings.storageMode);
      localStorage.setItem('show_path', String(settings.showOptimalPath));
      localStorage.setItem('anim_style', settings.animationStyle);

      if (this.storageMode() === 'cloud') {
        void this.repository.updateUserSettings(settings).catch((error) => {
          console.error('Settings sync failed:', error);
        });
      }
    });

    this.pathTimer = setInterval(() => {
      const sequence = this.optimalSequence();
      if (sequence.length > 0) {
        this.activeStepIndex.update((value) => (value + 1) % sequence.length);
      } else if (this.activeStepIndex() !== 0) {
        this.activeStepIndex.set(0);
      }
    }, 200);

    void this.initialize();
  }

  ngOnDestroy(): void {
    this.cloudUnsubscribe?.();
    this.cloudUnsubscribe = null;
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    if (this.pathTimer) {
      clearInterval(this.pathTimer);
      this.pathTimer = null;
    }
  }

  notify(message: string, durationMs = 2200): void {
    this.statusMessage.set(message);
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.statusMessage.set(''), durationMs);
  }

  setStorageMode(mode: StorageMode): void {
    if (this.storageMode() === mode) return;

    this.storageMode.set(mode);
    if (mode === 'local') {
      this.cloudUnsubscribe?.();
      this.cloudUnsubscribe = null;
      this.refreshLocalProjectList();

      const ids = this.projectList();
      if (ids.length > 0) {
        this.activeProjectId.set(ids[0]);
      } else {
        this.activeProjectId.set('');
        this.pattern.set({
          m: { r: 0, c: 0, t: 'New Pattern' },
          l: {},
          g: [],
        });
      }
    } else {
      void this.initialize();
    }
  }

  private loadPersistedSettings(): void {
    const savedMode = localStorage.getItem('storageMode') as StorageMode | null;
    if (savedMode === 'cloud' || savedMode === 'local') {
      this.storageMode.set(savedMode);
    }

    const rawSettings = localStorage.getItem('bordados_settings');
    if (!rawSettings) return;

    try {
      const parsed = JSON.parse(rawSettings) as {
        pixelSize?: number;
        storageMode?: StorageMode;
        activeStyle?: number;
        hiddenSymbols?: string[];
        showOptimalPath?: boolean;
        animationStyle?: PathAnimationStyle;
      };

      if (typeof parsed.pixelSize === 'number') {
        this.setPixelSize(parsed.pixelSize);
      }

      if (parsed.storageMode === 'cloud' || parsed.storageMode === 'local') {
        this.storageMode.set(parsed.storageMode);
      }

      if (typeof parsed.activeStyle === 'number') {
        this.setHighlightStyle(parsed.activeStyle);
      }

      if (Array.isArray(parsed.hiddenSymbols)) {
        this.hiddenSymbols.set(new Set(parsed.hiddenSymbols));
      }

      if (typeof parsed.showOptimalPath === 'boolean') {
        this.showOptimalPath.set(parsed.showOptimalPath);
      }

      if (parsed.animationStyle === 'ghost' || parsed.animationStyle === 'numbers') {
        this.animationStyle.set(parsed.animationStyle);
      }

      const showPathRaw = localStorage.getItem('show_path');
      if (showPathRaw === 'true' || showPathRaw === 'false') {
        this.showOptimalPath.set(showPathRaw === 'true');
      }

      const savedAnimStyle = localStorage.getItem('anim_style');
      if (savedAnimStyle === 'ghost' || savedAnimStyle === 'numbers') {
        this.animationStyle.set(savedAnimStyle);
      }
    } catch {
      // ignore invalid persisted settings
    }
  }

  setPixelSize(size: number): void {
    const clamped = Math.min(50, Math.max(10, Math.round(size)));
    this.pixelSize.set(clamped);
  }

  setHighlightStyle(index: number): void {
    if (index < 0 || index >= this.highlightStyles.length) return;
    this.activeHighlightStyle.set(index);
  }

  toggleOptimalPath(): void {
    this.showOptimalPath.update((value) => {
      const nextValue = !value;
      localStorage.setItem('show_path', String(nextValue));
      return nextValue;
    });
  }

  setAnimationStyle(style: PathAnimationStyle): void {
    if (style !== 'ghost' && style !== 'numbers') return;
    this.animationStyle.set(style);
    localStorage.setItem('anim_style', style);
  }

  toggleHiddenSymbol(symbolKey: string): void {
    this.hiddenSymbols.update((current) => {
      const next = new Set(current);
      if (next.has(symbolKey)) {
        next.delete(symbolKey);
      } else {
        next.add(symbolKey);
      }
      return next;
    });
  }

  private async initialize(): Promise<void> {
    if (this.storageMode() === 'local') {
      this.refreshLocalProjectList();
      return;
    }

    this.cloudUnsubscribe?.();
    this.cloudUnsubscribe = this.repository.watchAvailablePatterns((patterns) => {
      const ids = patterns
        .map((pattern) => pattern.m?.t)
        .filter((title): title is string => !!title && title.trim().length > 0);

      this.projectList.set(ids);

      const savedId = localStorage.getItem('activeProjectId');
      if (savedId && ids.includes(savedId)) {
        if (this.activeProjectId() !== savedId) {
          this.activeProjectId.set(savedId);
        }
      } else {
        const current = this.activeProjectId();
        if (ids.length > 0 && (!current || !ids.includes(current))) {
          this.activeProjectId.set(ids[0]);
        }
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
    if (this.storageMode() === 'local') {
      this.refreshLocalProjectList();
      return;
    }

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
      if (this.storageMode() === 'local') {
        const loadedLocal = this.loadLocalProject(id);
        if (loadedLocal) {
          this.pattern.set(loadedLocal);
        }
        return;
      }

      const loaded = await this.repository.loadPattern(id);
      if (loaded) {
        this.pattern.set(loaded);
        this.saveLocalProject(id, loaded);
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
      this.saveLocalProject(currentData.m.t, currentData);

      if (this.storageMode() === 'cloud') {
        await this.repository.saveProgress(currentData.m.t, currentData);
      } else {
        this.refreshLocalProjectList();
      }

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

      if (this.storageMode() === 'cloud') {
        await this.repository.saveProgress(cleanedData.m.t, cleanedData);
      } else {
        this.saveLocalProject(cleanedData.m.t, cleanedData);
      }
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

    if (this.storageMode() === 'local') {
      const project = this.loadLocalProject(oldTitle);
      if (!project) return;

      const renamed: PatternMatrix = { ...project, m: { ...project.m, t: newTitle } };
      this.saveLocalProject(newTitle, renamed);
      localStorage.removeItem(this.localPrefix + oldTitle);
      this.refreshLocalProjectList();

      if (this.activeProjectId() === oldTitle) {
        this.activeProjectId.set(newTitle);
      }

      this.pattern.set(renamed);
      return;
    }

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
    if (this.storageMode() === 'cloud') {
      await this.repository.deletePattern(title);
      await this.refreshProjectList();
    } else {
      localStorage.removeItem(this.localPrefix + title);
      this.refreshLocalProjectList();
    }

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

  private refreshLocalProjectList(): void {
    const ids = Object.keys(localStorage)
      .filter((key) => key.startsWith(this.localPrefix))
      .map((key) => key.replace(this.localPrefix, ''));

    this.projectList.set(ids);
  }

  private saveLocalProject(id: string, matrix: PatternMatrix): void {
    const payload = { ...matrix, _lastSaved: Date.now() };
    localStorage.setItem(this.localPrefix + id, JSON.stringify(payload));
  }

  private loadLocalProject(id: string): PatternMatrix | null {
    const raw = localStorage.getItem(this.localPrefix + id);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PatternMatrix;
    } catch {
      return null;
    }
  }

  private getBrightness(hex: string): number {
    const normalized = (hex || '#000000').replace('#', '').padStart(6, '0').slice(0, 6);
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  private toCoord(key: string): Coord | null {
    const [r, c] = key.split(',').map(Number);
    if (!Number.isFinite(r) || !Number.isFinite(c)) return null;
    return { key, r, c };
  }

  private distanceSq(a: Coord, b: Coord): number {
    const dr = a.r - b.r;
    const dc = a.c - b.c;
    return dr * dr + dc * dc;
  }
  
  calculateNearestNeighborPath(pendingKeys: string[], startKey: string): string[] {
  if (!pendingKeys.length) return [];

  type Node = { key: string; r: number; c: number };

  const parse = (key: string): Node => {
    const [r, c] = key.split(',').map(Number);
    return { key, r, c };
  };

  const nodes = pendingKeys.map(parse);
  const nodeMap = new Map<string, Node>();
  nodes.forEach(n => nodeMap.set(n.key, n));

  const keySet = new Set(pendingKeys);
  const visited = new Set<string>();
  const path: string[] = [];

  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  const degree = (key: string): number => {
    const { r, c } = nodeMap.get(key)!;
    let count = 0;
    for (const [dr, dc] of directions) {
      if (keySet.has(`${r + dr},${c + dc}`)) count++;
    }
    return count;
  };

  const distSq = (a: Node, b: Node) => {
    const dr = a.r - b.r;
    const dc = a.c - b.c;
    return dr * dr + dc * dc;
  };

  let current = nodeMap.get(startKey) ?? nodes[0];
  let prevDir: [number, number] | null = null;

  while (visited.size < keySet.size) {
    visited.add(current.key);
    path.push(current.key);

    const candidates: {
      node: Node;
      dir: [number, number];
      score: number;
    }[] = [];

    for (const [dr, dc] of directions) {
      const neighborKey = `${current.r + dr},${current.c + dc}`;
      if (!keySet.has(neighborKey) || visited.has(neighborKey)) continue;

      const neighbor = nodeMap.get(neighborKey)!;

      let score = 0;

      // Prefer continuing direction
      if (prevDir && prevDir[0] === dr && prevDir[1] === dc) {
        score += 5;
      }

      // Prefer high-degree (dense interior) nodes
      score += degree(neighborKey) * 3;

      // Slight preference for closer nodes (usually equal here)
      score -= distSq(current, neighbor) * 0.01;

      candidates.push({ node: neighbor, dir: [dr, dc], score });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const chosen = candidates[0];
      prevDir = chosen.dir;
      current = chosen.node;
      continue;
    }

    // No adjacent unvisited → jump to best remaining node
    let best: Node | null = null;
    let bestScore = -Infinity;

    for (const key of keySet) {
      if (visited.has(key)) continue;

      const candidate = nodeMap.get(key)!;

      let score = 0;

      // Prefer high-degree nodes first (postpone isolated like "4")
      score += degree(key) * 4;

      // Prefer closer jumps
      score -= distSq(current, candidate) * 0.001;

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) break;

    prevDir = null;
    current = best;
  }

  return path;
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
        sector.forEach(k => { progress[k] = 2; });
        this.inProgressKey.set(null);
        localStorage.removeItem('active_key');
      } else if (currentStep === 2) {
        sector.forEach(k => { progress[k] = 0; });
        this.inProgressKey.set(null);
        localStorage.removeItem('active_key');
      } else {
        Object.keys(progress).forEach((key) => {
          if (progress[key] === 1) {
            progress[key] = 0;
          }
        });

        sector.forEach(k => { progress[k] = 1; });
        this.inProgressKey.set(coordKey);
        localStorage.setItem('active_key', coordKey);
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
