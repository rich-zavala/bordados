import { TestBed } from '@angular/core/testing';
import { ProjectIngestorService } from './project-ingestor.service';
import { PatternMatrix } from '../models/pattern-matrix.model';

describe('ProjectIngestorService', () => {
  let service: ProjectIngestorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectIngestorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('parses a minimal fcjson correctly', () => {
    const sample = {
      model: {
        images: [
          {
            width: 2,
            height: 1,
            layers: [{ cross: [0, -1] }],
            crossIndexes: [{ fi: 0, tp: 'cr' }],
            flossIndexes: [
              { id: 'DMC310', name: 'Black', rgb: [0, 0, 0], xc: '000000' }
            ]
          }
        ]
      },
      info: { title: 'test' }
    };

    const json = JSON.stringify(sample);
    const matrix = service.parseFcjson(json);
    expect(matrix.m.t).toBe('test');
    expect(matrix.m.r).toBe(1);
    expect(matrix.m.c).toBe(2);
    expect(Object.keys(matrix.l)).toContain('f0');
    expect(matrix.g).toEqual([['f0', '.']]);
  });
});
