import { Injectable, signal, inject, effect } from '@angular/core';
import { PatternMatrix } from '../models/pattern-matrix.model';
import { PatternRepository } from '../repositories/pattern.repository';

@Injectable({ providedIn: 'root' })
export class PatternManagerService {
  private readonly repository = inject(PatternRepository);
  private inProgressKey = signal<string | null>(null);
  private prevPct = 0;

  readonly activeProjectId = signal<string>('pink-heart');
  readonly projectList = signal<string[]>([]);
  readonly remoteResource = this.repository.getPatternResource(() => this.activeProjectId());
  readonly pattern = signal<PatternMatrix>({
    m: { r: 0, c: 0, t: 'Loading...' },
    l: {},
    g: []
  });

  constructor() {
    this.refreshProjectList();

    const mostRecent = this.repository.getMostRecentId();
    if (mostRecent) {
      this.activeProjectId.set(mostRecent);
    } else if (this.projectList().length > 0) {
      this.activeProjectId.set(this.projectList()[0]);
    }

    effect(() => {
      this.pattern.set(this.remoteResource.value());
    });
  }

  private refreshProjectList() {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('pattern_db_'))
      .map(k => k.replace('pattern_db_', ''));

    this.projectList.set(keys);
  }

  async saveCurrentPattern(): Promise<void> {
    const currentData = this.pattern();
    if (currentData.m.t && currentData.m.t !== 'Loading...') {
      await this.repository.save(currentData);
      this.remoteResource.reload();
    }
  }

  async importNewProject(jsonString: string) {
    try {
      const data = JSON.parse(jsonString) as PatternMatrix;
      await this.repository.save(data);
      this.refreshProjectList();
      this.activeProjectId.set(data.m.t);
    } catch (e) {
      alert('Invalid JSON format. Please check the pattern structure.');
    }
  }

  private getAllProjects(): PatternMatrix[] {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('pattern_db_'))
      .map(k => JSON.parse(localStorage.getItem(k)!) as PatternMatrix);
  }

  private saveAll(projects: PatternMatrix[]): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith('pattern_db_'))
      .forEach(k => localStorage.removeItem(k));
    projects.forEach(p => {
      const id = p.m.t || 'untitled';
      localStorage.setItem(`pattern_db_${id}`, JSON.stringify(p));
    });
    this.refreshProjectList();
  }

  renameProject(oldTitle: string, newTitle: string) {
    const projects = this.getAllProjects();
    const project = projects.find(p => p.m.t === oldTitle);
    if (project) {
      project.m.t = newTitle;
      this.saveAll(projects);
      if (this.activeProjectId() === oldTitle) this.activeProjectId.set(newTitle);
    }
  }

  deleteProject(title: string) {
    let projects = this.getAllProjects();
    projects = projects.filter(p => p.m.t !== title);
    this.saveAll(projects);
    if (this.activeProjectId() === title) {
      this.activeProjectId.set(this.projectList()[0] || '');
    }
  }

  /**
   * Sector = the clicked cell + its immediate same-color neighbors (8-directional, 1 step only).
   * 
   * Flow:
   *  - Click pending sector   → clear previous in-progress → mark sector as in-progress
   *  - Click in-progress sector again → mark sector as done
   *  - Click done sector      → reset sector to pending
   */
  handleCellClick(row: number, col: number): void {
    this.pattern.update(current => {
      const progress = { ...(current.progress ?? {}) };
      const coordKey = `${row},${col}`;
      const currentStep = progress[coordKey] ?? 0;
      const targetKey = current.g[row][col];

      // Get sector: clicked cell + same-color immediate neighbors
      const sector = this.getSector(current.g, row, col, targetKey);

      if (currentStep === 1) {
        // Already in-progress → mark whole sector as done
        sector.forEach(k => { progress[k] = 2; });
        this.inProgressKey.set(null);
      } else if (currentStep === 2) {
        // Done → reset sector to pending
        sector.forEach(k => { progress[k] = 0; });
        this.inProgressKey.set(null);
      } else {
        // Pending → clear any existing in-progress sector first
        const prevKey = this.inProgressKey();
        if (prevKey) {
          const [pr, pc] = prevKey.split(',').map(Number);
          if (current.g[pr]?.[pc]) {
            const prevSector = this.getSector(current.g, pr, pc, current.g[pr][pc]);
            prevSector.forEach(k => {
              if ((progress[k] ?? 0) === 1) progress[k] = 0;
            });
          }
        }
        // Mark new sector as in-progress
        sector.forEach(k => { progress[k] = 1; });
        this.inProgressKey.set(coordKey);
      }

      return { ...current, progress };
    });

    this.saveCurrentPattern();
    this.checkCompletion();
  }

  private checkCompletion(): void {
    const p = this.pattern();
    const progress = p.progress ?? {};
    const legend = p.l as any;
    let total = 0;
    let done = 0;
    for (let r = 0; r < p.g.length; r++) {
      for (let c = 0; c < p.g[r].length; c++) {
        const def = legend[p.g[r][c]];
        if (!def || def.isBackground) continue;
        total++;
        if ((progress as any)[r + ',' + c] === 2) done++;
      }
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (pct === 100 && this.prevPct !== 100) {
      this.onComplete();
    }
    this.prevPct = pct;
  }

  private onComplete(): void {
    window.dispatchEvent(new CustomEvent('pattern-complete'));
  }

  /**
   * Returns all coord keys for the contiguous sector of same-color cells (4-way BFS flood-fill).
   */
  private getSector(grid: string[][], row: number, col: number, targetKey: string): string[] {
    const found: string[] = [];
    const visited = new Set<string>();
    const queue: [number, number][] = [[row, col]];

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const key = r + ',' + c;
      if (visited.has(key)) continue;
      if (r < 0 || r >= grid.length) continue;
      if (c < 0 || c >= grid[r].length) continue;
      if (grid[r][c] !== targetKey) continue;
      visited.add(key);
      found.push(key);
      queue.push([r - 1, c]);
      queue.push([r + 1, c]);
      queue.push([r, c - 1]);
      queue.push([r, c + 1]);
      queue.push([r - 1, c - 1]);
      queue.push([r - 1, c + 1]);
      queue.push([r + 1, c - 1]);
      queue.push([r + 1, c + 1]);
    }

    return found;
  }
}
