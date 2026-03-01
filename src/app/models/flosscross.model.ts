export interface FlossCrossProject {
  model: {
    images: Array<{
      width: number;
      height: number;
      layers: Array<{
        cross: number[]; // The 1D grid array
      }>;
      crossIndexes: Array<{
        fi: number; // Index into flossIndexes
        tp: string; // Stitch type ("cr")
      }>;
      flossIndexes: Array<{
        id: string;   // DMC ID
        name: string; // DMC Name
        rgb: [number, number, number];
        xc: string | null;   // Hex string from newer fcjson (may be null)
        hex?: number;        // Numeric fallback hex (e.g. 2105375)
        symbol?: string;     // optional symbol character
      }>; 
    }>;
  };
  info: {
    title: string;
  };
}
