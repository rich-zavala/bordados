import { Injectable, resource, ResourceRef } from '@angular/core';
import { PatternRepository } from './pattern.repository';
import { PatternMatrix } from '../models/pattern-matrix.model';

@Injectable({
  providedIn: 'root'
})
export class LocalPatternRepository extends PatternRepository {
  private readonly PREFIX = 'pattern_db_';

  private readonly EMPTY_PATTERN: PatternMatrix = {
    metadata: { rows: 0, cols: 0, title: 'New Pattern' },
    legend: {
      'default': { symbol: '', shapeType: 'empty', innerColor: '#000', backgroundColor: '#fff' }
    },
    grid: []
  };
  
  getPatternResource(id: string): ResourceRef<PatternMatrix> {
  return resource<PatternMatrix, string>({
    // 1. Changed 'request' to 'params'
    params: () => id, 
    
    loader: async (args) => {
      // 2. Changed 'args.request' to 'args.params'
      const patternId = args.params; 
      
      await new Promise(resolve => setTimeout(resolve, 400));
      const data = localStorage.getItem(this.PREFIX + patternId);
      
      return data ? (JSON.parse(data) as PatternMatrix) : this.EMPTY_PATTERN;
    },
    defaultValue: this.EMPTY_PATTERN
  });
}

  async save(data: PatternMatrix): Promise<void> {
    const id = data.metadata.title || 'latest';
    localStorage.setItem(this.PREFIX + id, JSON.stringify(data));
  }

  async delete(id: string): Promise<void> {
    localStorage.removeItem(this.PREFIX + id);
  }
}