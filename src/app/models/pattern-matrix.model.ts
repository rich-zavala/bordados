export interface SymbolDefinition {
  s: string;
  c: string;
  b: string;
  n?: string;
  isBackground?: boolean;
}

export interface ColorConfiguration {
  label: string;
  legend: Record<string, SymbolDefinition>;
  createdAt: number;
}

export interface PatternMatrix {
  m: {
    r: number;
    c: number;
    t: string;
  };
  l: Record<string, SymbolDefinition>;
  g: string[][];
  progress?: Record<string, number>;

  configurations?: Record<string, ColorConfiguration>;
  activeConfiguration?: string;
}