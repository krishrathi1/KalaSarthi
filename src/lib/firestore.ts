// Firestore database connection and utilities
// Enhanced with better query optimization
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  QueryConstraint,
  WhereFilterOp,
  addDoc,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  FieldValue
} from 'firebase/firestore';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  CARTS: 'carts',
  ORDERS: 'orders',
  WISHLISTS: 'wishlists',
  LOAN_APPLICATIONS: 'loan_applications',
  SALES_EVENTS: 'sales_events',
  SALES_AGGREGATES: 'sales_aggregates',
  PRODUCT_PERFORMANCE: 'product_performance',
  EXPENSES: 'expenses',
} as const;

// Helper to convert Firestore timestamp to Date
export function timestampToDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) {
    if (isNaN(timestamp.getTime())) return new Date();
    return timestamp;
  }
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch {
      return new Date();
    }
  }
  if (timestamp?.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp?._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000);
  }
  // Try to parse as string or number
  try {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    console.warn('Could not convert timestamp:', timestamp);
  }
  return new Date();
}

// Helper to convert Date to Firestore timestamp
export function dateToTimestamp(date: Date | string | null | undefined): Timestamp {
  if (!date) return Timestamp.now();
  if (date instanceof Date) return Timestamp.fromDate(date);
  return Timestamp.fromDate(new Date(date));
}

// Generic CRUD operations
export class FirestoreService {
  // Create document with auto-generated ID
  static async create<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  // Create document with custom ID
  static async set<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T,
    merge: boolean = false
  ): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge });
  }

  // Get document by ID (alias for getById)
  static async get<T>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    return this.getById<T>(collectionName, docId);
  }

  // Get document by ID
  static async getById<T>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    // Convert Firestore timestamps to Date objects
    const convertedData = this.convertTimestamps(data);

    return {
      id: docSnap.id,
      ...convertedData,
    } as T;
  }

  // Helper to convert Firestore timestamps in an object
  private static convertTimestamps(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertTimestamps(item));
    }

    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if it's a Firestore Timestamp
      if (value && typeof value === 'object' &&
        ('toDate' in value || 'seconds' in value || '_seconds' in value)) {
        converted[key] = timestampToDate(value);
      } else if (value && typeof value === 'object') {
        // Recursively convert nested objects
        converted[key] = this.convertTimestamps(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }

  // Update document
  static async update<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  // Delete document
  static async delete(
    collectionName: string,
    docId: string
  ): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  }

  // Query documents
  static async query<T>(
    collectionName: string,
    constraints: QueryConstraint[]
  ): Promise<T[]> {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const convertedData = this.convertTimestamps(data);
      return {
        id: doc.id,
        ...convertedData,
      };
    }) as T[];
  }

  // Get all documents
  static async getAll<T>(collectionName: string): Promise<T[]> {
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const convertedData = this.convertTimestamps(data);
      return {
        id: doc.id,
        ...convertedData,
      };
    }) as T[];
  }

  // Count documents
  static async count(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<number> {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }

  // Batch operations
  static async batchWrite(
    operations: Array<{
      type: 'set' | 'update' | 'delete';
      collection: string;
      docId: string;
      data?: any;
    }>
  ): Promise<void> {
    const batch = writeBatch(db);

    for (const op of operations) {
      const docRef = doc(db, op.collection, op.docId);

      switch (op.type) {
        case 'set':
          batch.set(docRef, {
            ...op.data,
            updatedAt: serverTimestamp(),
          });
          break;
        case 'update':
          batch.update(docRef, {
            ...op.data,
            updatedAt: serverTimestamp(),
          });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    }

    await batch.commit();
  }
}

// Export Firestore utilities
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  type FieldValue,
  type QueryConstraint,
  type WhereFilterOp,
};
