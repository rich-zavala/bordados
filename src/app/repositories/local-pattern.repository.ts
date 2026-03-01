import { Injectable, resource, ResourceRef } from '@angular/core';
import { PatternRepository } from './pattern.repository';
import { PatternMatrix } from '../models/pattern-matrix.model';

@Injectable({
  providedIn: 'root'
})
export class LocalPatternRepository extends PatternRepository {
  private readonly PREFIX = 'pattern_db_';

  private readonly EMPTY_PATTERN: PatternMatrix = {
    m: { r: 0, c: 0, t: 'New Pattern' },
    l: {
      'default': { s: '', c: '#000', b: '#fff' }
    },
    g: []
  };
  
  getPatternResource(idSource: string | (() => string)): ResourceRef<PatternMatrix> {
    return resource<PatternMatrix, string>({
      // Use the function wrapper to ensure the resource tracks the signal
      params: () => typeof idSource === 'function' ? idSource() : idSource,
      
      loader: async (args) => {
        const patternId = args.params;
        await new Promise(resolve => setTimeout(resolve, 400));
        const data = localStorage.getItem(this.PREFIX + patternId);
        return data ? (JSON.parse(data) as PatternMatrix) : this.EMPTY_PATTERN;
      },
      defaultValue: this.EMPTY_PATTERN
    });
  }

  async save(data: PatternMatrix): Promise<void> {
    const id = data.m.t || 'latest';
    const entry = { ...data, _savedAt: Date.now() };
    localStorage.setItem(this.PREFIX + id, JSON.stringify(entry));
  }

  getMostRecentId(): string | null {
    type Entry = { id: string; time: number };
    let latest: Entry | null = null;
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => {
        const raw = localStorage.getItem(k);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const time: number = parsed._savedAt ?? 0;
        if (!latest || time > latest.time) {
          latest = { id: k.replace(this.PREFIX, ''), time };
        }
      });
    return latest ? (latest as Entry).id : null;
  }

  async delete(id: string): Promise<void> {
    localStorage.removeItem(this.PREFIX + id);
  }
}