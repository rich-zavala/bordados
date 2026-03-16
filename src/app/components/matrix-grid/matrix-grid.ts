import { ChangeDetectionStrategy, Component, inject, computed, HostListener, ElementRef, ViewChild, effect, AfterViewInit, OnDestroy, untracked } from '@angular/core';
import { PatternManagerService } from '../../services/pattern-manager';
import { ViewportState, ViewportStateService } from '../../services/viewport-state.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-matrix-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matrix-grid.html',
  styleUrls: ['./matrix-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [],
  host: {
    '[style.--matrix-cols]': 'cols()',
    '[style.--pixel-size.px]': 'pixelSize()',
  }
})
export class MatrixGridComponent implements AfterViewInit, OnDestroy {
  private readonly patternService = inject(PatternManagerService);
  private readonly viewportState = inject(ViewportStateService);
  @ViewChild('canvasViewport') private canvasViewport?: ElementRef<HTMLElement>;
  @ViewChild('gridContainer') gridContainer!: ElementRef<HTMLElement>;
  @ViewChild('panoramicCanvas') panoramicCanvas?: ElementRef<HTMLCanvasElement>;
  private isAppRestoring = true;
  private isTransitioning = false;
  private panoramicActive = false;
  private normalSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private panoramicSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private pixelSizeBeforePanoramic: number | null = null;
  private pendingRafs: number[] = [];
  private readonly scrollHandler = () => {
    if (this.isAppRestoring || this.isTransitioning) return;
    this.debouncedSave(this.panoramicActive ? 'panoramic' : 'normal');
  };

  protected readonly matrix = this.patternService.pattern;
  protected readonly progress = this.patternService.progress;
  protected readonly highlightedCells = this.patternService.highlightedCells;
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
  protected readonly showPanoramicView = this.patternService.showPanoramicView;
  protected readonly isSimplifiedView = computed(() => this.showPanoramicView());
  protected readonly pathStepMap = computed(() => {
    const map = new Map<string, number>();
    const sequence = this.optimalSequence();

    sequence.forEach((key, index) => {
      map.set(key, index);
    });

    return map;
  });

  constructor() {
    effect(() => {
      const id = this.patternService.activeProjectId();
      if (!id) return;

      Object.keys(localStorage)
        .filter((key) =>
          (key.startsWith('aime_viewport_normal_v1_') ||
            key.startsWith('aime_viewport_panoramic_v1_')) &&
          !key.endsWith(`_${id}`)
        )
        .forEach((key) => localStorage.removeItem(key));
    });

    effect(() => {
      const active = this.showPanoramicView();
      this.pendingRafs.forEach((id) => cancelAnimationFrame(id));
      this.pendingRafs = [];

      if (active === this.panoramicActive) return;
      this.panoramicActive = active;
      this.isTransitioning = true;

      if (active) {
        if (!this.isAppRestoring) {
          this.saveCurrentViewport('normal');
        }

        if (this.pixelSizeBeforePanoramic === null) {
          this.pixelSizeBeforePanoramic = untracked(() =>
            this.patternService.pixelSize()
          );
        }

        const projectId = this.patternService.activeProjectId();
        const saved = projectId
          ? this.viewportState.load('panoramic', projectId)
          : null;
        const pattern = this.patternService.pattern();
        const container = this.gridContainer?.nativeElement;

        if (saved) {
          untracked(() => this.patternService.pixelSize.set(saved.pixelSize));
        } else if (pattern.m.r && pattern.m.c && container) {
          const PADDING = 80;
          const fitByW = Math.floor((container.clientWidth - PADDING) / pattern.m.c);
          const fitByH = Math.floor((container.clientHeight - PADDING) / pattern.m.r);
          const fitSize = Math.max(2, Math.min(fitByW, fitByH));
          untracked(() => this.patternService.pixelSize.set(fitSize));
        }

        const raf1 = requestAnimationFrame(() => {
          const raf2 = requestAnimationFrame(() => {
            if (!this.panoramicActive) return;
            if (saved) {
              this.applyViewportState(saved);
            } else {
              this.centerGrid();
            }
            this.renderPanoramicCanvas();
            this.isTransitioning = false;
          });
          this.pendingRafs.push(raf2);
        });
        this.pendingRafs.push(raf1);
      } else {
        const restoreSize = this.pixelSizeBeforePanoramic ?? untracked(() =>
          this.patternService.pixelSize()
        );
        this.pixelSizeBeforePanoramic = null;
        untracked(() => this.patternService.pixelSize.set(restoreSize));

        const projectId = this.patternService.activeProjectId();
        const saved = projectId
          ? this.viewportState.load('normal', projectId)
          : null;

        const raf1 = requestAnimationFrame(() => {
          const raf2 = requestAnimationFrame(() => {
            if (this.panoramicActive) return;
            if (saved) {
              this.applyViewportState(saved);
            }
            this.isTransitioning = false;
          });
          this.pendingRafs.push(raf2);
        });
        this.pendingRafs.push(raf1);
      }
    });
  }

  ngAfterViewInit(): void {
    const container = this.gridContainer?.nativeElement;
    if (container) {
      container.addEventListener('scroll', this.scrollHandler, { passive: true });
    }

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.waitAndRestore(0);
  }

  ngOnDestroy(): void {
    this.pendingRafs.forEach((id) => cancelAnimationFrame(id));
    if (this.normalSaveTimer) clearTimeout(this.normalSaveTimer);
    if (this.panoramicSaveTimer) clearTimeout(this.panoramicSaveTimer);
    const container = this.gridContainer?.nativeElement;
    if (container) {
      container.removeEventListener('scroll', this.scrollHandler);
    }
    window.removeEventListener('scroll', this.scrollHandler);
  }

  private debouncedSave(mode: 'normal' | 'panoramic'): void {
    if (this.isAppRestoring || this.isTransitioning) return;

    if (mode === 'normal') {
      if (this.normalSaveTimer) clearTimeout(this.normalSaveTimer);
      this.normalSaveTimer = setTimeout(() => this.saveCurrentViewport('normal'), 350);
    } else {
      if (this.panoramicSaveTimer) clearTimeout(this.panoramicSaveTimer);
      this.panoramicSaveTimer = setTimeout(() => this.saveCurrentViewport('panoramic'), 350);
    }
  }

  private saveCurrentViewport(mode: 'normal' | 'panoramic'): void {
    const projectId = this.patternService.activeProjectId();
    if (!projectId) return;
    const container = this.gridContainer?.nativeElement;
    if (!container) return;

    this.viewportState.save(mode, {
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      windowScrollX: window.scrollX,
      windowScrollY: window.scrollY,
      pixelSize: this.patternService.pixelSize(),
      projectId,
    });
  }

  private applyViewportState(saved: ViewportState): void {
    const container = this.gridContainer?.nativeElement;
    if (!container) return;

    const savedSize = saved.pixelSize ?? this.patternService.pixelSize();
    const currentSize = this.patternService.pixelSize();
    const ratio = currentSize / savedSize;

    container.scrollLeft = Math.round(saved.scrollLeft * ratio);
    container.scrollTop = Math.round(saved.scrollTop * ratio);

    if (saved.windowScrollX || saved.windowScrollY) {
      window.scrollTo({
        left: Math.round((saved.windowScrollX ?? 0) * ratio),
        top: Math.round((saved.windowScrollY ?? 0) * ratio),
        behavior: 'instant' as ScrollBehavior,
      });
    }
  }

  private renderPanoramicCanvas(): void {
    const canvas = this.panoramicCanvas?.nativeElement;
    if (!canvas) return;

    const pattern = this.patternService.pattern();
    const legend = pattern.l as Record<string, { b?: string; isBackground?: boolean }>;
    const rows = pattern.m.r;
    const cols = pattern.m.c;
    if (!rows || !cols) return;

    const container = this.gridContainer?.nativeElement;
    const PADDING = 48;
    const availableW = (container?.clientWidth ?? window.innerWidth) - PADDING * 2;
    const availableH = (container?.clientHeight ?? window.innerHeight) - PADDING * 2;

    const cellSize = Math.max(
      2,
      Math.min(
        Math.floor(availableW / cols),
        Math.floor(availableH / rows)
      )
    );

    const canvasW = cols * cellSize;
    const canvasH = rows * cellSize;

    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasW, canvasH);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const key = pattern.g[row]?.[col];
        if (!key) continue;
        const def = legend[key];
        if (!def || def.isBackground) continue;

        ctx.fillStyle = def.b ?? '#ccc';
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }

  private restoreViewport(mode: 'normal' | 'panoramic'): void {
    const projectId = this.patternService.activeProjectId();
    if (!projectId) return;

    const saved = this.viewportState.load(mode, projectId);
    if (!saved) {
      if (mode === 'panoramic') this.centerGrid();
      return;
    }

    this.applyViewportState(saved);
  }

  private centerGrid(): void {
    const container = this.gridContainer?.nativeElement;
    if (!container) return;
    container.scrollLeft = Math.max(0,
      (container.scrollWidth - container.clientWidth) / 2);
    container.scrollTop = Math.max(0,
      (container.scrollHeight - container.clientHeight) / 2);
  }

  private waitAndRestore(attempts: number): void {
    if (attempts > 60) {
      this.isAppRestoring = false;
      return;
    }

    const projectId = this.patternService.activeProjectId();
    if (!projectId) {
      setTimeout(() => this.waitAndRestore(attempts + 1), 50);
      return;
    }

    if (this.patternService.loading()) {
      setTimeout(() => this.waitAndRestore(attempts + 1), 50);
      return;
    }

    const pattern = this.patternService.pattern();
    if (!pattern.g.length || pattern.m.r === 0 || pattern.m.c === 0) {
      setTimeout(() => this.waitAndRestore(attempts + 1), 50);
      return;
    }

    const pixelSize = this.patternService.pixelSize();
    const expectedWidth = pattern.m.c * pixelSize;
    const expectedHeight = pattern.m.r * pixelSize;

    const container = this.gridContainer?.nativeElement;
    if (!container) {
      setTimeout(() => this.waitAndRestore(attempts + 1), 50);
      return;
    }

    if (
      container.scrollWidth < expectedWidth ||
      container.scrollHeight < expectedHeight
    ) {
      setTimeout(() => this.waitAndRestore(attempts + 1), 50);
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.restoreViewport('normal');
        this.isAppRestoring = false;
      });
    });
  }

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
        'color': 'transparent',
        'opacity': '1',
        'filter': 'none',
        'background-image': 'none',
        'border-color': 'transparent',
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

  protected isBackgroundCell(cell: string): boolean {
    const def = this.patternService.pattern().l[cell] as any;
    return !def || !!def.isBackground;
  }

  protected getSymbol(cell: string, row: number, col: number): string {
    const p = this.matrix();
    const def = p.l[cell] as any;
    if (!def || def.isBackground) return '';
    if (this.patternService.hiddenSymbols().has(cell)) return '';
    if (this.isSimplifiedView()) return '';
    const step = this.progress()[`${row},${col}`] ?? 0;
    if (step === 1) return '';
    return def.s ?? '';
  }

  protected getPathStepIndex(row: number, col: number): number {
    const key = `${row},${col}`;
    return this.pathStepMap().get(key) ?? -1;
  }

  protected isHighlighted(row: number, col: number): boolean {
    return this.highlightedCells().has(`${row},${col}`);
  }

  @HostListener('document:keydown.space', ['$event'])
  protected handleSpaceBar(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    keyboardEvent.preventDefault();
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
      if (!grid) return;
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
