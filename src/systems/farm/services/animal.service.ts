import { Injectable, signal, inject, effect, computed, Injector } from '@angular/core';
import { AnimalBuildingState, AnimalProduct, SerializableMap } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { ObjectService } from './object.service';
import { PlacementService } from './placement.service';
import { GameClockService } from '../../world/services/game-clock.service';
import { ContentService } from '../../../shared/services/content.service';

@Injectable({ providedIn: 'root' })
export class AnimalService {
    private placementService = inject(PlacementService);
    private objectService = inject(ObjectService);
    private gameClockService = inject(GameClockService);
    private contentService = inject(ContentService);
    private injector = inject(Injector);

    private _gameStateService: GameStateService | null = null;
    private get gameStateService(): GameStateService {
        if (!this._gameStateService) this._gameStateService = this.injector.get(GameStateService);
        return this._gameStateService;
    }

    private products = computed(() => {
        return new Map<string, AnimalProduct>(this.contentService.animalProducts().map(p => [p.id, p]));
    });
    
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

                // Add state for newly placed buildings that don't have one
                for (const building of animalBuildings) {
                    if (!newStates.has(building.instanceId)) {
                        newStates.set(building.instanceId, {
                            instanceId: building.instanceId,
                            lastCollectionTime: Date.now()
                        });
                    }
                }
                
                // Remove state for buildings that no longer exist
                for (const id of currentStates.keys()) {
                    if (!buildingIds.has(id)) {
                        newStates.delete(id);
                    }
                }
                return newStates;
            });
        });
    }

    private objectToMap<T>(obj: SerializableMap<T> | undefined): Map<number, T> {
        const map = new Map<number, T>();
        if (obj) {
            for (const key in obj) {
                map.set(Number(key), obj[key]);
            }
        }
        return map;
    }

    public initializeState(states: SerializableMap<AnimalBuildingState> | undefined) {
        this.productionStates.set(this.objectToMap(states));
    }

    getProduct(id: string): AnimalProduct | undefined {
        return this.products().get(id);
    }
    
    getAllProducts(): AnimalProduct[] {
        return Array.from(this.products().values());
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