import { Component, signal } from '@angular/core';
import { MatrixGridComponent} from './components/matrix-grid/matrix-grid'

@Component({
  selector: 'app-root',
  imports: [
    MatrixGridComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('bordados');
}
