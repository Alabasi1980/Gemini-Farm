import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { ItemService } from '../../services/item.service';
<<<<<<< HEAD
import { MarketService } from '../../services/market.service';

interface DisplayItem {
    id: string;
    name: string;
    sellPrice: number;
    baseSellPrice: number;
    asset: string;
    quantity: number;
    priceTrend: 'up' | 'down' | 'neutral';
}

=======
import { DisplayItem } from '../../types/game.types';
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396

@Component({
  selector: 'inventory-page',
  templateUrl: './inventory-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPageComponent {
  gameStateService = inject(GameStateService);
  itemService = inject(ItemService);
<<<<<<< HEAD
  marketService = inject(MarketService);
=======
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396

  playerState = this.gameStateService.state;
  currentStorage = this.gameStateService.currentStorage;

  inventoryItems = computed<DisplayItem[]>(() => {
    const inventory = this.playerState().inventory;
<<<<<<< HEAD
    this.marketService.priceModifiers(); // Depend on this signal to recompute on market update
    
=======
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
    const items: DisplayItem[] = [];
    for (const [itemId, quantity] of inventory.entries()) {
      const itemData = this.itemService.getItem(itemId);
      if (itemData) {
<<<<<<< HEAD
        const basePrice = itemData.sellPrice;
        const modifier = this.marketService.getPriceModifier(itemId);
        const currentPrice = Math.round(basePrice * modifier);
        
        let priceTrend: 'up' | 'down' | 'neutral' = 'neutral';
        if (modifier > 1.05) priceTrend = 'up';
        if (modifier < 0.95) priceTrend = 'down';

        items.push({
            ...itemData,
            quantity,
            sellPrice: currentPrice,
            baseSellPrice: basePrice,
            priceTrend,
        });
=======
        items.push({ ...itemData, quantity });
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
      }
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  });

  sellItem(itemId: string, quantity: number) {
<<<<<<< HEAD
    const item = this.inventoryItems().find(i => i.id === itemId);
=======
    const item = this.itemService.getItem(itemId);
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
    if (!item) return;
    this.gameStateService.sellFromInventory(itemId, quantity, item.sellPrice);
  }

  sellAll(itemId: string) {
      const item = this.inventoryItems().find(i => i.id === itemId);
      if (item) {
          this.sellItem(itemId, item.quantity);
      }
  }
}
