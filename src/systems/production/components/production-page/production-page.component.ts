import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FactoryService } from '../../services/factory.service';
import { ObjectService } from '../../../farm/services/object.service';
import { ItemService } from '../../../../shared/services/item.service';
import { PlaceableItem, ProductionJob } from '../../../../shared/types/game.types';
import { GameStateService } from '../../../player/services/game-state.service';
import { PlacementService } from '../../../farm/services/placement.service';
import { GameClockService } from '../../../world/services/game-clock.service';

interface FactoryDisplayInfo {
    instanceId: number;
    item: PlaceableItem;
    status: 'Idle' | 'In Progress' | 'Ready to Collect';
    progress: number;
    level: number;
    queue: ProductionJob[];
    queueSize: number;
    upgradeCost: number;
    canAffordUpgrade: boolean;
    autoRun: boolean;
    queuedItems: { asset: string }[];
}

@Component({
  selector: 'production-page',
  templateUrl: './production-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionPageComponent {
    factoryService = inject(FactoryService);
    objectService = inject(ObjectService);
    itemService = inject(ItemService);
    gameStateService = inject(GameStateService);
    placementService = inject(PlacementService);
    gameClockService = inject(GameClockService);

    factories = computed<FactoryDisplayInfo[]>(() => {
        this.gameClockService.gameTick(); // Rerun on tick
        const placedFactories = this.placementService.placedObjects().filter(obj => 
            this.objectService.getItem(obj.itemId)?.type === 'factory'
        );

        return placedFactories.map(factoryObj => {
            const item = this.objectService.getItem(factoryObj.itemId)!;
            const state = this.factoryService.factoryStates().get(factoryObj.instanceId);
            const config = this.factoryService.getFactoryConfig(factoryObj.instanceId);
            
            if (!state || !config) {
                return { 
                    instanceId: factoryObj.instanceId, item, status: 'Idle', progress: 0, level: 1, 
                    queue: [], queueSize: 0, upgradeCost: 0, canAffordUpgrade: false, autoRun: false, queuedItems: []
                };
            }
            
            let status: 'Idle' | 'In Progress' | 'Ready to Collect' = 'Idle';
            let progress = 0;

            if (state.outputReady) {
                status = 'Ready to Collect';
                progress = 100;
            } else if (state.queue.length > 0) {
                status = 'In Progress';
                const job = state.queue[0];
                const recipe = this.factoryService.getRecipe(job.recipeId)!;
                const duration = recipe.duration / config.speedMultiplier;
                const timeElapsed = Date.now() - job.startTime;
                progress = Math.min(100, (timeElapsed / duration) * 100);
            }

            const queuedItems = state.queue.slice(1).map(job => {
                const recipe = this.factoryService.getRecipe(job.recipeId)!;
                return { asset: this.itemService.getItem(recipe.outputId)?.asset || '?' };
            });

            return {
                instanceId: factoryObj.instanceId,
                item,
                status,
                progress,
                level: state.level,
                queue: state.queue,
                queueSize: config.queueSize,
                upgradeCost: config.upgradeCost,
                canAffordUpgrade: this.gameStateService.state().coins >= config.upgradeCost,
                autoRun: state.autoRun,
                queuedItems
            };
        });
    });

    upgrade(instanceId: number) {
        this.factoryService.upgradeFactory(instanceId);
    }

    toggleAutoRun(instanceId: number) {
        this.factoryService.toggleAutoRun(instanceId);
    }
}