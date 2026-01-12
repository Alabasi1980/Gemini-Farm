import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../player/services/game-state.service';
import { ItemService } from '../../../../shared/services/item.service';
import { MarketService } from '../../../market/services/market.service';

interface DisplayItem {
    id: string;
    name: string;
    sellPrice: number;
    baseSellPrice: number;
    asset: string;
    quantity: number;
    priceTrend: 'up' | 'down' | 'neutral';
}


@Component({
  selector: 'inventory-page',
  templateUrl: './inventory-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPageComponent {
  gameStateService = inject(GameStateService);
  itemService = inject(ItemService);
  marketService = inject(MarketService);

  playerState = this.gameStateService.state;
  currentStorage = this.gameStateService.currentStorage;

  inventoryItems = computed<DisplayItem[]>(() => {
    const state = this.playerState();
    if (!state) return [];
    
    const inventory = state.inventory;
    this.marketService.priceModifiers(); // Depend on this signal to recompute on market update
    
    const items: DisplayItem[] = [];
    for (const [itemId, quantity] of Object.entries(inventory)) {
      const itemData = this.itemService.getItem(itemId);
      if (itemData) {
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
      }
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  });

  sellItem(itemId: string, quantity: number) {
    const item = this.inventoryItems().find(i => i.id === itemId);
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