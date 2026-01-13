import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { PlayerState } from '../../../shared/types/game.types';
import { AuthenticationService } from './authentication.service';
import { DatabaseService } from '../../../shared/services/database.service';
import { ContentService } from '../../../shared/services/content.service';
import { ObservabilityService } from '../../../shared/services/observability.service';

const CURRENT_STATE_VERSION = 1;
const SAVE_DEBOUNCE_TIME = 1500; // ms

const NEW_PLAYER_STATE: PlayerState = {
  version: CURRENT_STATE_VERSION,
  coins: 25,
  xp: 0,
  level: 1,
  storage: {
    max: 25,
  },
  inventory: {},
  expansionsPurchased: 0,
  milestones: {
    hasPlantedFirstCrop: false,
    hasHarvestedFirstCrop: false,
    tutorialCompleted: false,
    tutorialStep: 0,
  },
};

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private authService = inject(AuthenticationService);
  private dbService = inject(DatabaseService);
  private contentService = inject(ContentService);
  private observabilityService = inject(ObservabilityService);

  state = signal<PlayerState | null>(null);
  loading = signal<boolean>(true);
  saveStatus = signal<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  conflictDetected = signal(false);

  private saveTimeout: any = null;
  private savePromise: Promise<void> | null = null;
  private lastLoadedTimestamp: any = null;
  
  currentStorage = computed(() => {
    const currentInventory = this.state()?.inventory;
    if (!currentInventory) return 0;
    // FIX: Add explicit types to the reduce function's parameters to avoid them being inferred as 'unknown'.
    return Object.values(currentInventory).reduce((acc: number, quantity: number) => acc + quantity, 0);
  });

  constructor() {
    // This effect reacts to user login/logout
    effect(() => {
        const userId = this.authService.userId();
        if (userId) {
            // User is logged in, load their data
            this.loadPlayerData(userId);
        } else {
            // User is logged out, clear the state
            this.state.set(null);
            this.loading.set(false);
            this.lastLoadedTimestamp = null;
            this.conflictDetected.set(false);
        }
    }, { allowSignalWrites: true });

    // Debounced auto-save effect
    effect(() => {
        const currentUserId = this.authService.userId();
        const currentState = this.state();
        if (currentState && currentUserId && !this.conflictDetected()) {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            this.saveTimeout = setTimeout(() => {
                this.saveStateDebounced(currentState, currentUserId);
            }, SAVE_DEBOUNCE_TIME);
        }
    });
  }

  async initialize(): Promise<void> {
    await this.loadInitialContent();
  }
  
  private async saveStateDebounced(state: PlayerState, userId: string) {
    if (this.savePromise) {
      // Save already in progress, skipping debounced save.
      return;
    }
    
    this.saveStatus.set('saving');
    this.savePromise = this.dbService.saveGameData(userId, { playerState: state }, this.lastLoadedTimestamp);
    try {
        await this.savePromise;
        this.saveStatus.set('saved');
        setTimeout(() => {
            if (this.saveStatus() === 'saved') this.saveStatus.set('idle');
        }, 2000);
    } catch(e: any) {
        if (e.message === 'STATE_CONFLICT') {
            console.error("State conflict detected. Another session has saved newer data.");
            this.conflictDetected.set(true);
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
        } else {
            console.error("Auto-save failed:", e);
            this.observabilityService.logError(e, 'GameStateService.saveStateDebounced');
            this.saveStatus.set('failed');
            setTimeout(() => {
                if (this.saveStatus() === 'failed') this.saveStatus.set('idle');
            }, 3000);
        }
    } finally {
        this.savePromise = null;
    }
  }

  /**
   * Saves the current game state to Firestore immediately.
   * Useful for critical actions where data loss must be prevented.
   */
  public async saveStateImmediately(): Promise<void> {
    if (this.conflictDetected()) return;

    const currentUserId = this.authService.userId();
    const currentState = this.state();

    if (currentState && currentUserId) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }

      await this.savePromise;
      
      this.saveStatus.set('saving');
      this.savePromise = this.dbService.saveGameData(currentUserId, { playerState: currentState }, this.lastLoadedTimestamp);
      try {
        await this.savePromise;
        this.saveStatus.set('saved');
        setTimeout(() => {
            if (this.saveStatus() === 'saved') this.saveStatus.set('idle');
        }, 2000);
      } catch(e: any) {
         if (e.message === 'STATE_CONFLICT') {
            console.error("State conflict detected during immediate save. Another session has saved newer data.");
            this.conflictDetected.set(true);
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
        } else {
            console.error("Immediate save failed:", e);
            this.observabilityService.logError(e, 'GameStateService.saveStateImmediately');
            this.saveStatus.set('failed');
            setTimeout(() => {
                if (this.saveStatus() === 'failed') this.saveStatus.set('idle');
            }, 3000);
        }
      } finally {
        this.savePromise = null;
      }
    }
  }

  private async loadInitialContent() {
    try {
        await this.contentService.loadContent();
    } catch (error) {
        console.error("CRITICAL: Failed to load game content.", error);
        this.observabilityService.logError(error, 'GameStateService.loadInitialContent');
    }
  }

  private async loadPlayerData(userId: string) {
    this.loading.set(true);
    try {
      const savedData = await this.dbService.loadGameData(userId);
      if (savedData && savedData.playerState) {
          this.lastLoadedTimestamp = savedData.updatedAt ?? null;
          const migratedState = this.migrateState(savedData.playerState);
          this.state.set(migratedState);
      } else {
          // This is a new player, create a default state
          console.log("Creating new player state for user:", userId);
          this.state.set(NEW_PLAYER_STATE);
          await this.saveStateImmediately();
          this.lastLoadedTimestamp = null; // No timestamp for brand new state
      }
    } catch (error) {
        console.error("Failed to load player data, using default state:", error);
        this.observabilityService.logError(error, 'GameStateService.loadPlayerData');
        this.state.set(NEW_PLAYER_STATE);
        this.lastLoadedTimestamp = null;
    } finally {
        this.loading.set(false);
    }
  }

  private migrateState(playerState: PlayerState): PlayerState {
      let migratedState = { ...playerState };

      if (!migratedState.version || migratedState.version < CURRENT_STATE_VERSION) {
          console.log(`Migrating player state from version ${migratedState.version || 0} to ${CURRENT_STATE_VERSION}`);
          migratedState.version = CURRENT_STATE_VERSION;
      }
      
      // Migration to add milestones object
      if (!migratedState.milestones) {
        migratedState.milestones = {
            hasPlantedFirstCrop: false,
            hasHarvestedFirstCrop: false,
            tutorialCompleted: false,
            tutorialStep: 0,
        };
      }
      
      if (typeof migratedState.milestones.tutorialCompleted === 'undefined') {
        migratedState.milestones.tutorialCompleted = false;
      }
      if (typeof migratedState.milestones.tutorialStep === 'undefined') {
        migratedState.milestones.tutorialStep = 0;
      }

      return migratedState;
  }

  addToInventory(itemId: string, quantity: number): boolean {
    const currentState = this.state();
    if (!currentState) return false;
    
    const maxStorage = currentState.storage.max;
    if (this.currentStorage() + quantity > maxStorage) {
        console.warn('Not enough storage space.');
        return false;
    }

    this.state.update(s => {
        if (!s) return null;
        const newInventory = { ...s.inventory };
        newInventory[itemId] = (newInventory[itemId] || 0) + quantity;
        return { ...s, inventory: newInventory };
    });
    return true;
  }

  async consumeFromInventory(items: { [itemId: string]: number }): Promise<boolean> {
    const currentState = this.state();
    if (!currentState) return false;

    const currentInventory = currentState.inventory;

    // 1. Check if all items are available
    for (const [itemId, requiredQuantity] of Object.entries(items)) {
        if ((currentInventory[itemId] || 0) < requiredQuantity) {
            console.warn(`Not enough ${itemId} in inventory.`);
            return false;
        }
    }

    // 2. Consume items
    this.state.update(s => {
        if (!s) return null;
        const newInventory = { ...s.inventory };
        for (const [itemId, requiredQuantity] of Object.entries(items)) {
            const newQuantity = newInventory[itemId] - requiredQuantity;
            if (newQuantity > 0) {
                newInventory[itemId] = newQuantity;
            } else {
                delete newInventory[itemId];
            }
        }
        return { ...s, inventory: newInventory };
    });

    // This is a critical action, save immediately.
    await this.saveStateImmediately();
    return true;
  }

  async sellFromInventory(itemId: string, quantity: number, price: number): Promise<void> {
    this.state.update(s => {
        if (!s) return null;
        const currentQuantity = s.inventory[itemId] || 0;
        
        if(currentQuantity < quantity) {
            console.error('Not enough items to sell.');
            return s;
        }

        const newInventory = { ...s.inventory };
        const newQuantity = currentQuantity - quantity;
        if (newQuantity > 0) {
            newInventory[itemId] = newQuantity;
        } else {
            delete newInventory[itemId];
        }

        const earnings = quantity * price;

        return {
            ...s,
            inventory: newInventory,
            coins: s.coins + earnings,
            xp: s.xp + earnings,
        };
    });
    
    // This is a critical action, save immediately.
    await this.saveStateImmediately();
  }
}