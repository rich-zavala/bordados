import { TestBed } from '@angular/core/testing';

import { PatternManagerService } from './pattern-manager';

describe('PatternManagerService', () => {
  let service: PatternManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatternManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
