import { Injectable, signal } from '@angular/core';
import { DmcThread } from './dmc-api.service';

const STASH_KEY = 'aime_thread_stash_v1';

@Injectable({ providedIn: 'root' })
export class ThreadStashService {
  readonly threads = signal<DmcThread[]>(this.load());

  add(threads: DmcThread[]): void {
    const current = this.threads();
    const existingIds = new Set(current.map((thread) => thread.id));
    const newOnes = threads.filter((thread) => !existingIds.has(thread.id));
    const next = [...current, ...newOnes];
    this.threads.set(next);
    this.persist(next);
  }

  remove(id: string): void {
    const next = this.threads().filter((thread) => thread.id !== id);
    this.threads.set(next);
    this.persist(next);
  }

  private load(): DmcThread[] {
    try {
      const raw = localStorage.getItem(STASH_KEY);
      return raw ? (JSON.parse(raw) as DmcThread[]) : [];
    } catch {
      return [];
    }
  }

  private persist(threads: DmcThread[]): void {
    localStorage.setItem(STASH_KEY, JSON.stringify(threads));
  }
}
