import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore, DocumentData, collection, getDocs, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { firebaseConfig } from '../../environments/firebase.config';
import { GameDataDocument, PlayerState } from '../types/game.types';

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

  async saveGameData(userId: string, data: GameDataDocument): Promise<void> {
    try {
      const playerDocRef = doc(this.db, 'players', userId);
      await setDoc(playerDocRef, data, { merge: true });
    } catch (error) {
      console.error("Error saving game data to Firestore:", error);
      throw error;
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

  async getCollection<T>(collectionName: string): Promise<T[]> {
    try {
      const contentVersionDoc = 'live';
      const colRef = collection(this.db, 'content', contentVersionDoc, collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error fetching collection "${collectionName}":`, error);
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
}
