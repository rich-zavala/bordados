import { PatternMatrix } from './models/pattern-matrix.model';

export const PINK_HEART: PatternMatrix = {
  metadata: { rows: 10, cols: 10, title: 'pink-heart' },
  legend: {
    'B': { symbol: '', shapeType: 'empty', innerColor: '#000', backgroundColor: '#ffffff' },
    'P': { symbol: '♥', shapeType: 'letter', innerColor: '#ffffff', backgroundColor: '#ff69b4' }
  },
  grid: [
    [{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'P'},{symbolKey:'P'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'}],
    [{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'},{symbolKey:'B'}]
  ]
};