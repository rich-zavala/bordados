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
  protected readonly highlightStyles = this.patternService.highlightStyles;
  protected readonly activeHighlightStyle = this.patternService.activeHighlightStyle;
  protected readonly showOptimalPath = this.patternService.showOptimalPath;
  protected readonly animationStyle = this.patternService.animationStyle;
  protected readonly activeStepIndex = this.patternService.activeStepIndex;
  protected readonly optimalSequence = this.patternService.optimalSequence;
  protected readonly pathStepMap = computed(() => {
    const map = new Map<string, number>();
    const sequence = this.optimalSequence();

    sequence.forEach((key, index) => {
      map.set(key, index);
    });

    return map;
  });

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
      return {
        'background-color': def.b,
        'color': def.c,
        'opacity': '0.85',
      };
    }

    return {
      'background-color': def.b,
      'color': def.c,
      'opacity': '1',
      'filter': 'none',
      'background-image': 'none',
    };
  }

  protected getStep(row: number, col: number): number {
    return this.matrix().progress?.[`${row},${col}`] ?? 0;
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

  protected getPathStepIndex(row: number, col: number): number {
    const key = `${row},${col}`;
    return this.pathStepMap().get(key) ?? -1;
  }
}
