/**
 * One row of a floss legend extracted verbatim from a FlossCross PDF via
 * tools/extract-pdf-legend.py. `colorIcon`/`blackIcon` are exact raster
 * assets pulled out of the PDF — not approximated Unicode glyphs.
 */
export interface LegendEntry {
  row: number;
  code: string;
  name: string;
  stitches: number;
  sampledRgb: [number, number, number];
  colorIcon: string;
  blackIcon: string;
}

export type MatchConfidence = 'exact-code' | 'verified-color' | 'none';

export interface SymbolMatch {
  entry: LegendEntry | null;
  confidence: MatchConfidence;
}
