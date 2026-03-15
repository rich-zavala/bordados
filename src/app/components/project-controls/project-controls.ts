import {
  Component, inject, signal,
  ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PathAnimationStyle, PatternManagerService } from '../../services/pattern-manager';
import { ProjectIngestorService } from '../../services/project-ingestor.service';
import { ColorEditorComponent } from '../color-editor/color-editor';

type Tab = 'project' | 'statistics' | 'config' | 'aime';

@Component({
  selector: 'app-project-controls',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorEditorComponent],
  templateUrl: './project-controls.html',
  styleUrls: ['./project-controls.scss']
})
export class ProjectControlsComponent implements OnDestroy {
  private manager = inject(PatternManagerService);
  private ingestor = inject(ProjectIngestorService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('confettiCanvas') confettiCanvas!: ElementRef<HTMLCanvasElement>;

  activeId = this.manager.activeProjectId;
  projectList = this.manager.projectList;
  pattern = this.manager.pattern;
  pixelSize = this.manager.pixelSize;
  hiddenSymbols = this.manager.hiddenSymbols;
  activeHighlightStyle = this.manager.activeHighlightStyle;
  highlightStyles = this.manager.highlightStyles;
  storageMode = this.manager.storageMode;
  activeSymbols = this.manager.activeSymbols;
  overallProgress = this.manager.overallProgress;
  stats = this.manager.stats;
  showOptimalPath = this.manager.showOptimalPath;
  animationStyle = this.manager.animationStyle;
  currentSectorStats = this.manager.currentSectorStats;
  readonly circumference = 2 * Math.PI * 26;

  isOpen = signal<boolean>(false);
  activeTab = signal<Tab>('project');
  activeConfigTab = signal<'view' | 'symbols'>('view');
  letterOpen = signal<boolean>(false);
  editorOpen = signal(false);
  trashItems = signal<Array<{ title: string; deletedAt: number }>>([]);
  importName = '';
  isRenaming = false;
  renameValue = '';
  celebrationMessage = signal<string | null>(null);
  celebrationColor = signal<string>('#e91e8c');
  private celebrationTimer: ReturnType<typeof setTimeout> | null = null;

  private confettiActive = false;
  private confettiFrame: number | null = null;
  private keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.isOpen.update(v => !v);
  };
  private completeHandler = () => this.launchConfetti();
  private colorCompleteHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail as {
      key: string;
      color: string;
      name: string;
      message: string;
    };
    this.showColorCelebration(detail.color, detail.message);
  };

  constructor() {
    document.addEventListener('keydown', this.keyHandler);
    window.addEventListener('pattern-complete', this.completeHandler);
    window.addEventListener('color-complete', this.colorCompleteHandler);
    this.refreshTrashItems();
  }

  getOffset(percent: number): number {
    return this.circumference * (1 - percent / 100);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('pattern-complete', this.completeHandler);
    window.removeEventListener('color-complete', this.colorCompleteHandler);
    if (this.confettiFrame) cancelAnimationFrame(this.confettiFrame);
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
  }

  showColorCelebration(color: string, message: string): void {
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
    this.celebrationColor.set(color);
    this.celebrationMessage.set(message);
    this.celebrationTimer = setTimeout(() => {
      this.celebrationMessage.set(null);
    }, 4000);
  }

  getContrastColor(hex: string): string {
    const h = hex.replace('#', '').padStart(6, '0');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000000' : '#ffffff';
  }

  launchConfetti() {
    if (this.confettiActive || !this.confettiCanvas?.nativeElement) return;
    this.confettiActive = true;
    const canvas = this.confettiCanvas.nativeElement;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#f38ba8','#a6e3a1','#89b4fa','#fab387','#cba6f7','#f9e2af','#94e2d5'];
    const particles = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 6,
      drift: (Math.random() - 0.5) * 2
    }));
    let tick = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p: any) => {
        p.y += p.speed; p.x += p.drift; p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      tick++;
      if (tick < 240) {
        this.confettiFrame = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.confettiActive = false;
      }
    };
    this.confettiFrame = requestAnimationFrame(animate);
  }

  onSelect(id: string) { this.manager.activeProjectId.set(id); }
  setStorage(mode: 'local' | 'cloud') {
    this.manager.setStorageMode(mode);
  }
  setConfigTab(tab: 'view' | 'symbols') {
    this.activeConfigTab.set(tab);
  }
  updatePixelSize(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    this.manager.setPixelSize(Number(target.value));
  }
  setHighlightStyle(index: number) {
    this.manager.setHighlightStyle(index);
  }
  toggleSymbol(symbolKey: string) {
    this.manager.toggleHiddenSymbol(symbolKey);
  }
  toggleOptimalPath() {
    this.manager.toggleOptimalPath();
  }
  setPathAnimationStyle(value: string) {
    this.manager.setAnimationStyle(value as PathAnimationStyle);
  }
  startRename() { this.renameValue = this.activeId(); this.isRenaming = true; }
  confirmRename() {
    const newName = this.renameValue.trim();
    const current = this.activeId();
    if (newName && newName !== current) this.manager.renameProject(current, newName);
    this.isRenaming = false;
  }
  cancelRename() { this.isRenaming = false; }
  deleteCurrent() {
    const current = this.activeId();
    if (!current) return;
    if (confirm('Delete "' + current + '"? This cannot be undone.')) {
      void this.manager.deleteProject(current).finally(() => this.refreshTrashItems());
    }
  }

  recoverProject(title: string): void {
    void this.manager.recoverFromTrash(title).then((ok) => {
      if (ok) {
        this.manager.notify('"' + title + '" recuperado');
      }
      this.refreshTrashItems();
    });
  }

  exportCurrent() {
    this.manager.exportProject();
  }

  async onFcjsonSelected(event: any) {
    const file = event.target.files?.[0] as File | undefined;
    if (!file) return;

    try {
      const text = await file.text();
      const pattern = this.ingestor.parseFcjson(text);
      if (this.importName.trim()) {
        pattern.m.t = this.importName.trim().toLowerCase().replace(/\s+/g, '-');
      }

      const importedTitle = await this.manager.importNewProject(JSON.stringify(pattern));
      this.manager.notify('Proyecto cargado: ' + importedTitle);
      this.importName = '';
    } catch (e: any) {
      const message = e?.message || String(e);
      console.error('Import failed:', e);
      this.manager.notify('Error al importar: ' + message, 2800);
    } finally {
      if (this.fileInput) this.fileInput.nativeElement.value = '';
    }
  }

  private refreshTrashItems(): void {
    this.trashItems.set(this.manager.getTrashItems());
  }
}
