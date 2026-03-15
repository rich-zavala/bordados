import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DmcThread {
  id: string;
  name: string;
  hex: string;
}

@Injectable({ providedIn: 'root' })
export class DmcApiService {
  private readonly http = inject(HttpClient);
  private readonly CACHE_KEY = 'dmc_cache_v1';
  private cache: Record<string, DmcThread> = {};

  constructor() {
    const raw = localStorage.getItem(this.CACHE_KEY);
    if (raw) {
      try {
        this.cache = JSON.parse(raw) as Record<string, DmcThread>;
      } catch {
        this.cache = {};
      }
    }
  }

  async resolve(codes: string[]): Promise<Record<string, DmcThread | null>> {
    const result: Record<string, DmcThread | null> = {};
    const toFetch: string[] = [];

    for (const code of codes) {
      const key = code.trim().toLowerCase();
      if (this.cache[key]) {
        result[code] = this.cache[key];
      } else {
        toFetch.push(code);
      }
    }

    await Promise.all(toFetch.map(async (code) => {
      const normalized = code.trim().toLowerCase();
      try {
        const data = await firstValueFrom(
          this.http.get<{ id: string; name: string; hex: string }>(
            `https://api.efloss.com/v1/thread/dmc/${encodeURIComponent(code)}`
          )
        );

        const thread: DmcThread = {
          id: data.id,
          name: data.name,
          hex: data.hex.startsWith('#') ? data.hex : `#${data.hex}`,
        };
        this.cache[normalized] = thread;
        result[code] = thread;
      } catch {
        try {
          const data = await firstValueFrom(
            this.http.get<{ id: string; name: string; hex: string }>(
              `https://api.efloss.com/v1/thread/anchor/${encodeURIComponent(code)}`
            )
          );

          const thread: DmcThread = {
            id: data.id,
            name: data.name,
            hex: data.hex.startsWith('#') ? data.hex : `#${data.hex}`,
          };
          this.cache[normalized] = thread;
          result[code] = thread;
        } catch {
          result[code] = null;
        }
      }
    }));

    localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
    return result;
  }

  parseBulkInput(raw: string): string[] {
    return raw
      .split(/[\s,;\n]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
}
