import { Injectable, signal } from '@angular/core';
import type { Firestore } from 'firebase/firestore';
import { PatternMatrix } from '../models/pattern-matrix.model';

const firebaseConfig = {
  apiKey: 'AIzaSyBBERpRKu7Wl5-xaG8huWmJFB1FtI94HIk',
  authDomain: 'bordados-aime.firebaseapp.com',
  projectId: 'bordados-aime',
  storageBucket: 'bordados-aime.firebasestorage.app',
  messagingSenderId: '442615597637',
  appId: '1:442615597637:web:2c337694d1946fc929712c',
};

@Injectable({ providedIn: 'root' })
export class CloudPatternRepository {
  private db: Firestore | null = null;

  // Current active pattern signal
  activePattern = signal<PatternMatrix | null>(null);

  /**
   * Loads a specific pattern by ID (e.g., the title or a UUID)
   */
  async loadPattern(id: string) {
    const db = await this.getDb();
    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'patterns', id);
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
    const db = await this.getDb();
    const { doc, setDoc } = await import('firebase/firestore');
    const cloudSafeData = this.toCloudDocument(matrix);
    const docRef = doc(db, 'patterns', id);
    return setDoc(docRef, { ...cloudSafeData, _lastSaved: Date.now() }, { merge: true });
  }

  async saveProgressOnly(id: string, progress: Record<string, number>) {
    const db = await this.getDb();
    const { doc, setDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'patterns', id);
    return setDoc(docRef, { progress, _lastSaved: Date.now() }, { merge: true });
  }

  async updateUserSettings(settings: {
    pixelSize: number;
    storageMode: 'cloud' | 'local';
    activeStyle: number;
    hiddenSymbols: string[];
  }) {
    const db = await this.getDb();
    const { doc, setDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'app_settings', 'default');
    return setDoc(docRef, {
      ...settings,
      _updatedAt: Date.now(),
    }, { merge: true });
  }

  async deletePattern(id: string) {
    const db = await this.getDb();
    const { doc, deleteDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'patterns', id);
    return deleteDoc(docRef);
  }

  /**
   * List all patterns available for Aime
   */
  async getAvailablePatterns(): Promise<PatternMatrix[]> {
    try {
      const db = await this.getDb();
      const { collection, getDocs } = await import('firebase/firestore');
      const colRef = collection(db, 'patterns');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => this.toPatternMatrix(d.data()));
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
      return [];
    }
  }

  watchAvailablePatterns(callback: (patterns: PatternMatrix[]) => void): () => void {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      try {
        const db = await this.getDb();
        if (!active) return;

        const { collection, onSnapshot, orderBy, query } = await import('firebase/firestore');
        const colRef = collection(db, 'patterns');
        const sortedQuery = query(colRef, orderBy('_lastSaved', 'desc'));

        unsubscribe = onSnapshot(
          sortedQuery,
          (snapshot) => {
            const patterns = snapshot.docs.map((document) => this.toPatternMatrix(document.data()));
            callback(patterns);
          },
          (error) => {
            console.error('Firestore Listen Error:', error);
          },
        );
      } catch (error) {
        console.error('Firestore listener init failed:', error);
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
      unsubscribe = null;
    };
  }

  private async getDb(): Promise<Firestore> {
    if (this.db) return this.db;

    const appModule = await import('firebase/app');
    const firestoreModule = await import('firebase/firestore');

    const app = appModule.getApps().length > 0
      ? appModule.getApp()
      : appModule.initializeApp(firebaseConfig);

    this.db = firestoreModule.getFirestore(app);
    return this.db;
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
    const source = raw as PatternMatrix;
    const configurations = source.configurations ?? undefined;
    const activeConfiguration = source.activeConfiguration ?? undefined;
    const rows = Number(data.m?.r ?? 0);
    const cols = Number(data.m?.c ?? 0);

    if (Array.isArray(data.g) && data.g.length > 0 && Array.isArray(data.g[0])) {
      return {
        ...(data as PatternMatrix),
        configurations,
        activeConfiguration,
      };
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
        configurations,
        activeConfiguration,
      };
    }

    return {
      ...data,
      g: [],
      configurations,
      activeConfiguration,
    };
  }
}
