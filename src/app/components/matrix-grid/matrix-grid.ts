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
  }
})
export class MatrixGridComponent {
  private readonly patternService = inject(PatternManagerService);

  protected readonly matrix = this.patternService.pattern;
  protected readonly cols = computed(() => this.matrix().m.c || 1);
  protected readonly isLoading = computed(() => this.patternService.remoteResource.isLoading());
  protected readonly midRow = computed(() => Math.floor((this.matrix().m.r ?? 0) / 2));
  protected readonly midCol = computed(() => Math.floor((this.matrix().m.c ?? 0) / 2));

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

    if (cell === '.' || !def || def.isBackground) {
      return { 'background-color': 'transparent', 'pointer-events': 'none' };
    }

    const step = p.progress?.[`${row},${col}`] ?? 0;

    if (step === 0) return {
      'background-color': def.b,
      'color': def.c,
      'opacity': '0.5',
    };

    if (step === 1) return {
      'background-color': def.b,
      'color': def.c,
      'opacity': '0.85',
      'box-shadow': 'inset 0 0 0 2px rgba(255,200,0,0.8)',
      'background-image': 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)',
    };

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
    const step = p.progress?.[`${row},${col}`] ?? 0;
    if (step === 1) return '';
    return def.s ?? '';
  }
}
