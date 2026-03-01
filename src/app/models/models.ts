/**
 * Represents the entire grid pattern.
 */
interface PatternMatrix {
  metadata: {
    rows: number;
    cols: number;
    title?: string;
  };
  // A dictionary of symbols used in the pattern to define their properties globally
  legend: Record<string, SymbolDefinition>;
  // The actual grid data
  grid: Cell[][];
}

/**
 * Detailed definition of what a symbol represents.
 */
interface SymbolDefinition {
  symbol: string;         // e.g., "↑", "L", "X"
  shapeType: ShapeType;   // e.g., 'icon', 'geometric', 'fill'
  innerColor: string;     // Hex or CSS color for the symbol itself
  backgroundColor: string; // Hex or CSS color for the cell background
  description?: string;   // e.g., "DMC 666 Bright Red"
}

type ShapeType = 'arrow' | 'letter' | 'math' | 'custom-icon' | 'empty';

/**
 * The individual cell state.
 */
interface Cell {
  row: number;
  col: number;
  // Reference to the key in the legend
  symbolKey: string | null; 
  // Overrides for specific cells if they deviate from the legend
  override?: Partial<Omit<SymbolDefinition, 'symbol'>>;
}