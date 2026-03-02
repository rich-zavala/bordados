import { Injectable, signal, inject, effect, OnDestroy, computed } from '@angular/core';
import { PatternMatrix } from '../models/pattern-matrix.model';
import { CloudPatternRepository } from '../repositories/cloud-pattern.repository';

export type HighlightStyle = {
  name: string;
  css: string;
};

const CORE_HIGHLIGHT_STYLES: HighlightStyle[] = [
  { name: 'Classic Blue', css: 'background: rgba(52, 152, 219, 0.4); border: 2px solid #2980b9;' },
  { name: 'Neon Lime', css: 'background: rgba(57, 255, 20, 0.2); box-shadow: inset 0 0 10px #39ff14; border: 1px solid #39ff14;' },
  { name: 'High Contrast Black', css: 'background: #000; opacity: 0.8; border: 1px solid #fff;' },
  { name: 'Deep Red X', css: 'background: linear-gradient(45deg, transparent 45%, #e74c3c 45%, #e74c3c 55%, transparent 55%), linear-gradient(-45deg, transparent 45%, #e74c3c 45%, #e74c3c 55%, transparent 55%);' },
  { name: 'Frosted Glass', css: 'background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(3px); border: 1px solid rgba(255,255,255,0.5);' },
  { name: 'Caution Stripes', css: 'background: repeating-linear-gradient(45deg, #f1c40f, #f1c40f 5px, #000 5px, #000 10px); opacity: 0.6;' },
  { name: 'Inverted', css: 'background: #fff; mix-blend-mode: difference;' },
  { name: 'Soft Purple Shadow', css: 'box-shadow: inset 0 0 15px #9b59b6; background: rgba(155, 89, 182, 0.1);' },
  { name: 'Thick Border Only', css: 'background: transparent; border: 4px solid #2c3e50;' },
  { name: 'Dot Matrix', css: 'background-image: radial-gradient(#333 20%, transparent 20%); background-size: 5px 5px;' },
  { name: 'Gold Leaf', css: 'background: rgba(212, 175, 55, 0.4); border: 1px solid #d4af37; filter: drop-shadow(0 0 2px #d4af37);' },
  { name: 'Dark Slate', css: 'background: #2f3640; opacity: 0.9;' },
  { name: 'Pink Glaze', css: 'background: rgba(255, 107, 129, 0.3); border-radius: 50%; scale: 0.8;' },
  { name: 'Cyberpunk Magenta', css: 'border: 2px solid #ff00ff; box-shadow: 0 0 8px #ff00ff;' },
  { name: 'Minimalist Dot', css: 'background: #333; width: 6px; height: 6px; border-radius: 50%; margin: auto;' },
  { name: 'Ocean Wave', css: 'background: linear-gradient(180deg, #48dbfb 0%, #2e86de 100%); opacity: 0.5;' },
  { name: 'Sepia Wash', css: 'background: #704214; opacity: 0.4;' },
  { name: 'Paper White', css: 'background: #f5f6fa; border: 1px solid #dcdde1; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);' },
  { name: 'Vibrant Orange', css: 'background: #ff9f43; border-bottom: 3px solid #ee5253;' },
  { name: 'Holographic', css: 'background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%); opacity: 0.6; mix-blend-mode: screen;' },
];

const OUT_OF_BOX_STYLES: HighlightStyle[] = [
  { name: 'Blueprint Grid', css: 'background: #0045ad; background-image: linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px); background-size: 5px 5px;' },
  { name: 'Stitch Texture', css: 'background: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px); background-color: #7f8c8d; box-shadow: inset 0 0 4px #000;' },
  { name: 'CRT Scanline', css: 'background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); background-size: 100% 2px, 3px 100%;' },
  { name: 'Water Color', css: 'background: radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.6), transparent), radial-gradient(circle at 70% 70%, rgba(155, 89, 182, 0.4), transparent); filter: blur(1px);' },
  { name: 'Magnifying Glass', css: 'scale: 1.3; z-index: 10; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); border: 2px solid #fff; backdrop-filter: brightness(1.2);' },
  { name: 'Golden Sparkle', css: 'background: #f1c40f; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); opacity: 0.8;' },
  { name: 'Pencil Scribble', css: 'background: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\'><path d=\'M0 0 L10 10 M10 0 L0 10\' stroke=\'black\' stroke-width=\'0.5\' opacity=\'0.3\'/></svg>");' },
  { name: 'Liquid Mercury', css: 'background: linear-gradient(145deg, #e6e6e6, #ffffff); box-shadow: 4px 4px 8px #d1d1d1, -4px -4px 8px #ffffff; border-radius: 50%;' },
  { name: 'Oil Slick', css: 'background: linear-gradient(45deg, #ff00ff, #00ffff, #ffff00); opacity: 0.5; mix-blend-mode: overlay;' },
  { name: 'Dashed Box', css: 'border: 2px dashed #333; background: transparent; animation: dash 5s linear infinite;' },
  { name: 'Heat Map', css: 'background: radial-gradient(rgba(255,0,0,0.8) 0%, rgba(255,255,0,0.4) 50%, transparent 100%);' },
  { name: 'Origami Fold', css: 'background: #bdc3c7; clip-path: polygon(0 0, 100% 0, 50% 50%, 100% 100%, 0 100%); opacity: 0.7;' },
  { name: 'Glitch RedBlue', css: 'box-shadow: 2px 0 red, -2px 0 blue; opacity: 0.6;' },
  { name: 'Polka Dot Inverse', css: 'background-color: #333; mask: radial-gradient(circle, transparent 30%, black 35%);' },
  { name: 'Bruised Metal', css: 'background: linear-gradient(135deg, #434343 0%, #000000 100%); border: 1px inset #555;' },
  { name: 'Neon Frame', css: 'background: transparent; box-shadow: inset 0 0 8px #00d2ff, 0 0 8px #00d2ff; border: 1px solid #00d2ff;' },
  { name: 'X-Ray', css: 'filter: invert(1); background: rgba(255,255,255,0.2);' },
  { name: 'Compass Rose', css: 'background: #2c3e50; clip-path: polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);' },
  { name: 'Frosted Emerald', css: 'background: rgba(46, 204, 113, 0.3); backdrop-filter: blur(5px); border-radius: 4px;' },
  { name: 'Comic Halftone', css: 'background-image: radial-gradient(#000 20%, transparent 20%); background-size: 3px 3px; background-position: 1px 1px; opacity: 0.4;' },
];

const EXTRA_STYLES: HighlightStyle[] = [
  { name: 'Blueprint', css: 'background: rgba(0, 0, 255, 0.2); background-image: radial-gradient(white 1px, transparent 0); background-size: 4px 4px;' },
  { name: 'Hatched Right', css: 'background: repeating-linear-gradient(45deg, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 2px, transparent 2px, transparent 4px); border: 1px solid #000;' },
  { name: 'Hatched Left', css: 'background: repeating-linear-gradient(-45deg, rgba(255,0,0,0.2), rgba(255,0,0,0.2) 2px, transparent 2px, transparent 4px);' },
  { name: 'Lava Glow', css: 'background: #ff4757; box-shadow: 0 0 12px #ff4757; opacity: 0.7; border-radius: 2px;' },
  { name: 'Inner Shadow', css: 'box-shadow: inset 2px 2px 5px rgba(0,0,0,0.4); background: rgba(0,0,0,0.05);' },
  { name: 'Zebra', css: 'background: linear-gradient(90deg, rgba(0,0,0,0.2) 50%, transparent 50%); background-size: 4px 100%;' },
  { name: 'Diamond Grid', css: 'background: rgba(46, 213, 115, 0.3); clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);' },
  { name: 'Pulse Border', css: 'border: 2px solid #54a0ff; animation: pulse 1.5s infinite;' },
  { name: 'Inverted White', css: 'background: #000; color: #fff; mix-blend-mode: color-dodge;' },
  { name: 'Pastel Tint', css: 'background: rgba(255, 159, 243, 0.5); border-bottom: 4px solid #f368e0;' },
  { name: 'Checkered', css: 'background-color: rgba(0,0,0,0.1); background-image: linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff); background-size: 4px 4px; background-position: 0 0, 2px 2px;' },
  { name: 'Golden Bezel', css: 'border: 2px outset #f1c40f; background: rgba(241, 196, 15, 0.2);' },
  { name: 'Cyber Blue', css: 'background: #00d2ff; box-shadow: 0 0 5px #00d2ff, 0 0 10px #00d2ff;' },
  { name: 'Ghost Outline', css: 'outline: 2px dashed #7f8c8d; outline-offset: -3px;' },
  { name: 'Carbon Fiber', css: 'background: radial-gradient(circle at 50% 50%, rgba(0,0,0,0.5), #222);' },
  { name: 'Retro Console', css: 'background: #32ff7e; color: #000; font-weight: bold; text-shadow: 1px 1px #fff;' },
  { name: 'Bubble', css: 'background: rgba(255,255,255,0.4); border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); scale: 0.9;' },
  { name: 'Toxic Waste', css: 'background: #badc58; border-top: 4px solid #6ab04c;' },
  { name: 'Midnight Fade', css: 'background: linear-gradient(to bottom right, #2c3e50, #000); opacity: 0.8;' },
  { name: 'Sticker Peel', css: 'background: #fff; border: 1px solid #ccc; border-bottom-right-radius: 8px;' },
];

function mergeUniqueStyles(...groups: HighlightStyle[][]): HighlightStyle[] {
  const seenNames = new Set<string>();
  const merged: HighlightStyle[] = [];

  for (const group of groups) {
    for (const style of group) {
      const normalizedName = style.name.trim().toLowerCase();
      if (!normalizedName || seenNames.has(normalizedName)) continue;
      seenNames.add(normalizedName);
      merged.push(style);
    }
  }

  return merged;
}

const ALL_HIGHLIGHT_STYLES = mergeUniqueStyles(
  CORE_HIGHLIGHT_STYLES,
  OUT_OF_BOX_STYLES,
  EXTRA_STYLES,
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
  private inProgressKey = signal<string | null>(null);
  private prevPct = 0;
  private cloudUnsubscribe: (() => void) | null = null;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly localPrefix = 'pattern_local_';

  readonly activeProjectId = signal<string>('');
  readonly projectList = signal<string[]>([]);
  readonly loading = signal(false);
  readonly statusMessage = signal('');
  readonly storageMode = signal<StorageMode>('cloud');
  readonly pixelSize = signal(20);
  readonly hiddenSymbols = signal<Set<string>>(new Set());
  readonly activeHighlightStyle = signal(0);
  readonly highlightStyles: HighlightStyle[] = ALL_HIGHLIGHT_STYLES;
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
      };

      localStorage.setItem('bordados_settings', JSON.stringify(settings));
      localStorage.setItem('storageMode', settings.storageMode);

      if (this.storageMode() === 'cloud') {
        void this.repository.updateUserSettings(settings).catch((error) => {
          console.error('Settings sync failed:', error);
        });
      }
    });

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
