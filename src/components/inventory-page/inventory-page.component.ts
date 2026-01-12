import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { ItemService } from '../../services/item.service';
import { DisplayItem } from '../../types/game.types';

@Component({
  selector: 'inventory-page',
  templateUrl: './inventory-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPageComponent {
  gameStateService = inject(GameStateService);
  itemService = inject(ItemService);

  playerState = this.gameStateService.state;
  currentStorage = this.gameStateService.currentStorage;

  inventoryItems = computed<DisplayItem[]>(() => {
    const inventory = this.playerState().inventory;
    const items: DisplayItem[] = [];
    for (const [itemId, quantity] of inventory.entries()) {
      const itemData = this.itemService.getItem(itemId);
      if (itemData) {
        items.push({ ...itemData, quantity });
      }
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  });

  sellItem(itemId: string, quantity: number) {
    const item = this.itemService.getItem(itemId);
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
