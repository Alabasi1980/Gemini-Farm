import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { PlayerState } from '../../../shared/types/game.types';
import { AuthenticationService } from './authentication.service';
import { DatabaseService } from '../../../shared/services/database.service';
import { ContentService } from '../../../shared/services/content.service';

const CURRENT_STATE_VERSION = 1;
const SAVE_DEBOUNCE_TIME = 2500; // ms

const NEW_PLAYER_STATE: PlayerState = {
  version: CURRENT_STATE_VERSION,
  coins: 1000,
  xp: 150,
  level: 5,
  storage: {
    max: 50,
  },
  inventory: {},
  expansionsPurchased: 0,
  milestones: {
    hasPlantedFirstCrop: false,
    hasHarvestedFirstCrop: false,
  },
};

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private authService = inject(AuthenticationService);
  private dbService = inject(DatabaseService);
  private contentService = inject(ContentService);

  state = signal<PlayerState | null>(null);
  loading = signal<boolean>(true);
  private saveTimeout: any = null;
  
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
        }
    }, { allowSignalWrites: true });

    // Debounced auto-save effect
    effect(() => {
        const currentUserId = this.authService.userId();
        const currentState = this.state();
        // Only save if we have a valid state and user
        if (currentState && currentUserId) {
            // Clear any existing timeout to reset the debounce timer
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            // Set a new timeout to save the data
            this.saveTimeout = setTimeout(() => {
                console.log('Auto-saving player state...');
                this.dbService.saveGameData(currentUserId, { playerState: currentState });
            }, SAVE_DEBOUNCE_TIME);
        }
    });
  }

  async initialize(): Promise<void> {
    await this.loadInitialContent();
  }

  /**
   * Saves the current game state to Firestore immediately.
   * Useful for critical actions where data loss must be prevented.
   */
  public saveStateImmediately(): void {
    const currentUserId = this.authService.userId();
    const currentState = this.state();

    if (currentState && currentUserId) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      console.log('Performing immediate save for critical action...');
      this.dbService.saveGameData(currentUserId, { playerState: currentState });
    }
  }

  private async loadInitialContent() {
    try {
        await this.contentService.loadContent();
    } catch (error) {
        console.error("CRITICAL: Failed to load game content.", error);
        // Handle critical error, maybe show an error page
    }
  }

  private async loadPlayerData(userId: string) {
    this.loading.set(true);
    try {
      const savedData = await this.dbService.loadGameData(userId);
      if (savedData && savedData.playerState) {
          const migratedState = this.migrateState(savedData.playerState);
          this.state.set(migratedState);
      } else {
          // This is a new player, create a default state
          console.log("Creating new player state for user:", userId);
          this.state.set(NEW_PLAYER_STATE);
          this.saveStateImmediately();
      }
    } catch (error) {
        console.error("Failed to load player data, using default state:", error);
        this.state.set(NEW_PLAYER_STATE);
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
        };
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

  consumeFromInventory(items: { [itemId: string]: number }): boolean {
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
    this.saveStateImmediately();
    return true;
  }

  sellFromInventory(itemId: string, quantity: number, price: number) {
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
    this.saveStateImmediately();
  }
}