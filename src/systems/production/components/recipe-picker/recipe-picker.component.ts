import { ChangeDetectionStrategy, Component, computed, output, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FactoryService } from '../../services/factory.service';
import { GameStateService } from '../../../player/services/game-state.service';
import { ObjectService } from '../../../farm/services/object.service';
import { ItemService } from '../../../../shared/services/item.service';
import { Recipe } from '../../../../shared/types/game.types';
import { PlacementService } from '../../../farm/services/placement.service';
import { KeyValuePipe } from '../../../../shared/pipes/keyvalue.pipe';

interface RecipeDisplayData extends Recipe {
    canAfford: boolean;
    outputItemAsset: string;
}

@Component({
  selector: 'app-recipe-picker',
  templateUrl: './recipe-picker.component.html',
  imports: [CommonModule, KeyValuePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipePickerComponent {
  factoryInstanceId = input.required<number>();

  recipeSelected = output<string>();
  close = output<void>();

  factoryService = inject(FactoryService);
  gameStateService = inject(GameStateService);
  objectService = inject(ObjectService);
  itemService = inject(ItemService);
  placementService = inject(PlacementService);

  playerInventory = computed(() => this.gameStateService.state()?.inventory ?? {});

  factoryItem = computed(() => {
    const farmObject = this.placementService.placedObjects().find(o => o.instanceId === this.factoryInstanceId());
    return farmObject ? this.objectService.getItem(farmObject.itemId) : undefined;
  });

  availableRecipes = computed<RecipeDisplayData[]>(() => {
    const item = this.factoryItem();
    const inventory = this.playerInventory();
    if (!item || !item.recipeIds) return [];

    return item.recipeIds.map(recipeId => {
      const recipe = this.factoryService.getRecipe(recipeId)!;
      let canAfford = true;
      for (const [itemId, requiredQty] of Object.entries(recipe.inputs)) {
        if ((inventory[itemId] || 0) < requiredQty) {
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