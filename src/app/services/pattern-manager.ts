import { Injectable, signal, computed, inject } from '@angular/core';
import { PatternMatrix, SymbolDefinition, Cell } from '../models/pattern-matrix.model';
import { PatternRepository } from '../repositories/pattern.repository';

@Injectable({
  providedIn: 'root'
})
export class PatternManagerService {
  private readonly repository = inject(PatternRepository);

  readonly pattern = signal<PatternMatrix>({
    metadata: { rows: 0, cols: 0, title: 'New Project' },
    legend: {
      'default': { symbol: '', shapeType: 'empty', innerColor: '#000', backgroundColor: '#fff' }
    },
    grid: []
  });

  // This creates a reactive resource linked to the current pattern's title
  // If the title changes, it could automatically re-fetch (if desired)
  // readonly remoteResource = this.repository.getPatternResource('latest');
  // Inside PatternManagerService
readonly remoteResource = this.repository.getPatternResource('pink-heart');

  readonly hasData = computed(() => this.pattern().grid.length > 0);

  /**
   * Loads data into local state
   */
  ingestData(data: PatternMatrix): void {
    this.pattern.set(data);
  }

  /**
   * Persists current local state to the repository (LocalStorage for now)
   */
  async saveCurrentPattern(): Promise<void> {
    await this.repository.save(this.pattern());
    // Optionally refresh the resource to stay in sync
    this.remoteResource.reload();
  }

  updateCell(row: number, col: number, symbolKey: string): void {
    this.pattern.update(current => {
      const newGrid = current.grid.map((r, rIdx) => 
        rIdx === row 
          ? r.map((c, cIdx) => cIdx === col ? { ...c, symbolKey } : c)
          : r
      );
      return { ...current, grid: newGrid };
    });
  }

  getSymbolDetails(key: string): SymbolDefinition {
    return this.pattern().legend[key] ?? this.pattern().legend['default'];
  }
}