import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { PatternManagerService } from '../../services/pattern-manager';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-matrix-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matrix-grid.html',
  styleUrls: ['./matrix-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--matrix-cols]': 'cols()',
    '[style.--pixel-size.px]': 'pixelSize()',
  }
})
export class MatrixGridComponent {
  private readonly patternService = inject(PatternManagerService);

  protected readonly matrix = this.patternService.pattern;
  protected readonly cols = computed(() => this.matrix().m.c || 1);
  protected readonly isLoading = computed(() => this.patternService.remoteResource.isLoading());
  protected readonly midRow = computed(() => Math.floor((this.matrix().m.r ?? 0) / 2));
  protected readonly midCol = computed(() => Math.floor((this.matrix().m.c ?? 0) / 2));
  protected readonly pixelSize = this.patternService.pixelSize;

  protected onCellClick(row: number, col: number): void {
    const def = this.matrix().l[this.matrix().g[row][col]] as any;
    if (!def || def.isBackground) return;
    this.patternService.handleCellClick(row, col);
  }

  protected save(): void {
    this.patternService.saveCurrentPattern();
  }

  protected getTileStyle(cell: string, row: number, col: number) {
    const p = this.matrix();
    const def = p.l[cell] as any;
    const hiddenSymbols = this.patternService.hiddenSymbols();

    if (cell === '.' || !def || def.isBackground) {
      return { 'background-color': 'transparent', 'pointer-events': 'none' };
    }

    if (hiddenSymbols.has(cell)) {
      return {
        'background-color': def.b,
        'opacity': '0',
        'visibility': 'hidden',
        'pointer-events': 'none',
      };
    }

    const step = p.progress?.[`${row},${col}`] ?? 0;

    if (step === 0) return {
      'background-color': def.b,
      'color': def.c,
      'opacity': '0.5',
    };

    if (step === 1) {
      const style = this.patternService.highlightStyles[this.patternService.activeHighlightStyle()]?.css ?? '';
      const parsed = this.cssTextToObject(style);
      return {
        'background-color': def.b,
        'color': def.c,
        'opacity': '0.85',
        ...parsed,
      };
    }

    return {
      'background-color': def.b,
      'color': def.c,
      'opacity': '1',
      'box-shadow': 'inset 0 0 0 2px rgba(0,0,0,0.4)',
    };
  }

  protected getSymbol(cell: string, row: number, col: number): string {
    const p = this.matrix();
    const def = p.l[cell] as any;
    if (!def || def.isBackground) return '';
    if (this.patternService.hiddenSymbols().has(cell)) return '';
    const step = p.progress?.[`${row},${col}`] ?? 0;
    if (step === 1) return '';
    return def.s ?? '';
  }

  private cssTextToObject(cssText: string): Record<string, string> {
    return cssText
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((accumulator, declaration) => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex === -1) return accumulator;
        const property = declaration.slice(0, separatorIndex).trim();
        const value = declaration.slice(separatorIndex + 1).trim();
        if (property && value) {
          accumulator[property] = value;
        }
        return accumulator;
      }, {});
  }
}
