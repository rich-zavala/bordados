import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorEditorService, MergeSuggestion, SubstitutionMatch } from '../../services/color-editor.service';
import { DmcApiService, DmcThread } from '../../services/dmc-api.service';
import { PatternManagerService } from '../../services/pattern-manager';
import { Snapshot, SnapshotService } from '../../services/snapshot.service';
import { ThreadStashService } from '../../services/thread-stash.service';

type EditorTab = 'simplify' | 'stash';

@Component({
  selector: 'app-color-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-editor.html',
  styleUrls: ['./color-editor.scss'],
})
export class ColorEditorComponent implements OnInit, OnDestroy {
  private readonly editor = inject(ColorEditorService);
  readonly snapshotService = inject(SnapshotService);
  readonly stash = inject(ThreadStashService);
  readonly dmc = inject(DmcApiService);
  readonly manager = inject(PatternManagerService);

  @Output() close = new EventEmitter<void>();
  activeTab = signal<EditorTab>('simplify');

  mergeSuggestions = signal<MergeSuggestion[]>([]);
  appliedMerges = signal<Set<string>>(new Set());

  bulkInput = signal('');
  bulkLoading = signal(false);
  bulkErrors = signal<string[]>([]);
  inventoryMatches = signal<SubstitutionMatch[]>([]);
  highlightedThreadId = signal<string | null>(null);
  simplifyDial = signal(0);
  simplifyPreview = computed(() =>
    this.editor.previewSimplify(this.simplifyDial())
  );
  configLabel = signal('');
  showSaveForm = signal(false);

  coveragePercent = computed(() => {
    const matches = this.inventoryMatches();
    if (!matches.length) return null;
    const good = matches.filter((match) => match.quality === 'excellent' || match.quality === 'good').length;
    return Math.round((good / matches.length) * 100);
  });

  snapshots = computed(() => this.snapshotService.list(this.manager.pattern().m.t));
  configList = computed(() => {
    const pattern = this.manager.pattern();
    const configs = pattern.configurations ?? {};
    const active = pattern.activeConfiguration ?? 'original';

    const entries: Array<{
      key: string;
      label: string;
      createdAt: number;
      isActive: boolean;
      isProtected: boolean;
    }> = [];

    entries.push({
      key: 'original',
      label: 'Original',
      createdAt: configs['original']?.createdAt ?? 0,
      isActive: active === 'original',
      isProtected: true,
    });

    Object.entries(configs)
      .filter(([key]) => key !== 'original')
      .sort(([, a], [, b]) => a.createdAt - b.createdAt)
      .forEach(([key, config]) => {
        entries.push({
          key,
          label: config.label,
          createdAt: config.createdAt,
          isActive: active === key,
          isProtected: false,
        });
      });

    return entries;
  });

  constructor() {
    effect(() => {
      const id = this.highlightedThreadId();
      if (!id) {
        this.manager.highlightedCells.set(new Set());
        return;
      }

      const match = this.inventoryMatches().find((entry) => entry.matchThread.id === id);
      if (!match) {
        this.manager.highlightedCells.set(new Set());
        return;
      }

      const pattern = this.manager.pattern();
      const cells = new Set<string>();
      pattern.g.forEach((row, rowIndex) => {
        row.forEach((key, colIndex) => {
          if (key === match.legendKey) cells.add(`${rowIndex},${colIndex}`);
        });
      });

      this.manager.highlightedCells.set(cells);
    });
  }

  ngOnInit(): void {
    this.refreshSuggestions();
    this.refreshMatches();
  }

  ngOnDestroy(): void {
    this.manager.highlightedCells.set(new Set());
  }

  refreshSuggestions(): void {
    this.mergeSuggestions.set(this.editor.getMergeSuggestions());
  }

  refreshMatches(): void {
    this.inventoryMatches.set(this.editor.getInventoryMatches());
  }

  applySuggestion(suggestion: MergeSuggestion): void {
    this.editor.mergeColors(suggestion.dropKeys, suggestion.keepKey);
    const next = new Set(this.appliedMerges());
    next.add(suggestion.keepKey);
    this.appliedMerges.set(next);
    this.refreshSuggestions();
    this.refreshMatches();
  }

  autoSimplifyAll(): void {
    const dial = this.simplifyDial();
    if (dial === 0) return;
    const count = this.editor.autoSimplifyAtDial(dial);
    this.simplifyDial.set(0);
    this.refreshSuggestions();
    this.refreshMatches();
    this.manager.notify(`${count} colores fusionados`);
  }

  async addBulk(): Promise<void> {
    const codes = this.dmc.parseBulkInput(this.bulkInput());
    if (!codes.length) return;

    this.bulkLoading.set(true);
    this.bulkErrors.set([]);

    try {
      const resolved = await this.dmc.resolve(codes);
      const found: DmcThread[] = [];
      const notFound: string[] = [];

      codes.forEach((code) => {
        if (resolved[code]) {
          found.push(resolved[code] as DmcThread);
        } else {
          notFound.push(code);
        }
      });

      this.stash.add(found);
      this.bulkErrors.set(notFound.map((code) => `"${code}" no encontrado`));
      this.bulkInput.set('');
      this.refreshMatches();
    } finally {
      this.bulkLoading.set(false);
    }
  }

  applyAllGoodMatches(): void {
    const good = this.inventoryMatches().filter(
      (match) => match.quality === 'excellent' || match.quality === 'good'
    );
    this.editor.applyInventoryMatches(good);
    this.manager.notify(`${good.length} colores sustituidos con tu colección`);
    this.refreshMatches();
  }

  saveConfig(): void {
    if (!this.configLabel().trim()) return;
    this.manager.saveConfiguration(this.configLabel());
    this.configLabel.set('');
    this.showSaveForm.set(false);
    this.refreshSuggestions();
    this.refreshMatches();
  }

  switchConfig(key: string): void {
    this.manager.switchConfiguration(key);
    this.refreshSuggestions();
    this.refreshMatches();
  }

  deleteConfig(key: string): void {
    this.manager.deleteConfiguration(key);
    this.refreshSuggestions();
    this.refreshMatches();
  }

  restoreSnapshot(snapshot: Snapshot): void {
    if (!confirm(`¿Restaurar al estado "${snapshot.label}"? Se perderán los cambios desde entonces.`)) {
      return;
    }

    this.manager.restorePattern(this.snapshotService.restore(snapshot));
    void this.manager.saveCurrentPattern();
    this.manager.notify('Patrón restaurado correctamente');
    this.refreshSuggestions();
    this.refreshMatches();
  }

  qualityLabel(quality: SubstitutionMatch['quality']): string {
    return {
      excellent: 'Excelente',
      good: 'Bueno',
      fair: 'Aceptable',
      poor: 'Lejano',
    }[quality];
  }

  qualityClass(quality: SubstitutionMatch['quality']): string {
    return {
      excellent: 'q-excellent',
      good: 'q-good',
      fair: 'q-fair',
      poor: 'q-poor',
    }[quality];
  }
}
