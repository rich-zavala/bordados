export interface SymbolDefinition {
  symbol: string;
  shapeType: string;
  innerColor: string;
  backgroundColor: string;
}

export interface Cell {
  symbolKey: string;
}

export interface PatternMatrix {
  metadata: {
    rows: number;
    cols: number;
    title: string; // Add this line
  };
  legend: Record<string, SymbolDefinition>;
  grid: Cell[][];
}