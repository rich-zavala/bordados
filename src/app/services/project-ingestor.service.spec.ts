import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjectIngestorService } from './project-ingestor.service';
import { SymbolCatalogService } from './symbol-catalog.service';
import { PatternMatrix } from '../models/pattern-matrix.model';

describe('ProjectIngestorService', () => {
  let service: ProjectIngestorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()]
    });
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

  it('uses the fcjson symbol reference when one is provided', () => {
    const sample = {
      model: {
        images: [
          {
            width: 1,
            height: 1,
            layers: [{ cross: [0] }],
            crossIndexes: [{ fi: 0, tp: 'cr' }],
            flossIndexes: [
              {
                id: 'DMC310',
                name: 'Black',
                rgb: [0, 0, 0],
                xc: '000000',
                symbol: 'sm0',
              }
            ]
          }
        ]
      },
      info: { title: 'symbol-test' }
    };

    const matrix = service.parseFcjson(JSON.stringify(sample));

    expect(matrix.l['f0'].s).toBe('□');
    expect(matrix.g).toEqual([['f0']]);
  });

  it('never assigns the same glyph to two different colors, even with sparse/large smN ids', () => {
    const sample = {
      model: {
        images: [
          {
            width: 3,
            height: 1,
            layers: [{ cross: [0, 1, 2] }],
            crossIndexes: [{ fi: 0 }, { fi: 1 }, { fi: 2 }],
            flossIndexes: [
              { id: 'A', name: 'Color A', rgb: [10, 10, 10], symbol: 'sm140' },
              { id: 'B', name: 'Color B', rgb: [20, 20, 20], symbol: 'sm101' },
              { id: 'C', name: 'Color C', rgb: [30, 30, 30], symbol: 'sm61' }
            ]
          }
        ]
      },
      info: { title: 'collision-test' }
    };

    const matrix = service.parseFcjson(JSON.stringify(sample));
    const glyphs = ['f0', 'f1', 'f2'].map((key) => matrix.l[key].s);

    expect(new Set(glyphs).size).toBe(3);
    expect(matrix.l['f2'].symbolRank).toBeLessThan(matrix.l['f1'].symbolRank as number);
    expect(matrix.l['f1'].symbolRank).toBeLessThan(matrix.l['f0'].symbolRank as number);
  });

  it('uses a catalog icon only on an exact code match', () => {
    const catalog = new SymbolCatalogService(null as any);
    (catalog as any).loaded = true;
    (catalog as any).entries = [
      {
        row: 1,
        code: 'DMC 310',
        name: 'Black',
        stitches: 1,
        sampledRgb: [30, 30, 30],
        colorIcon: 'icons/row01_color.png',
        blackIcon: 'icons/row01_black.png'
      }
    ];
    (catalog as any).byCode.set('DMC310', (catalog as any).entries[0]);

    const ingestor = new (ProjectIngestorService as any)(catalog) as ProjectIngestorService;

    const sample = {
      model: {
        images: [
          {
            width: 1,
            height: 1,
            layers: [{ cross: [0] }],
            crossIndexes: [{ fi: 0 }],
            flossIndexes: [
              { id: 'DMC310', name: 'Black', rgb: [32, 32, 31], symbol: 'sm31' }
            ]
          }
        ]
      },
      info: { title: 'catalog-test' }
    };

    const matrix = ingestor.parseFcjson(JSON.stringify(sample));
    expect(matrix.l['f0'].icon).toBe('icons/row01_color.png');
    expect(matrix.l['f0'].symbolSource).toBe('exact-code');
  });

  it('never fabricates a color-based catalog match by default (regression: proven false positives)', () => {
    const catalog = new SymbolCatalogService(null as any);
    (catalog as any).loaded = true;
    (catalog as any).entries = [
      {
        row: 1,
        code: 'ANC 274',
        name: 'Blue Mist - Light',
        stitches: 1,
        sampledRgb: [172, 189, 185],
        colorIcon: 'icons/row05_color.png',
        blackIcon: 'icons/row05_black.png'
      }
    ];

    const ingestor = new (ProjectIngestorService as any)(catalog) as ProjectIngestorService;

    const sample = {
      model: {
        images: [
          {
            width: 1,
            height: 1,
            layers: [{ cross: [0] }],
            crossIndexes: [{ fi: 0 }],
            flossIndexes: [
              { id: '927', name: 'Gray Green - Light', rgb: [169, 190, 184], symbol: 'sm19' }
            ]
          }
        ]
      },
      info: { title: 'no-fake-match-test' }
    };

    const matrix = ingestor.parseFcjson(JSON.stringify(sample));
    expect(matrix.l['f0'].icon).toBeUndefined();
    expect(matrix.l['f0'].symbolSource).toBe('generated');
  });

  it('never lets two different flosses claim the same catalog row', () => {
    const catalog = new SymbolCatalogService(null as any);
    (catalog as any).loaded = true;
    const row = {
      row: 1,
      code: 'DMC 310',
      name: 'Black',
      stitches: 1,
      sampledRgb: [30, 30, 30],
      colorIcon: 'icons/row01_color.png',
      blackIcon: 'icons/row01_black.png'
    };
    (catalog as any).entries = [row];
    (catalog as any).byCode.set('DMC 310', row);

    const ingestor = new (ProjectIngestorService as any)(catalog) as ProjectIngestorService;

    const sample = {
      model: {
        images: [
          {
            width: 2,
            height: 1,
            layers: [{ cross: [0, 1] }],
            crossIndexes: [{ fi: 0 }, { fi: 1 }],
            flossIndexes: [
              { id: 'DMC 310', name: 'Black', rgb: [32, 32, 31], symbol: 'sm31' },
              { id: 'DMC 310', name: 'Black (dup)', rgb: [31, 31, 30], symbol: 'sm31' }
            ]
          }
        ]
      },
      info: { title: 'dedup-test' }
    };

    const matrix = ingestor.parseFcjson(JSON.stringify(sample));
    const gotIcon = ['f0', 'f1'].filter((key) => matrix.l[key].icon).length;
    expect(gotIcon).toBe(1);
    const glyphs = ['f0', 'f1'].map((key) => matrix.l[key].icon || matrix.l[key].s);
    expect(new Set(glyphs).size).toBe(2);
  });

  it('marks near-white floss as background with no symbol', () => {
    const sample = {
      model: {
        images: [
          {
            width: 1,
            height: 1,
            layers: [{ cross: [0] }],
            crossIndexes: [{ fi: 0 }],
            flossIndexes: [
              { id: 'W', name: 'White', rgb: [252, 253, 253], symbol: 'sm0' }
            ]
          }
        ]
      },
      info: { title: 'bg-test' }
    };

    const matrix = service.parseFcjson(JSON.stringify(sample));
    expect(matrix.l['f0'].isBackground).toBe(true);
    expect(matrix.l['f0'].s).toBe('');
  });
});
