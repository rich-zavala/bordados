import { ChangeDetectionStrategy, Component, inject, computed, effect } from '@angular/core';
import { PatternManagerService } from '../../services/pattern-manager';
import { CommonModule } from '@angular/common'; // Add this if you use @if/@for

@Component({
  selector: 'app-matrix-grid',
  standalone: true,
  imports: [CommonModule], // Ensure this is here
  templateUrl: './matrix-grid.html',
  styleUrl: './matrix-grid.scss',
  host: {
    // This MUST match the variable name in your SCSS
    '[style.--matrix-cols]': 'matrix().metadata.cols',
  }
})
export class MatrixGridComponent {
  private readonly patternService = inject(PatternManagerService);
  
  // Expose the resource to the template
  protected readonly patternResource = this.patternService.remoteResource;
  
  protected readonly matrix = this.patternService.pattern;
  protected readonly cols = computed(() => this.matrix().metadata.cols);

  constructor() {
    // Automatically update the local service state when the resource finishes loading
    effect(() => {
      const remoteData = this.patternResource.value();
      if (remoteData && remoteData.grid.length > 0) {
        this.patternService.ingestData(remoteData);
      }
    });
  }

  protected save(): void {
    this.patternService.saveCurrentPattern();
  }

  protected onCellClick(row: number, col: number): void {
    const cell = this.matrix().grid[row][col];
    console.log(`Interacted with cell at [${row}, ${col}]:`, cell.symbolKey);
  }
}