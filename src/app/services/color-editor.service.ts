import { Injectable, inject } from '@angular/core';
import { PatternManagerService } from './pattern-manager';
import { ThreadStashService } from './thread-stash.service';
import { DmcThread } from './dmc-api.service';
import { PatternMatrix } from '../models/pattern-matrix.model';
import { SnapshotService } from './snapshot.service';

export interface MergeSuggestion {
  keepKey: string;
  dropKeys: string[];
  reason: string;
}

export interface SubstitutionMatch {
  legendKey: string;
  patternHex: string;
  patternName: string;
  matchThread: DmcThread;
  distance: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

@Injectable({ providedIn: 'root' })
export class ColorEditorService {
  private readonly manager = inject(PatternManagerService);
  private readonly stash = inject(ThreadStashService);
  private readonly snapshots = inject(SnapshotService);

  mergeColors(fromKeys: string[], intoKey: string): void {
    this.manager.ensureOriginalFrozen();
    this.snapshots.save(
      this.manager.getCurrentPattern(),
      `Antes de fusionar ${fromKeys.length} color(es)`
    );
    this.mergeColorsWithoutSnapshot(fromKeys, intoKey);
  }

  private mergeColorsWithoutSnapshot(fromKeys: string[], intoKey: string): void {
    const toReplace = new Set(fromKeys.filter((key) => key !== intoKey));
    if (!toReplace.size) return;

    this.manager.pattern.update((pattern) => {
      const newGrid = pattern.g.map((row) => row.map((cell) => (toReplace.has(cell) ? intoKey : cell)));
      const newLegend = { ...pattern.l };
      for (const key of toReplace) {
        delete newLegend[key];
      }
      return { ...pattern, g: newGrid, l: newLegend };
    });
    void this.manager.saveCurrentPattern();
  }

  replaceColorHex(legendKey: string, newThread: DmcThread): void {
    this.manager.ensureOriginalFrozen();
    this.snapshots.save(
      this.manager.getCurrentPattern(),
      `Antes de reemplazar ${this.manager.pattern().l[legendKey]?.n ?? legendKey}`
    );
    this.replaceColorHexWithoutSnapshot(legendKey, newThread);
  }

  private replaceColorHexWithoutSnapshot(legendKey: string, newThread: DmcThread): void {
    this.manager.pattern.update((pattern) => {
      const existing = pattern.l[legendKey];
      if (!existing) return pattern;

      const newLegend = { ...pattern.l };
      newLegend[legendKey] = {
        ...existing,
        b: newThread.hex,
        c: this.contrastColor(newThread.hex),
        n: `${newThread.id} - ${newThread.name}`,
      };

      return { ...pattern, l: newLegend };
    });
    void this.manager.saveCurrentPattern();
  }

  dialToThreshold(dial: number): number {
    return Math.round((dial / 100) ** 2 * 441);
  }

  previewSimplify(dial: number): { colorsNow: number; colorsAfter: number; groups: string[][] } {
    const threshold = this.dialToThreshold(dial);
    const symbols = this.manager.activeSymbols();
    const merged = new Set<string>();
    const groups: string[][] = [];

    for (let i = 0; i < symbols.length; i++) {
      if (merged.has(symbols[i].key)) continue;

      const group = [symbols[i].key];
      for (let j = i + 1; j < symbols.length; j++) {
        if (merged.has(symbols[j].key)) continue;
        if (this.colorDist(symbols[i].color, symbols[j].color) <= threshold) {
          group.push(symbols[j].key);
          merged.add(symbols[j].key);
        }
      }

      if (group.length > 1) groups.push(group);
    }

    const colorsEliminated = groups.reduce((sum, group) => sum + group.length - 1, 0);

    return {
      colorsNow: symbols.length,
      colorsAfter: symbols.length - colorsEliminated,
      groups,
    };
  }

  autoSimplifyAtDial(dial: number): number {
    this.manager.ensureOriginalFrozen();
    this.snapshots.save(this.manager.getCurrentPattern(), 'Antes de optimización automática');

    const threshold = this.dialToThreshold(dial);
    const symbols = this.manager.activeSymbols();
    const merged = new Set<string>();
    let count = 0;

    for (let i = 0; i < symbols.length; i++) {
      if (merged.has(symbols[i].key)) continue;

      const dropKeys: string[] = [];
      for (let j = i + 1; j < symbols.length; j++) {
        if (merged.has(symbols[j].key)) continue;
        if (this.colorDist(symbols[i].color, symbols[j].color) <= threshold) {
          dropKeys.push(symbols[j].key);
          merged.add(symbols[j].key);
        }
      }

      if (dropKeys.length > 0) {
        this.mergeColorsWithoutSnapshot(dropKeys, symbols[i].key);
        count += dropKeys.length;
      }
    }

    return count;
  }

  getInventoryMatches(): SubstitutionMatch[] {
    const stash = this.stash.threads();
    if (!stash.length) return [];

    return this.manager.activeSymbols()
      .map((symbol) => {
        const best = stash
          .map((thread) => ({ thread, distance: this.colorDist(symbol.color, thread.hex) }))
          .sort((a, b) => a.distance - b.distance)[0];

        return {
          legendKey: symbol.key,
          patternHex: symbol.color,
          patternName: this.manager.pattern().l[symbol.key]?.n ?? symbol.key,
          matchThread: best.thread,
          distance: best.distance,
          quality: this.scoreQuality(best.distance),
        } as SubstitutionMatch;
      })
      .sort((a, b) => a.distance - b.distance);
  }

  applyInventoryMatches(matches: SubstitutionMatch[]): void {
    this.manager.ensureOriginalFrozen();
    this.snapshots.save(this.manager.getCurrentPattern(), 'Antes de aplicar colección de hilos');
    for (const match of matches) {
      this.replaceColorHexWithoutSnapshot(match.legendKey, match.matchThread);
    }
  }

  getMergeSuggestions(): MergeSuggestion[] {
    const symbols = this.manager.activeSymbols();
    const used = new Set<string>();
    const suggestions: MergeSuggestion[] = [];

    const counts = this.getSymbolCounts(this.manager.pattern());

    for (let i = 0; i < symbols.length; i++) {
      if (used.has(symbols[i].key)) continue;

      const similar = symbols.slice(i + 1).filter((symbol) =>
        !used.has(symbol.key) && this.colorDist(symbols[i].color, symbol.color) < 80
      );
      if (!similar.length) continue;

      const group = [symbols[i], ...similar];
      const keep = group.reduce((a, b) => (counts[a.key] >= counts[b.key] ? a : b));

      group.filter((symbol) => symbol.key !== keep.key).forEach((symbol) => used.add(symbol.key));
      suggestions.push({
        keepKey: keep.key,
        dropKeys: group.filter((symbol) => symbol.key !== keep.key).map((symbol) => symbol.key),
        reason: `${group.length} colores similares`,
      });
    }

    return suggestions;
  }

  colorDist(h1: string, h2: string): number {
    const [r1, g1, b1] = this.hexToRgb(h1);
    const [r2, g2, b2] = this.hexToRgb(h2);
    return Math.round(Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2));
  }

  private getSymbolCounts(pattern: PatternMatrix): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of pattern.g) {
      for (const key of row) {
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const stripped = hex.replace('#', '').padStart(6, '0');
    return [
      parseInt(stripped.slice(0, 2), 16),
      parseInt(stripped.slice(2, 4), 16),
      parseInt(stripped.slice(4, 6), 16),
    ];
  }

  private contrastColor(hex: string): string {
    const [r, g, b] = this.hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000000' : '#ffffff';
  }

  private scoreQuality(distance: number): SubstitutionMatch['quality'] {
    if (distance < 30) return 'excellent';
    if (distance < 70) return 'good';
    if (distance < 120) return 'fair';
    return 'poor';
  }
}
