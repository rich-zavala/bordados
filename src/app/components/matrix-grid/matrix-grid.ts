import { ChangeDetectionStrategy, Component, inject, computed, HostListener, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('canvasViewport') private canvasViewport?: ElementRef<HTMLElement>;

  protected readonly matrix = this.patternService.pattern;
  protected readonly progress = this.patternService.progress;
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

    const step = this.progress()[`${row},${col}`] ?? 0;

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
    return this.progress()[`${row},${col}`] ?? 0;
  }

  protected getSymbol(cell: string, row: number, col: number): string {
    const p = this.matrix();
    const def = p.l[cell] as any;
    if (!def || def.isBackground) return '';
    if (this.patternService.hiddenSymbols().has(cell)) return '';
    const step = this.progress()[`${row},${col}`] ?? 0;
    if (step === 1) return '';
    return def.s ?? '';
  }

  protected getPathStepIndex(row: number, col: number): number {
    const key = `${row},${col}`;
    return this.pathStepMap().get(key) ?? -1;
  }

  @HostListener('document:keydown.space', ['$event'])
  protected handleSpaceBar(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    keyboardEvent.preventDefault();
    console.log('Space pressed: Centering sector...');
    this.centerActiveSector();
  }

  private centerActiveSector(): void {
    const viewport =
      this.canvasViewport?.nativeElement ??
      (document.querySelector('.canvas-viewport') as HTMLElement | null);
    if (!viewport) return;

    const sequence = this.optimalSequence();
    if (!sequence || sequence.length === 0) {
      const grid = document.querySelector('.matrix-container') as HTMLElement | null;
      if (!grid) {
        console.warn('No active sector to center.');
        return;
      }

      console.log('No sector active, centering whole grid.');
      viewport.scrollTo({
        left: Math.max(0, grid.scrollWidth / 2 - viewport.clientWidth / 2),
        top: Math.max(0, grid.scrollHeight / 2 - viewport.clientHeight / 2),
        behavior: 'smooth',
      });
      return;
    }

    let minTop = Number.POSITIVE_INFINITY;
    let maxBottom = Number.NEGATIVE_INFINITY;
    let minLeft = Number.POSITIVE_INFINITY;
    let maxRight = Number.NEGATIVE_INFINITY;

    for (const key of sequence) {
      const cell = document.querySelector(`[data-coord="${key}"]`) as HTMLElement | null;
      if (!cell) continue;

      const top = cell.offsetTop;
      const left = cell.offsetLeft;
      const bottom = top + cell.offsetHeight;
      const right = left + cell.offsetWidth;

      if (top < minTop) minTop = top;
      if (bottom > maxBottom) maxBottom = bottom;
      if (left < minLeft) minLeft = left;
      if (right > maxRight) maxRight = right;
    }

    if (!Number.isFinite(minTop) || !Number.isFinite(minLeft)) return;

    const centerX = (minLeft + maxRight) / 2;
    const centerY = (minTop + maxBottom) / 2;

    viewport.scrollTo({
      left: Math.max(0, centerX - viewport.clientWidth / 2),
      top: Math.max(0, centerY - viewport.clientHeight / 2),
      behavior: 'smooth',
    });
  }
}
