import { Injectable } from '@angular/core';
import { PatternMatrix } from '../models/pattern-matrix.model';

export interface Snapshot {
  id: string;
  label: string;
  createdAt: number;
  pattern: PatternMatrix;
}

const PREFIX = 'snapshot_';
const MAX_SNAPSHOTS = 10;

@Injectable({ providedIn: 'root' })
export class SnapshotService {
  save(pattern: PatternMatrix, label: string): string {
    const id = `${Date.now()}`;
    const snapshot: Snapshot = {
      id,
      label,
      createdAt: Date.now(),
      pattern,
    };

    const key = PREFIX + pattern.m.t + '_' + id;
    localStorage.setItem(key, JSON.stringify(snapshot));
    this.pruneOldSnapshots(pattern.m.t);
    return id;
  }

  list(projectTitle: string): Snapshot[] {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX + projectTitle + '_'))
      .map((key) => {
        try {
          const raw = localStorage.getItem(key);
          return raw ? (JSON.parse(raw) as Snapshot) : null;
        } catch {
          return null;
        }
      })
      .filter((snapshot): snapshot is Snapshot => snapshot !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  restore(snapshot: Snapshot): PatternMatrix {
    return snapshot.pattern;
  }

  delete(projectTitle: string, snapshotId: string): void {
    localStorage.removeItem(PREFIX + projectTitle + '_' + snapshotId);
  }

  private pruneOldSnapshots(projectTitle: string): void {
    const all = this.list(projectTitle);
    if (all.length > MAX_SNAPSHOTS) {
      all.slice(MAX_SNAPSHOTS).forEach((snapshot) => this.delete(projectTitle, snapshot.id));
    }
  }
}
