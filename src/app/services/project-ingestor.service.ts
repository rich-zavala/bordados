import { Injectable } from '@angular/core';
import { PatternMatrix, SymbolDefinition } from '../models/pattern-matrix.model';
import { FlossCrossProject } from '../models/flosscross.model';

@Injectable({ providedIn: 'root' })
export class ProjectIngestorService {
  private readonly SYMBOLS = [
    '✦', '◆', '★', '●', '■', '▲', '♥', '✿', '❋', '◉',
    '⬡', '✸', '♦', '⬢', '✶', '○', '□', '△', '☆', '✺',
    '❀', '▶', '♠', '♣', '◇', '✧', '⬟', '►', '✹', '❊'
  ];

  parseFcjson(jsonString: string): PatternMatrix {
    const data: FlossCrossProject = JSON.parse(jsonString);
    const image = data.model.images[0];
    const layer = image.layers[0];
    const { width, height } = image;

    // 1. Build legend
    const legend: Record<string, SymbolDefinition> = {};
    let symbolIndex = 0;

    image.flossIndexes.forEach((floss: any, index: number) => {
      const key = `f${index}`;
      const isBackground = floss.rgb[0] > 240 && floss.rgb[1] > 240 && floss.rgb[2] > 240;
      const bgColor = floss.xc
        ? `#${floss.xc}`
        : `#${floss.hex.toString(16).padStart(6, '0')}`;

      (legend[key] as any) = {
        s: isBackground ? '' : this.SYMBOLS[symbolIndex % this.SYMBOLS.length],
        c: this.getContrastColor(floss.rgb),
        b: bgColor,
        n: `${floss.id} - ${floss.name}`,
        isBackground
      };

      if (!isBackground) symbolIndex++;
    });

    // 2. Build 2D grid from 1D cross array
    const grid: string[][] = [];
    for (let y = 0; y < height; y++) {
      const row: string[] = [];
      for (let x = 0; x < width; x++) {
        const cellValue = layer.cross[y * width + x];
        if (cellValue === -1) {
          row.push('.')
        } else {
          const crossEntry = image.crossIndexes[cellValue];
          row.push(`f${crossEntry.fi}`);
        }
      }
      grid.push(row);
    }

    const matrix: PatternMatrix = {
      m: { r: height, c: width, t: data.info.title || 'New Project' },
      l: legend,
      g: grid
    };

    return this.trimGrid(matrix);
  }

  private trimGrid(matrix: PatternMatrix): PatternMatrix {
    const g = matrix.g;
    const PADDING = 4;

    let minRow = g.length, maxRow = 0;
    let minCol = g[0].length, maxCol = 0;

    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        const def = matrix.l[g[r][c]] as any;
        if (def && !def.isBackground) {
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
        }
      }
    }

    minRow = Math.max(0, minRow - PADDING);
    maxRow = Math.min(g.length - 1, maxRow + PADDING);
    minCol = Math.max(0, minCol - PADDING);
    maxCol = Math.min(g[0].length - 1, maxCol + PADDING);

    const trimmed = g
      .slice(minRow, maxRow + 1)
      .map(row => row.slice(minCol, maxCol + 1));

    return {
      ...matrix,
      m: { ...matrix.m, r: trimmed.length, c: trimmed[0].length },
      g: trimmed
    };
  }

  private getContrastColor(rgb: number[]): string {
    const brightness = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
    return brightness > 186 ? '#000000' : '#ffffff';
  }
}
