import { Component, signal, inject } from '@angular/core';
import { MatrixGridComponent } from './components/matrix-grid/matrix-grid';
import { ProjectControlsComponent } from './components/project-controls/project-controls';
import { PatternManagerService } from './services/pattern-manager';

@Component({
  selector: 'app-root',
  imports: [
    ProjectControlsComponent,
    MatrixGridComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly patternManager = inject(PatternManagerService);
  protected readonly title = signal('bordados');
}
