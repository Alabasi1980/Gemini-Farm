import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FactoryService } from '../../services/factory.service';
import { GameStateService } from '../../services/game-state.service';
import { ObjectService } from '../../services/object.service';
import { ItemService } from '../../services/item.service';
import { Recipe } from '../../types/game.types';
import { FarmService } from '../../services/farm.service';

interface RecipeDisplayData extends Recipe {
    canAfford: boolean;
    outputItemAsset: string;
}

@Component({
  selector: 'app-recipe-picker',
  templateUrl: './recipe-picker.component.html',
  imports: [CommonModule],
})
export class RecipePickerComponent {
  factoryInstanceId = input.required<number>();

  @Output() recipeSelected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  factoryService = inject(FactoryService);
  gameStateService = inject(GameStateService);
  objectService = inject(ObjectService);
  itemService = inject(ItemService);
  // FIX: Resolve 'Cannot find name 'FarmService'' by importing it and injecting it as a class property, which is a best practice over using inject() inside a computed signal.
  farmService = inject(FarmService);

  factoryItem = computed(() => {
    const farmObject = this.farmService.placedObjects().find(o => o.instanceId === this.factoryInstanceId());
    return farmObject ? this.objectService.getItem(farmObject.itemId) : undefined;
  });

  availableRecipes = computed<RecipeDisplayData[]>(() => {
    const item = this.factoryItem();
    const playerInventory = this.gameStateService.state().inventory;
    if (!item || !item.recipeIds) return [];

    return item.recipeIds.map(recipeId => {
      const recipe = this.factoryService.getRecipe(recipeId)!;
      let canAfford = true;
      for (const [itemId, requiredQty] of recipe.inputs.entries()) {
        if ((playerInventory.get(itemId) || 0) < requiredQty) {
          canAfford = false;
          break;
        }
      }
      const outputItem = this.itemService.getItem(recipe.outputId);
      return { ...recipe, canAfford, outputItemAsset: outputItem?.asset || '?' };
    });
  });

  selectRecipe(recipeId: string) {
    this.recipeSelected.emit(recipeId);
  }

  closePicker() {
    this.close.emit();
  }

  getIngredientAsset(itemId: string): string {
    return this.itemService.getItem(itemId)?.asset || '?';
  }
}
