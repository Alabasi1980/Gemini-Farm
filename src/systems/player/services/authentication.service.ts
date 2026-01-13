import { Injectable, signal, computed, inject } from '@angular/core';
import { DatabaseService } from '../../../shared/services/database.service';
// FIX: Use Firebase compat library to resolve import errors
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';


export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';
export type UserRole = 'admin' | 'player';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  private dbService = inject(DatabaseService);
  private auth: firebase.auth.Auth;

  authState = signal<AuthState>('loading');
  user = signal<firebase.User | null>(null);
  userRole = signal<UserRole | null>(null);

  userId = computed(() => this.user()?.uid ?? null);

  constructor() {
    // FIX: Use compat auth initialization
    this.auth = firebase.auth(this.dbService.getApp());

    // FIX: Use compat onAuthStateChanged
    this.auth.onAuthStateChanged(async (firebaseUser) => {
      this.user.set(firebaseUser);
      if (firebaseUser) {
        await this.loadUserProfile(firebaseUser.uid, firebaseUser.email!);
        this.authState.set('authenticated');
      } else {
        this.userRole.set(null);
        this.authState.set('unauthenticated');
      }
    });
  }

  private async loadUserProfile(uid: string, email: string): Promise<void> {
    try {
        let profile = await this.dbService.getUserProfile(uid);
        if (!profile) {
            // Profile doesn't exist, create it
            profile = { role: 'player' };
            await this.dbService.createUserProfile(uid, { email, role: 'player' });
        }
        this.userRole.set(profile.role as UserRole);
    } catch (error) {
        console.error("Error loading user profile:", error);
        // Default to 'player' role on error to prevent being locked out
        this.userRole.set('player');
    }
  }

  async register(email: string, password: string):Promise<void> {
    // FIX: Use compat createUserWithEmailAndPassword
    await this.auth.createUserWithEmailAndPassword(email, password);
  }

  async login(email: string, password: string): Promise<void> {
    // FIX: Use compat signInWithEmailAndPassword
    await this.auth.signInWithEmailAndPassword(email, password);
  }

  async logout(): Promise<void> {
    // FIX: Use compat signOut
    await this.auth.signOut();
  }
}
