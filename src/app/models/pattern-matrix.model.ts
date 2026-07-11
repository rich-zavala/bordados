export interface SymbolDefinition {
  s: string;
  c: string;
  b: string;
  n?: string;

  /**
   * Raw symbol identifier as it appeared in the source fcjson (e.g. "sm140").
   * This is FlossCross's *internal master-library* index, NOT an index into
   * our local SYMBOLS pool. Keep it around for debugging / re-import, but
   * never use it directly as an array index.
   */
  symbolId?: string;

  /**
   * The numeric rank this floss was assigned within THIS project after
   * sorting all distinct symbolIds in the file. This is what actually
   * indexes into SYMBOLS. Two floss entries in the same project will
   * never share a rank.
   */
  symbolRank?: number;

  /**
   * Relative asset path to a PDF-extracted raster icon, when this floss
   * was matched with verified confidence against a loaded symbol catalog.
   * When present, the UI should render this instead of `s`.
   */
  icon?: string;

  /**
   * How this symbol was resolved:
   * - 'exact-code'    : matched a legend row by floss code, highest trust
   * - 'verified-color': matched a legend row by RGB within tight tolerance
   * - 'generated'     : no verified match found; `s` is a locally
   *                       generated, collision-free Unicode glyph
   */
  symbolSource?: 'exact-code' | 'verified-color' | 'generated';

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
