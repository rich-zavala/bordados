import { Injectable, Optional } from '@angular/core';
import { PatternMatrix, SymbolDefinition } from '../models/pattern-matrix.model';
import { FlossCrossProject } from '../models/flosscross.model';
import { SymbolCatalogService } from './symbol-catalog.service';

@Injectable({ providedIn: 'root' })
export class ProjectIngestorService {
  /**
   * Local glyph pool. NOTE: this is our own rendering set — it is NOT the
   * same numbering as FlossCross's internal "smN" master library (which we
   * confirmed goes past 140 entries). We only ever assign glyphs from this
   * pool by RANK (see `buildSymbolRankMap`), never by treating an "smN"
   * value as a direct index. That distinction is what prevents color
   * collisions.
   */
  private readonly SYMBOLS = [
    '□', '✕', '●', '♣', '◺', 'S', '⧖', '♥', '≡', '♡',
    '∠', '✚', '○', '∘', '#', '☆', '‹', '∕•', '✳', '┌',
    '┐', '◇', '▽', 'm', '☾', '■', '✦', '◆', '★', '◉',
    '△', '▲', '▷', '◁', '⬡', '⬢', '⊕', '⊗', '⊙', '⊘',
    '⋈', '⋔', '⌂', '⌘', '⌬', '⎔', '⏢', '▪', '▫', '◻',
    '◼', '◽', '◾', '⬦', '⬧', '⬨', '⬩', '⟁', '⟐', '⟡',
    '⟢', '⟣', '⟤', '⟥'
  ];

  constructor(@Optional() private catalog?: SymbolCatalogService) {}

  /**
   * @param jsonString raw fcjson content
   * @param useCatalog when true (default) and a SymbolCatalogService with
   *        a loaded manifest is available, floss entries are matched against
   *        real PDF-extracted icons first. Only verified matches are accepted.
   */
  parseFcjson(jsonString: string, useCatalog = true): PatternMatrix {
    const data: FlossCrossProject = JSON.parse(jsonString);
    const image = data.model.images[0];
    const layer = image.layers[0];
    const { width, height } = image;

    // 1. Catalog pass — only accept a PDF icon when it's verified AND not
    //    already claimed by a different floss in this project.
    const catalogMatches = new Map<number, { icon: string; source: 'exact-code' | 'verified-color' }>();
    const claimedRows = new Set<number>();

    if (useCatalog && this.catalog?.isLoaded()) {
      image.flossIndexes.forEach((floss: any, index: number) => {
        const match = this.catalog!.match(floss.id, floss.rgb);
        if (!match.entry || match.confidence === 'none') return;
        if (claimedRows.has(match.entry.row)) return;

        catalogMatches.set(index, {
          icon: match.entry.colorIcon,
          source: match.confidence,
        });
        claimedRows.add(match.entry.row);
      });
    }

    // 2. Generated-glyph pass — runs only over whatever the catalog pass
    //    didn't resolve, so ranks/glyphs are guaranteed unique among
    //    themselves AND never collide with a catalog icon.
    const flossNeedingGenerated = image.flossIndexes
      .map((floss: any, index: number) => ({ floss, index }))
      .filter(({ floss, index }) =>
        !this.isBackgroundColor(floss.rgb) && !catalogMatches.has(index)
      );

    const rankMap = this.buildSymbolRankMap(
      flossNeedingGenerated.map((item) => item.floss),
      flossNeedingGenerated.map((item) => item.index)
    );

    // 3. Build legend
    const legend: Record<string, SymbolDefinition> = {};

    image.flossIndexes.forEach((floss: any, index: number) => {
      const key = `f${index}`;
      const isBackground = this.isBackgroundColor(floss.rgb);
      const bgColor = this.getBackgroundColor(floss.rgb, floss.xc, floss.hex);

      const catalogHit = catalogMatches.get(index);
      const rank = rankMap.get(index);

      let symbolGlyph = '';
      let icon: string | undefined;
      let symbolSource: SymbolDefinition['symbolSource'];

      if (isBackground) {
        symbolGlyph = '';
      } else if (catalogHit) {
        icon = catalogHit.icon;
        symbolSource = catalogHit.source;
      } else if (rank !== undefined) {
        symbolGlyph = this.glyphForRank(rank);
        symbolSource = 'generated';
      }

      (legend[key] as any) = {
        s: symbolGlyph,
        c: this.getContrastColor(floss.rgb),
        b: bgColor,
        n: `${floss.id} - ${floss.name}`,
        symbolId: typeof floss.symbol === 'string' ? floss.symbol : undefined,
        symbolRank: rank,
        icon,
        symbolSource,
        isBackground
      };
    });

    this.assertNoDuplicateSymbols(legend);

    // 4. Build 2D grid from 1D cross array
    const grid: string[][] = [];
    for (let y = 0; y < height; y++) {
      const row: string[] = [];
      for (let x = 0; x < width; x++) {
        const cellValue = layer.cross[y * width + x];
        if (cellValue === -1) {
          row.push('.');
        } else {
          const crossEntry = image.crossIndexes[cellValue];
          row.push(`f${crossEntry.fi}`);
        }
      }
      grid.push(row);
    }

    const matrix: PatternMatrix = {
      m: { r: height, c: width, t: data.info.title || 'New Project' },
      l: legend,
      g: grid
    };

    return this.trimGrid(matrix);
  }

  /**
   * Assigns each non-background floss index a unique rank (0..N-1) within
   * this project. Ranking is derived from the numeric part of the fcjson
   * "smN" id when present (sorted ascending, so relative ordering from the
   * source file is preserved as a tie-breaker / best-effort visual
   * consistency), and falls back to array order for entries that have no
   * usable "smN" id or a direct glyph override.
   */
  private buildSymbolRankMap(flossSubset: any[], originalIndices: number[]): Map<number, number> {
    const candidates: { index: number; sortKey: number }[] = [];

    flossSubset.forEach((floss, i) => {
      const originalIndex = originalIndices[i];
      const parsed = this.parseSmId(floss.symbol);
      const sortKey = parsed !== null
        ? parsed
        : Number.MAX_SAFE_INTEGER - (flossSubset.length - i);
      candidates.push({ index: originalIndex, sortKey });
    });

    candidates.sort((a, b) => a.sortKey - b.sortKey || a.index - b.index);

    const rankMap = new Map<number, number>();
    candidates.forEach((candidate, rank) => rankMap.set(candidate.index, rank));
    return rankMap;
  }

  private assertNoDuplicateSymbols(legend: Record<string, SymbolDefinition>): void {
    const seen = new Map<string, string>();
    for (const [key, def] of Object.entries(legend)) {
      if (def.isBackground) continue;
      const identity = def.icon ? `icon:${def.icon}` : `glyph:${def.s}`;
      if (!identity || identity === 'glyph:') continue;
      const prior = seen.get(identity);
      if (prior) {
        throw new Error(`Duplicate visible symbol assignment detected: '${identity}' used by '${prior}' and '${key}'.`);
      }
      seen.set(identity, key);
    }
  }

  private parseSmId(symbol: unknown): number | null {
    if (typeof symbol !== 'string') return null;
    const match = /^sm(\d+)$/i.exec(symbol.trim());
    return match ? Number(match[1]) : null;
  }

  /**
   * Turns a project-local rank into an actual glyph. If a project has more
   * distinct colors than our pool size, we combine two pool glyphs into a
   * still-unique pair rather than silently reusing a single glyph.
   */
  private glyphForRank(rank: number): string {
    const n = this.SYMBOLS.length;
    if (rank < n) {
      return this.SYMBOLS[rank];
    }
    const overflow = rank - n;
    const a = this.SYMBOLS[overflow % n];
    const b = this.SYMBOLS[Math.floor(overflow / n) % n];
    return `${a}${b}`;
  }

  private isBackgroundColor(rgb: number[]): boolean {
    return rgb[0] > 240 && rgb[1] > 240 && rgb[2] > 240;
  }

  private getBackgroundColor(rgb: number[], xc?: string | null, hex?: number): string {
    if (xc) return `#${xc}`;
    if (typeof hex === 'number') return `#${hex.toString(16).padStart(6, '0')}`;
    return `#${rgb.map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0')).join('')}`;
  }

  private trimGrid(matrix: PatternMatrix): PatternMatrix {
    const g = matrix.g;
    const PADDING = 4;

    let minRow = g.length, maxRow = 0;
    let minCol = g[0].length, maxCol = 0;

    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        const def = matrix.l[g[r][c]] as any;
        if (def && !def.isBackground) {
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
        }
      }
    }

    minRow = Math.max(0, minRow - PADDING);
    maxRow = Math.min(g.length - 1, maxRow + PADDING);
    minCol = Math.max(0, minCol - PADDING);
    maxCol = Math.min(g[0].length - 1, maxCol + PADDING);

    const trimmed = g
      .slice(minRow, maxRow + 1)
      .map(row => row.slice(minCol, maxCol + 1));

    return {
      ...matrix,
      m: { ...matrix.m, r: trimmed.length, c: trimmed[0].length },
      g: trimmed
    };
  }

  private getContrastColor(rgb: number[]): string {
    const brightness = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
    return brightness > 186 ? '#000000' : '#ffffff';
  }
}
