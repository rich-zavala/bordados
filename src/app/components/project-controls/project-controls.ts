import {
  Component, inject, signal, computed,
  ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatternManagerService } from '../../services/pattern-manager';
import { ProjectIngestorService } from '../../services/project-ingestor.service';

type Tab = 'project' | 'statistics' | 'aime';

@Component({
  selector: 'app-project-controls',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './project-controls.html',
  styleUrl: './project-controls.scss'
})
export class ProjectControlsComponent implements OnDestroy {
  private manager = inject(PatternManagerService);
  private ingestor = inject(ProjectIngestorService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('confettiCanvas') confettiCanvas!: ElementRef<HTMLCanvasElement>;

  activeId = this.manager.activeProjectId;
  projectList = this.manager.projectList;
  pattern = this.manager.pattern;

  isOpen = signal<boolean>(false);
  activeTab = signal<Tab>('project');
  letterOpen = signal<boolean>(false);
  importName = '';
  isRenaming = false;
  renameValue = '';

  private confettiActive = false;
  private confettiFrame: number | null = null;
  private keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.isOpen.update(v => !v);
  };
  private completeHandler = () => this.launchConfetti();

  constructor() {
    document.addEventListener('keydown', this.keyHandler);
    window.addEventListener('pattern-complete', this.completeHandler);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('pattern-complete', this.completeHandler);
    if (this.confettiFrame) cancelAnimationFrame(this.confettiFrame);
  }

  readonly stats = computed(() => {
    const p = this.pattern();
    const progress = p.progress ?? {};
    const legend = p.l as any;

    let total = 0;
    let done = 0;
    let inProgress = 0;

    const byColor: Record<string, {
      name: string; color: string;
      total: number; done: number; inProgress: number;
    }> = {};

    for (let r = 0; r < p.g.length; r++) {
      for (let c = 0; c < p.g[r].length; c++) {
        const key = p.g[r][c];
        const def = legend[key];
        if (!def || def.isBackground) continue;
        total++;
        const step = (progress as any)[r + ',' + c] ?? 0;
        if (step === 2) done++;
        if (step === 1) inProgress++;
        if (!byColor[key]) {
          byColor[key] = { name: def.n ?? key, color: def.b, total: 0, done: 0, inProgress: 0 };
        }
        byColor[key].total++;
        if (step === 2) byColor[key].done++;
        if (step === 1) byColor[key].inProgress++;
      }
    }

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const strokeDashoffset = 339.3 - (pct / 100) * 339.3;

    const storageKey = 'project_meta_' + p.m.t;
    let meta = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    if (!meta.startDate && done > 0) {
      meta.startDate = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(meta));
    }
    const startDate: Date | null = meta.startDate ? new Date(meta.startDate) : null;
    const daysInWork = startDate
      ? Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / 86400000))
      : 0;

    return {
      total, done, inProgress, pct, strokeDashoffset,
      pending: total - done - inProgress,
      startDate, daysInWork,
      byColor: Object.values(byColor).sort((a: any, b: any) => b.total - a.total)
    };
  });

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
      this.manager.deleteProject(current);
    }
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
}
