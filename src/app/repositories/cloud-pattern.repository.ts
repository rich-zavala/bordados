import { inject, Injectable, signal } from '@angular/core';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { PatternMatrix } from '../models/pattern-matrix.model';
import { FIREBASE_DB } from '../app.config';

@Injectable({ providedIn: 'root' })
export class CloudPatternRepository {
  private db = inject(FIREBASE_DB);

  // Current active pattern signal
  activePattern = signal<PatternMatrix | null>(null);

  /**
   * Loads a specific pattern by ID (e.g., the title or a UUID)
   */
  async loadPattern(id: string) {
    const docRef = doc(this.db, 'patterns', id);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = this.toPatternMatrix(snap.data());
      this.activePattern.set(data);
      return data;
    }

    return null;
  }

  /**
   * Syncs the current state to the cloud.
   * We call this inside your PatternManager's click handler.
   */
  async saveProgress(id: string, matrix: PatternMatrix) {
    const cloudSafeData = this.toCloudDocument(matrix);
    const docRef = doc(this.db, 'patterns', id);
    return setDoc(docRef, { ...cloudSafeData, _lastSaved: Date.now() }, { merge: true });
  }

  async deletePattern(id: string) {
    const docRef = doc(this.db, 'patterns', id);
    return deleteDoc(docRef);
  }

  /**
   * List all patterns available for Aime
   */
  async getAvailablePatterns(): Promise<PatternMatrix[]> {
    try {
      const colRef = collection(this.db, 'patterns');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => this.toPatternMatrix(d.data()));
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
      return [];
    }
  }

  watchAvailablePatterns(callback: (patterns: PatternMatrix[]) => void): () => void {
    const colRef = collection(this.db, 'patterns');
    const sortedQuery = query(colRef, orderBy('_lastSaved', 'desc'));

    return onSnapshot(
      sortedQuery,
      (snapshot) => {
        const patterns = snapshot.docs.map((document) => this.toPatternMatrix(document.data()));
        callback(patterns);
      },
      (error) => {
        console.error('Firestore Listen Error:', error);
      },
    );
  }

  private toCloudDocument(matrix: PatternMatrix): Omit<PatternMatrix, 'g'> & { g: string[] } {
    return {
      ...matrix,
      g: matrix.g.flat(),
    };
  }

  private toPatternMatrix(raw: unknown): PatternMatrix {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Invalid pattern document from Firestore.');
    }

    const data = raw as PatternMatrix & { g: unknown; m: { r: number; c: number; t: string } };
    const rows = Number(data.m?.r ?? 0);
    const cols = Number(data.m?.c ?? 0);

    if (Array.isArray(data.g) && data.g.length > 0 && Array.isArray(data.g[0])) {
      return data as PatternMatrix;
    }

    if (Array.isArray(data.g)) {
      const flatGrid = data.g.map((cell) => String(cell));
      const grid2D: string[][] = [];

      if (rows > 0 && cols > 0) {
        for (let index = 0; index < rows; index++) {
          grid2D.push(flatGrid.slice(index * cols, (index + 1) * cols));
        }
      }

      return {
        ...data,
        g: grid2D,
      };
    }

    return {
      ...data,
      g: [],
    };
  }
}
