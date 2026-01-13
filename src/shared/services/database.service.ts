import { Injectable } from '@angular/core';
// FIX: Use Firebase compat library to resolve import errors
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { firebaseConfig } from '../../environments/firebase.config';
import { AdminAuditLog, AnalyticsEvent, ClientErrorLog, GameDataDocument, MutationContext, PlayerState } from '../types/game.types';

export interface UserProfile {
    email?: string;
    role: 'player' | 'admin';
    createdAt?: any;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private app: firebase.app.App;
  private db: firebase.firestore.Firestore;

  constructor() {
    // FIX: Use compat initialization
    if (!firebase.apps.length) {
      this.app = firebase.initializeApp(firebaseConfig);
    } else {
      this.app = firebase.app();
    }
    this.db = this.app.firestore();
  }

  getApp(): firebase.app.App {
    return this.app;
  }

  // --- Game Data ---

  async saveGameData(userId: string, data: Partial<GameDataDocument>, lastKnownTimestamp: any, mutationContext?: MutationContext): Promise<void> {
    try {
      // FIX: Use compat runTransaction
      await this.db.runTransaction(async (transaction) => {
        const playerDocRef = this.db.collection('players').doc(userId);
        const playerDoc = await transaction.get(playerDocRef);

        if (playerDoc.exists) {
            const serverTimestampValue = playerDoc.data()!.updatedAt;
            // Only perform check if we have a timestamp from both client and server
            if (lastKnownTimestamp && serverTimestampValue && serverTimestampValue.toMillis() > lastKnownTimestamp.toMillis()) {
                // The document on the server is newer than the one we loaded.
                // This indicates a conflict from another session.
                throw new Error('STATE_CONFLICT');
            }
        }

        const dataToSave = {
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // Use compat serverTimestamp
            ...(mutationContext && { lastMutation: mutationContext })
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

  async atomicallyUpdateResources(
      userId: string, 
      resourceDeltas: { coins?: number; xp?: number; inventory?: { [itemId: string]: number } },
      mutationContext?: MutationContext
    ): Promise<void> {
    const playerDocRef = this.db.collection('players').doc(userId);
    const updatePayload: { [key: string]: any } = {};

    if (resourceDeltas.coins) {
        updatePayload['playerState.coins'] = firebase.firestore.FieldValue.increment(resourceDeltas.coins);
    }
    if (resourceDeltas.xp) {
        updatePayload['playerState.xp'] = firebase.firestore.FieldValue.increment(resourceDeltas.xp);
    }
    if (resourceDeltas.inventory) {
        for (const [itemId, delta] of Object.entries(resourceDeltas.inventory)) {
            // Firestore dot notation requires escaping dots in keys, but item IDs are safe.
            updatePayload[`playerState.inventory.${itemId}`] = firebase.firestore.FieldValue.increment(delta);
        }
    }

    // Always update the timestamp to keep the document fresh for optimistic locking on other saves.
    updatePayload['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
    
    if (mutationContext) {
        updatePayload['lastMutation'] = mutationContext;
    }
    
    // We also need to check for inventory items that might be depleted.
    // If a delta is negative and its value becomes <= 0, we need to remove it.
    // This requires a transaction for a read-modify-write operation.
    return this.db.runTransaction(async (transaction) => {
        const playerDoc = await transaction.get(playerDocRef);
        if (!playerDoc.exists) {
            console.error("Player document not found for atomic update.");
            return;
        }
        
        const currentInventory = playerDoc.data()?.playerState?.inventory || {};
        
        if (resourceDeltas.inventory) {
            for (const [itemId, delta] of Object.entries(resourceDeltas.inventory)) {
                const currentAmount = currentInventory[itemId] || 0;
                if (currentAmount + delta <= 0) {
                    // If the item count will be zero or less, delete the field.
                    delete currentInventory[itemId];
                    // Remove it from the main payload and add a delete operation.
                    delete updatePayload[`playerState.inventory.${itemId}`];
                    updatePayload[`playerState.inventory.${itemId}`] = firebase.firestore.FieldValue.delete();
                }
            }
        }

        transaction.update(playerDocRef, updatePayload);
    });
  }

  async loadGameData(userId: string): Promise<GameDataDocument | null> {
    try {
      // FIX: Use compat getDoc
      const playerDocRef = this.db.collection('players').doc(userId);
      const docSnap = await playerDocRef.get();

      if (docSnap.exists) {
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

  async getGameDataTimestamp(userId: string): Promise<any> {
    try {
      const playerDocRef = this.db.collection('players').doc(userId);
      const docSnap = await playerDocRef.get();
      return docSnap.exists ? docSnap.data()!.updatedAt : null;
    } catch (error) {
      console.error("Error getting game data timestamp:", error);
      throw error;
    }
  }

  onPlayerDocChanges(userId: string, callback: (data: GameDataDocument) => void): () => void {
    const playerDocRef = this.db.collection('players').doc(userId);
    const unsubscribe = playerDocRef.onSnapshot(
      (docSnap) => {
        // Ignore local changes that haven't been written to the backend yet.
        // This prevents the listener from firing for saves made by this same client.
        if (!docSnap.metadata.hasPendingWrites && docSnap.exists) {
          callback(docSnap.data() as GameDataDocument);
        }
      },
      (error) => {
        console.error("Error listening for player document changes:", error);
      }
    );
    return unsubscribe; // onSnapshot returns a function to unsubscribe
  }

  // --- Game Content (Read & Write) ---

  async getCollection<T>(collectionPath: string): Promise<T[]> {
    try {
      // FIX: Use compat getDocs
      const colRef = this.db.collection(collectionPath);
      const snapshot = await colRef.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error fetching collection "${collectionPath}":`, error);
      throw error;
    }
  }

  async setDocumentInCollection(collectionPath: string, docId: string, data: object): Promise<void> {
    try {
      // FIX: Use compat setDoc
      const docRef = this.db.collection(collectionPath).doc(docId);
      await docRef.set(data);
    } catch (error) {
      console.error(`Error setting document in ${collectionPath}:`, error);
      throw error;
    }
  }

  async addDocumentToCollection(collectionPath: string, data: object): Promise<string> {
    try {
      // FIX: Use compat addDoc
      const colRef = this.db.collection(collectionPath);
      const docRef = await colRef.add(data);
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      throw error;
    }
  }

  async deleteDocumentFromCollection(collectionPath: string, docId: string): Promise<void> {
    try {
        // FIX: Use compat deleteDoc
        const docRef = this.db.collection(collectionPath).doc(docId);
        await docRef.delete();
    } catch (error) {
        console.error(`Error deleting document ${docId} from ${collectionPath}:`, error);
        throw error;
    }
  }


  // --- User Profiles & Roles ---

  async getUserProfile(userId: string): Promise<firebase.firestore.DocumentData | null> {
    try {
      const userDocRef = this.db.collection('users').doc(userId);
      const docSnap = await userDocRef.get();
      return docSnap.exists ? docSnap.data()! : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }

  async createUserProfile(userId: string, data: UserProfile): Promise<void> {
    try {
      const userDocRef = this.db.collection('users').doc(userId);
      await userDocRef.set({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  }

  // --- Admin Functionality ---
  
  async getAllUsers(): Promise<firebase.firestore.DocumentData[]> {
    try {
      const usersColRef = this.db.collection('users');
      const snapshot = await usersColRef.get();
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  }

  async getAllPlayers(): Promise<firebase.firestore.DocumentData[]> {
    try {
      const playersColRef = this.db.collection('players');
      const snapshot = await playersColRef.get();
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching all players:", error);
      throw error;
    }
  }

  async updatePlayerState(userId: string, updates: Partial<PlayerState>): Promise<void> {
    try {
        const playerDocRef = this.db.collection('players').doc(userId);
        const playerDoc = await playerDocRef.get();

        if (!playerDoc.exists) {
            throw new Error(`Player document with ID ${userId} does not exist.`);
        }

        const updatePayload: { [key: string]: any } = {};
        for (const [key, value] of Object.entries(updates)) {
            updatePayload[`playerState.${key}`] = value;
        }

        await playerDocRef.update(updatePayload);
    } catch (error) {
        console.error(`Error updating player state for ${userId}:`, error);
        throw error;
    }
  }

  async logAdminAction(logData: object): Promise<void> {
    try {
      const auditColRef = this.db.collection('admin_audit_logs');
      await auditColRef.add({
        ...logData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Error writing to admin audit log:", error);
      throw error;
    }
  }

  async getAdminAuditLogs(): Promise<AdminAuditLog[]> {
    try {
      const auditColRef = this.db.collection('admin_audit_logs');
      const q = auditColRef.orderBy('timestamp', 'desc').limit(100);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as AdminAuditLog);
    } catch (error) {
      console.error("Error fetching admin audit logs:", error);
      throw error;
    }
  }

  // --- Observability ---
  async logClientError(logData: object): Promise<void> {
    try {
        const errorsColRef = this.db.collection('client_errors');
        await errorsColRef.add({
            ...logData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error writing to client error log:", error);
    }
  }

  async getClientErrors(): Promise<ClientErrorLog[]> {
    try {
        const errorsColRef = this.db.collection('client_errors');
        const q = errorsColRef.orderBy('timestamp', 'desc').limit(100);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => doc.data() as ClientErrorLog);
    } catch (error) {
        console.error("Error fetching client error logs:", error);
        throw error;
    }
  }
  
  async logAnalyticsEvent(eventData: object): Promise<void> {
    try {
        const eventsColRef = this.db.collection('analytics_events');
        await eventsColRef.add({
            ...eventData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error writing to analytics event log:", error);
    }
  }

  async getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
    try {
        const eventsColRef = this.db.collection('analytics_events');
        const q = eventsColRef.orderBy('timestamp', 'desc').limit(200);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => doc.data() as AnalyticsEvent);
    } catch (error) {
        console.error("Error fetching analytics events:", error);
        throw error;
    }
  }
}