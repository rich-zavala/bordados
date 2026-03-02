import { Component, signal, inject, effect } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MatrixGridComponent } from './components/matrix-grid/matrix-grid';
import { ProjectControlsComponent } from './components/project-controls/project-controls';
import { PatternManagerService } from './services/pattern-manager';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgComponentOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly patternManager = inject(PatternManagerService);
  private readonly loadingService = inject(LoadingService);
  protected readonly title = signal('bordados');
  protected readonly matrixGridComponent = MatrixGridComponent;
  protected readonly projectControlsComponent = ProjectControlsComponent;

  constructor() {
    effect(() => {
      if (this.patternManager.loading()) {
        this.loadingService.show();
      } else {
        this.loadingService.hide();
      }
    });
  }
}
