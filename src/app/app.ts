import { Component, signal } from '@angular/core';
import { MatrixGridComponent } from './components/matrix-grid/matrix-grid';
import { ProjectControlsComponent } from './components/project-controls/project-controls';

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
  protected readonly title = signal('bordados');
}
