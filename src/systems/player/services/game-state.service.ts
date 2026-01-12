import { Injectable, signal, computed } from '@angular/core';
import { PlayerState } from '../../../shared/types/game.types';

const INITIAL_STATE: PlayerState = {
  coins: 1000,
  xp: 150,
  level: 5,
  storage: {
    max: 50,
  },
  inventory: new Map<string, number>(),
  expansionsPurchased: 0,
};

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  state = signal<PlayerState>(INITIAL_STATE);

  currentStorage = computed(() => {
    let count = 0;
    for (const quantity of this.state().inventory.values()) {
        // FIX: Corrected type inference. 'quantity' is a number from the Map's values.
        count += quantity;
    }
    return count;
  });

  addToInventory(itemId: string, quantity: number): boolean {
    const maxStorage = this.state().storage.max;
    if (this.currentStorage() + quantity > maxStorage) {
        console.warn('Not enough storage space.');
        return false;
    }

    this.state.update(s => {
        const newInventory = new Map(s.inventory);
        const currentQuantity = newInventory.get(itemId) || 0;
        newInventory.set(itemId, currentQuantity + quantity);
        return { ...s, inventory: newInventory };
    });
    return true;
  }

  consumeFromInventory(items: Map<string, number>): boolean {
    const currentInventory = this.state().inventory;

    // 1. Check if all items are available in sufficient quantities
    for (const [itemId, requiredQuantity] of items.entries()) {
        if ((currentInventory.get(itemId) || 0) < requiredQuantity) {
            console.warn(`Not enough ${itemId} in inventory.`);
            return false;
        }
    }

    // 2. Consume items
    this.state.update(s => {
        const newInventory = new Map(s.inventory);
        for (const [itemId, requiredQuantity] of items.entries()) {
            // FIX: Corrected type inference. 'currentQuantity' is a number because of the preceding check and non-null assertion.
            const currentQuantity = newInventory.get(itemId)!;
            const newQuantity = currentQuantity - requiredQuantity;
            if (newQuantity > 0) {
                newInventory.set(itemId, newQuantity);
            } else {
                newInventory.delete(itemId);
            }
        }
        return { ...s, inventory: newInventory };
    });

    return true;
  }

  sellFromInventory(itemId: string, quantity: number, price: number) {
    this.state.update(s => {
        const newInventory = new Map(s.inventory);
        // FIX: Corrected type inference. 'currentQuantity' is a number because of the fallback to 0.
        const currentQuantity = newInventory.get(itemId) || 0;
        
        if(currentQuantity < quantity) {
            console.error('Not enough items to sell.');
            return s;
        }

        const newQuantity = currentQuantity - quantity;
        if (newQuantity > 0) {
            newInventory.set(itemId, newQuantity);
        } else {
            newInventory.delete(itemId);
        }

        const earnings = quantity * price;

        return {
            ...s,
            inventory: newInventory,
            coins: s.coins + earnings,
            xp: s.xp + earnings, // Simple XP gain for now
        };
    });
  }
}