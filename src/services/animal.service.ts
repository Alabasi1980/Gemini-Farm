import { Injectable, signal, inject, effect } from '@angular/core';
import { AnimalBuildingState, AnimalProduct } from '../types/game.types';
import { GameStateService } from './game-state.service';
import { FarmService } from './farm.service';
import { ObjectService } from './object.service';

const ANIMAL_PRODUCTS_DATA: AnimalProduct[] = [
    { id: 'egg', name: 'Egg', sellPrice: 12, asset: '🥚' }
];

@Injectable({ providedIn: 'root' })
export class AnimalService {
    private gameStateService = inject(GameStateService);
    private farmService = inject(FarmService);
    private objectService = inject(ObjectService);

    private products = new Map<string, AnimalProduct>(ANIMAL_PRODUCTS_DATA.map(p => [p.id, p]));
    
    productionStates = signal<Map<number, AnimalBuildingState>>(new Map());

    constructor() {
        // Effect to automatically add/remove state when animal buildings are placed/removed
        effect(() => {
            const animalBuildings = this.farmService.placedObjects()
                .filter(obj => this.objectService.getItem(obj.itemId)?.type === 'animal_housing');
            
            this.productionStates.update(currentStates => {
                const newStates = new Map(currentStates);
                const currentIds = new Set(currentStates.keys());
                const buildingIds = new Set(animalBuildings.map(b => b.instanceId));

                // Add new buildings
                for (const building of animalBuildings) {
                    if (!currentIds.has(building.instanceId)) {
                        newStates.set(building.instanceId, {
                            instanceId: building.instanceId,
                            lastCollectionTime: Date.now()
                        });
                    }
                }
                
                // Remove sold/removed buildings
                for (const id of currentIds) {
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
    
    collect(instanceId: number) {
        const farmObject = this.farmService.placedObjects().find(o => o.instanceId === instanceId);
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
