import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PatternManagerService } from '../../services/pattern-manager';
import { hotkeysAnimation } from '../../animations';

@Component({
  selector: 'app-hotkeys-overlay',
  standalone: true,
  imports: [],
  template: `
    @if (manager.showHotkeys()) {
      <div class="hotkeys-overlay" @hotkeys role="complementary" aria-label="Atajos de teclado">
        @for (hk of hotkeys; track hk.key) {
          <div class="hotkey-row">
            <kbd class="key">{{ hk.key }}</kbd>
            <span class="key-label">{{ hk.label }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .hotkeys-overlay {
      position: fixed;
      bottom: 100px;
      left: 16px;
      background: rgba(20, 20, 30, 0.82);
      backdrop-filter: blur(8px);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 10px 14px;
      z-index: 9500;
      display: flex;
      flex-direction: column;
      gap: 6px;
      pointer-events: none;
    }

    .hotkey-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .key {
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      background: rgba(255, 255, 255, 0.12);
      border: 0.5px solid rgba(255, 255, 255, 0.2);
      border-radius: 5px;
      padding: 2px 7px;
      color: #fff;
      min-width: 52px;
      text-align: center;
      white-space: nowrap;
    }

    .key-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      white-space: nowrap;
    }
  `],
  animations: [hotkeysAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotkeysOverlayComponent {
  readonly manager = inject(PatternManagerService);

  readonly hotkeys = [
    { key: 'P',      label: 'Vista panorámica' },
    { key: 'S',      label: 'Abrir estadísticas' },
    { key: 'C',      label: 'Abrir configuración' },
    { key: 'Espacio', label: 'Ruta óptima on/off' },
    { key: '+  /  −', label: 'Zoom' },
    { key: 'Esc',    label: 'Cerrar / salir de modo' },
    { key: '?',      label: 'Mostrar / ocultar atajos' },
  ];
}
