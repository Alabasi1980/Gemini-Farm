import { Injectable, inject, signal, effect } from '@angular/core';
import { FactoryState, ProcessedGood, Recipe } from '../types/game.types';
import { GameStateService } from './game-state.service';
import { FarmService } from './farm.service';
import { ObjectService } from './object.service';

const PROCESSED_GOODS_DATA: ProcessedGood[] = [
    { id: 'flour', name: 'Flour', sellPrice: 20, asset: '⚪' },
];

const RECIPES_DATA: Recipe[] = [
    { 
        id: 'wheat_to_flour', 
        name: 'Mill Wheat',
        duration: 1000 * 15, // 15 seconds
        inputs: new Map([['wheat', 2]]),
        outputId: 'flour',
        outputQuantity: 1
    }
];

@Injectable({ providedIn: 'root' })
export class FactoryService {
    private gameStateService = inject(GameStateService);
    private farmService = inject(FarmService);
    private objectService = inject(ObjectService);

    private goods = new Map<string, ProcessedGood>(PROCESSED_GOODS_DATA.map(g => [g.id, g]));
    private recipes = new Map<string, Recipe>(RECIPES_DATA.map(r => [r.id, r]));

    factoryStates = signal<Map<number, FactoryState>>(new Map());

    constructor() {
        // Listen to game tick to update production progress
        effect(() => {
            this.farmService.gameTick(); // Depend on gameTick
            this.factoryStates.update(currentStates => {
                const newStates = new Map(currentStates);
                let changed = false;
                for (const [id, state] of newStates.entries()) {
                    if (state.activeRecipeId && state.productionStartTime && !state.outputReady) {
                        const recipe = this.getRecipe(state.activeRecipeId);
                        if (recipe) {
                            const timeElapsed = Date.now() - state.productionStartTime;
                            if (timeElapsed >= recipe.duration) {
                                newStates.set(id, { ...state, outputReady: true });
                                changed = true;
                            }
                        }
                    }
                }
                return changed ? newStates : currentStates;
            });
        });

        // Effect to add/remove states when factories are placed/removed
        effect(() => {
            const factories = this.farmService.placedObjects()
                .filter(obj => this.objectService.getItem(obj.itemId)?.type === 'factory');
            
            this.factoryStates.update(currentStates => {
                const newStates = new Map(currentStates);
                const currentIds = new Set(currentStates.keys());
                const factoryIds = new Set(factories.map(f => f.instanceId));

                for (const factory of factories) {
                    if (!currentIds.has(factory.instanceId)) {
                        newStates.set(factory.instanceId, {
                            instanceId: factory.instanceId,
                            activeRecipeId: null,
                            productionStartTime: null,
                            outputReady: false
                        });
                    }
                }
                
                for (const id of currentIds) {
                    if (!factoryIds.has(id)) {
                        newStates.delete(id);
                    }
                }
                return newStates;
            });
        });
    }

    getRecipe(id: string): Recipe | undefined { return this.recipes.get(id); }
    getProcessedGood(id: string): ProcessedGood | undefined { return this.goods.get(id); }

    startProduction(instanceId: number, recipeId: string) {
        const state = this.factoryStates().get(instanceId);
        const recipe = this.getRecipe(recipeId);
        if (!state || !recipe || state.activeRecipeId) return;

        if (this.gameStateService.consumeFromInventory(recipe.inputs)) {
            this.factoryStates.update(states => {
                const newStates = new Map(states);
                newStates.set(instanceId, { 
                    ...state, 
                    activeRecipeId: recipeId,
                    productionStartTime: Date.now(),
                    outputReady: false 
                });
                return newStates;
            });
        }
    }
    
    collect(instanceId: number) {
        const state = this.factoryStates().get(instanceId);
        if (!state || !state.outputReady || !state.activeRecipeId) return;

        const recipe = this.getRecipe(state.activeRecipeId);
        if (!recipe) return;

        if (this.gameStateService.addToInventory(recipe.outputId, recipe.outputQuantity)) {
            this.factoryStates.update(states => {
                const newStates = new Map(states);
                newStates.set(instanceId, { 
                    ...state, 
                    activeRecipeId: null,
                    productionStartTime: null,
                    outputReady: false 
                });
                return newStates;
            });
        }
    }
}
