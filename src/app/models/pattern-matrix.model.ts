export interface SymbolDefinition {
  s: string;  // symbol
  c: string;  // innerColor (text color)
  b: string;  // bgColor
  n?: string;
  isBackground?: boolean;
}

export interface PatternMatrix {
  m: {        // metadata
    r: number; // rows
    c: number; // cols
    t: string; // title
  };
  l: Record<string, SymbolDefinition>; // legend
  g: string[][]; // grid (just the keys)
  
  // Local-only state (we keep this for the UI)
  progress?: Record<string, number>; // key "row,col" -> step
}