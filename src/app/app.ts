import { Component, signal, inject, effect } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MatrixGridComponent } from './components/matrix-grid/matrix-grid';
import { HotkeysOverlayComponent } from './components/hotkeys-overlay/hotkeys-overlay';
import { ProjectControlsComponent } from './components/project-controls/project-controls';
import { PatternManagerService } from './services/pattern-manager';
import { LoadingService } from './services/loading.service';
import { chipAnimation, modeChipAnimation } from './animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgComponentOutlet, HotkeysOverlayComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  animations: [chipAnimation, modeChipAnimation]
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
