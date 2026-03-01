import { TestBed } from '@angular/core/testing';

import { PatternManager } from './pattern-manager';

describe('PatternManager', () => {
  let service: PatternManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatternManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
