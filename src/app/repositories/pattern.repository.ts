import { ResourceRef } from '@angular/core';
import { PatternMatrix } from '../models/pattern-matrix.model';

export abstract class PatternRepository {
  abstract getPatternResource(idSource: string | (() => string)): ResourceRef<PatternMatrix>;
  abstract save(data: PatternMatrix): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract getMostRecentId(): string | null;
}