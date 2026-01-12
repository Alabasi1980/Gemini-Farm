import { Injectable, signal, inject, effect, computed } from '@angular/core';
import { AnimalBuildingState, AnimalProduct } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { ObjectService } from './object.service';
import { PlacementService } from './placement.service';
import { GameClockService } from '../../world/services/game-clock.service';

const ANIMAL_PRODUCTS_DATA: AnimalProduct[] = [
    { id: 'egg', name: 'Egg', sellPrice: 12, asset: '🥚' }
];

@Injectable({ providedIn: 'root' })
export class AnimalService {
    private gameStateService = inject(GameStateService);
    private placementService = inject(PlacementService);
    private objectService = inject(ObjectService);
    private gameClockService = inject(GameClockService);

    private products = new Map<string, AnimalProduct>(ANIMAL_PRODUCTS_DATA.map(p => [p.id, p]));
    
    productionStates = signal<Map<number, AnimalBuildingState>>(new Map());

    collectableBuildings = computed(() => {
        this.gameClockService.gameTick(); // Depend on tick
        const collectable = [];
        for (const [instanceId, state] of this.productionStates().entries()) {
            const farmObject = this.placementService.placedObjects().find(o => o.instanceId === instanceId);
            if (!farmObject) continue;
            
            const item = this.objectService.getItem(farmObject.itemId);
            if (!item || !item.productionTime) continue;

            const timeElapsed = Date.now() - state.lastCollectionTime;
            if (timeElapsed >= item.productionTime) {
                collectable.push(farmObject);
            }
        }
        return collectable;
    });

    constructor() {
        effect(() => {
            const animalBuildings = this.placementService.placedObjects()
                .filter(obj => this.objectService.getItem(obj.itemId)?.type === 'animal_housing');
            
            this.productionStates.update(currentStates => {
                const newStates = new Map(currentStates);
                const buildingIds = new Set(animalBuildings.map(b => b.instanceId));

                for (const building of animalBuildings) {
                    if (!newStates.has(building.instanceId)) {
                        newStates.set(building.instanceId, {
                            instanceId: building.instanceId,
                            lastCollectionTime: Date.now()
                        });
                    }
                }
                
                for (const id of currentStates.keys()) {
                    if (!buildingIds.has(id)) {
                        newStates.delete(id);
                    }
                }
                return newStates;
            });
        });
    }

    getProduct(id: string): AnimalProduct | undefined {
        return this.products.get(id);
    }
    
    getAllProducts(): AnimalProduct[] {
        return Array.from(this.products.values());
    }

    collect(instanceId: number) {
        const farmObject = this.placementService.placedObjects().find(o => o.instanceId === instanceId);
        if (!farmObject) return;
        
        const item = this.objectService.getItem(farmObject.itemId);
        if (!item || !item.producesProductId || !item.productionTime) return;

        const state = this.productionStates().get(instanceId);
        if (!state) return;
        
        const timeElapsed = Date.now() - state.lastCollectionTime;
        if (timeElapsed < item.productionTime) {
            console.warn("Product not ready yet.");
            return;
        }

        if (this.gameStateService.addToInventory(item.producesProductId, 1)) {
            this.productionStates.update(states => {
                const newStates = new Map(states);
                newStates.set(instanceId, { ...state, lastCollectionTime: Date.now() });
                return newStates;
            });
        }
    }
}