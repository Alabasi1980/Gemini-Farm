import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { FactoryService } from '../../services/factory.service';
import { ObjectService } from '../../services/object.service';
import { ItemService } from '../../services/item.service';
import { PlaceableItem } from '../../types/game.types';

interface FactoryDisplayInfo {
    item: PlaceableItem;
    status: 'Idle' | 'In Progress' | 'Ready to Collect';
    progress: number;
    recipeName?: string;
}

@Component({
  selector: 'production-page',
  templateUrl: './production-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionPageComponent {
    farmService = inject(FarmService);
    factoryService = inject(FactoryService);
    objectService = inject(ObjectService);
    itemService = inject(ItemService);

    gameTick = this.farmService.gameTick;

    factories = computed<FactoryDisplayInfo[]>(() => {
        this.gameTick(); // Rerun on tick
        const placedFactories = this.farmService.placedObjects().filter(obj => 
            this.objectService.getItem(obj.itemId)?.type === 'factory'
        );

        return placedFactories.map(factoryObj => {
            const item = this.objectService.getItem(factoryObj.itemId)!;
            const state = this.factoryService.factoryStates().get(factoryObj.instanceId);
            
            if (!state) {
                return { item, status: 'Idle', progress: 0 };
            }

            if (state.outputReady) {
                return { item, status: 'Ready to Collect', progress: 100 };
            }

            if (state.activeRecipeId && state.productionStartTime) {
                const recipe = this.factoryService.getRecipe(state.activeRecipeId)!;
                const timeElapsed = Date.now() - state.productionStartTime;
                const progress = Math.min(100, (timeElapsed / recipe.duration) * 100);
                const outputItemName = this.itemService.getItem(recipe.outputId)?.name || '';
                return { item, status: 'In Progress', progress, recipeName: `Making ${outputItemName}` };
            }

            return { item, status: 'Idle', progress: 0 };
        });
    });
}
