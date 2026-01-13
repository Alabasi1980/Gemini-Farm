import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { PlayerState } from '../../../shared/types/game.types';
import { AuthenticationService } from './authentication.service';
import { DatabaseService } from '../../../shared/services/database.service';
import { ContentService } from '../../../shared/services/content.service';

const NEW_PLAYER_STATE: PlayerState = {
  coins: 1000,
  xp: 150,
  level: 5,
  storage: {
    max: 50,
  },
  inventory: {},
  expansionsPurchased: 0,
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

    // Auto-save effect
    effect(() => {
        const currentUserId = this.authService.userId();
        const currentState = this.state();
        // Only save if we have a valid state and user
        if (currentState && currentUserId) {
            this.dbService.saveGameData(currentUserId, { playerState: currentState });
        }
    });
  }

  async initialize(): Promise<void> {
    await this.loadInitialContent();
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
          this.state.set(savedData.playerState);
      } else {
          // This is a new player, create a default state
          console.log("Creating new player state for user:", userId);
          this.state.set(NEW_PLAYER_STATE);
      }
    } catch (error) {
        console.error("Failed to load player data, using default state:", error);
        this.state.set(NEW_PLAYER_STATE);
    } finally {
        this.loading.set(false);
    }
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
  }
}
