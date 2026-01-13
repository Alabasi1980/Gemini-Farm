import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore, DocumentData, collection, getDocs, updateDoc, serverTimestamp, addDoc, deleteDoc, query, orderBy, limit, runTransaction } from 'firebase/firestore';
import { firebaseConfig } from '../../environments/firebase.config';
import { AdminAuditLog, AnalyticsEvent, ClientErrorLog, GameDataDocument, PlayerState } from '../types/game.types';

export interface UserProfile {
    email?: string;
    role: 'player' | 'admin';
    createdAt?: any;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private app: FirebaseApp;
  private db: Firestore;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
  }

  getApp(): FirebaseApp {
    return this.app;
  }

  // --- Game Data ---

  async saveGameData(userId: string, data: Partial<GameDataDocument>, lastKnownTimestamp: any): Promise<void> {
    try {
      await runTransaction(this.db, async (transaction) => {
        const playerDocRef = doc(this.db, 'players', userId);
        const playerDoc = await transaction.get(playerDocRef);

        if (playerDoc.exists()) {
            const serverTimestamp = playerDoc.data().updatedAt;
            // Only perform check if we have a timestamp from both client and server
            if (lastKnownTimestamp && serverTimestamp && serverTimestamp.toMillis() > lastKnownTimestamp.toMillis()) {
                // The document on the server is newer than the one we loaded.
                // This indicates a conflict from another session.
                throw new Error('STATE_CONFLICT');
            }
        }

        const dataToSave = {
            ...data,
            updatedAt: serverTimestamp() // Use serverTimestamp within the transaction
        };
        transaction.set(playerDocRef, dataToSave, { merge: true });
      });
    } catch (error: any) {
      // Re-throw the specific conflict error or a generic one
      if (error.message === 'STATE_CONFLICT') {
        throw error;
      }
      console.error("Error saving game data to Firestore:", error);
      throw new Error("Failed to save game data.");
    }
  }

  async loadGameData(userId: string): Promise<GameDataDocument | null> {
    try {
      const playerDocRef = doc(this.db, 'players', userId);
      const docSnap = await getDoc(playerDocRef);

      if (docSnap.exists()) {
        return docSnap.data() as GameDataDocument;
      } else {
        console.log("No saved data found for user:", userId);
        return null;
      }
    } catch (error) {
      console.error("Error loading game data from Firestore:", error);
      throw error;
    }
  }

  // --- Game Content (Read & Write) ---

  async getCollection<T>(collectionPath: string): Promise<T[]> {
    try {
      const colRef = collection(this.db, collectionPath);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error fetching collection "${collectionPath}":`, error);
      throw error;
    }
  }

  async setDocumentInCollection(collectionPath: string, docId: string, data: object): Promise<void> {
    try {
      const docRef = doc(this.db, collectionPath, docId);
      await setDoc(docRef, data);
    } catch (error) {
      console.error(`Error setting document in ${collectionPath}:`, error);
      throw error;
    }
  }

  async addDocumentToCollection(collectionPath: string, data: object): Promise<string> {
    try {
      const colRef = collection(this.db, collectionPath);
      const docRef = await addDoc(colRef, data);
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      throw error;
    }
  }

  async deleteDocumentFromCollection(collectionPath: string, docId: string): Promise<void> {
    try {
        const docRef = doc(this.db, collectionPath, docId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting document ${docId} from ${collectionPath}:`, error);
        throw error;
    }
  }


  // --- User Profiles & Roles ---

  async getUserProfile(userId: string): Promise<DocumentData | null> {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      const docSnap = await getDoc(userDocRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }

  async createUserProfile(userId: string, data: UserProfile): Promise<void> {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      await setDoc(userDocRef, { ...data, createdAt: serverTimestamp() });
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  }

  // --- Admin Functionality ---
  
  async getAllUsers(): Promise<DocumentData[]> {
    try {
      const usersColRef = collection(this.db, 'users');
      const snapshot = await getDocs(usersColRef);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  }

  async getAllPlayers(): Promise<DocumentData[]> {
    try {
      const playersColRef = collection(this.db, 'players');
      const snapshot = await getDocs(playersColRef);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching all players:", error);
      throw error;
    }
  }

  async updatePlayerState(userId: string, updates: Partial<PlayerState>): Promise<void> {
    try {
        const playerDocRef = doc(this.db, 'players', userId);
        const playerDoc = await getDoc(playerDocRef);

        if (!playerDoc.exists()) {
            throw new Error(`Player document with ID ${userId} does not exist.`);
        }

        const updatePayload: { [key: string]: any } = {};
        for (const [key, value] of Object.entries(updates)) {
            updatePayload[`playerState.${key}`] = value;
        }

        await updateDoc(playerDocRef, updatePayload);
    } catch (error) {
        console.error(`Error updating player state for ${userId}:`, error);
        throw error;
    }
  }

  async logAdminAction(logData: object): Promise<void> {
    try {
      const auditColRef = collection(this.db, 'admin_audit_logs');
      await addDoc(auditColRef, {
        ...logData,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error writing to admin audit log:", error);
      throw error;
    }
  }

  async getAdminAuditLogs(): Promise<AdminAuditLog[]> {
    try {
      const auditColRef = collection(this.db, 'admin_audit_logs');
      const q = query(auditColRef, orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as AdminAuditLog);
    } catch (error) {
      console.error("Error fetching admin audit logs:", error);
      throw error;
    }
  }

  // --- Observability ---
  async logClientError(logData: object): Promise<void> {
    try {
        const errorsColRef = collection(this.db, 'client_errors');
        await addDoc(errorsColRef, {
            ...logData,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error writing to client error log:", error);
    }
  }

  async getClientErrors(): Promise<ClientErrorLog[]> {
    try {
        const errorsColRef = collection(this.db, 'client_errors');
        const q = query(errorsColRef, orderBy('timestamp', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as ClientErrorLog);
    } catch (error) {
        console.error("Error fetching client error logs:", error);
        throw error;
    }
  }
  
  async logAnalyticsEvent(eventData: object): Promise<void> {
    try {
        const eventsColRef = collection(this.db, 'analytics_events');
        await addDoc(eventsColRef, {
            ...eventData,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error writing to analytics event log:", error);
    }
  }

  async getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
    try {
        const eventsColRef = collection(this.db, 'analytics_events');
        const q = query(eventsColRef, orderBy('timestamp', 'desc'), limit(200));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as AnalyticsEvent);
    } catch (error) {
        console.error("Error fetching analytics events:", error);
        throw error;
    }
  }
}