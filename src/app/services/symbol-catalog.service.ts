import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LegendEntry, MatchConfidence, SymbolMatch } from '../models/symbol-catalog.model';

const COLOR_MATCH_TOLERANCE = 3;

@Injectable({ providedIn: 'root' })
export class SymbolCatalogService {
  private byCode = new Map<string, LegendEntry>();
  private entries: LegendEntry[] = [];
  private loaded = false;

  constructor(private http: HttpClient) {}

  async loadManifest(manifestUrl: string): Promise<void> {
    this.entries = await firstValueFrom(this.http.get<LegendEntry[]>(manifestUrl));
    this.byCode.clear();
    for (const entry of this.entries) {
      this.byCode.set(this.normalizeCode(entry.code), entry);
      this.byCode.set(this.compactCode(entry.code), entry);
    }
    this.loaded = true;
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/\s+/g, ' ');
  }

  private compactCode(code: string): string {
    return this.normalizeCode(code).replace(/\s+/g, '');
  }

  private rgbDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    );
  }

  match(flossCode: string | undefined, rgb: number[], allowColorFallback = false): SymbolMatch {
    if (!this.loaded) {
      return { entry: null, confidence: 'none' };
    }

    if (flossCode) {
      const normalized = this.normalizeCode(flossCode);
      const compact = this.compactCode(flossCode);
      const byCode = this.byCode.get(normalized)
        ?? this.byCode.get(compact)
        ?? this.entries.find((entry) => this.normalizeCode(entry.code) === normalized || this.compactCode(entry.code) === compact)
        ?? null;
      if (byCode) {
        return { entry: byCode, confidence: 'exact-code' };
      }
    }

    if (!allowColorFallback) {
      return { entry: null, confidence: 'none' };
    }

    let best: LegendEntry | null = null;
    let bestDist = Infinity;
    for (const entry of this.entries) {
      const d = this.rgbDistance(entry.sampledRgb, rgb);
      if (d < bestDist) {
        bestDist = d;
        best = entry;
      }
    }

    if (best && bestDist <= COLOR_MATCH_TOLERANCE) {
      return { entry: best, confidence: 'verified-color' };
    }

    return { entry: null, confidence: 'none' };
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
