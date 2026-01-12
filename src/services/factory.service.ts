<<<<<<< HEAD
import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { FactoryState, ProcessedGood, Recipe, ProductionJob } from '../types/game.types';
=======
import { Injectable, inject, signal, effect } from '@angular/core';
import { FactoryState, ProcessedGood, Recipe } from '../types/game.types';
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
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
<<<<<<< HEAD
    private nextJobId = 0;

    factoryStates = signal<Map<number, FactoryState>>(new Map());

    collectableFactories = computed(() => {
        const collectable = [];
        for (const [instanceId, state] of this.factoryStates().entries()) {
            if (state.outputReady) {
                const farmObject = this.farmService.placedObjects().find(o => o.instanceId === instanceId);
                if (farmObject) {
                    collectable.push(farmObject);
                }
            }
        }
        return collectable;
    });

=======

    factoryStates = signal<Map<number, FactoryState>>(new Map());

>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
    constructor() {
        // Listen to game tick to update production progress
        effect(() => {
            this.farmService.gameTick(); // Depend on gameTick
            this.factoryStates.update(currentStates => {
                const newStates = new Map(currentStates);
                let changed = false;
                for (const [id, state] of newStates.entries()) {
<<<<<<< HEAD
                    if (state.queue.length > 0 && !state.outputReady) {
                        const job = state.queue[0];
                        const recipe = this.getRecipe(job.recipeId);
                        const factory = this.getFactoryConfig(id);
                        if (recipe && factory) {
                            const duration = recipe.duration / factory.speedMultiplier;
                            const timeElapsed = Date.now() - job.startTime;
                            if (timeElapsed >= duration) {
=======
                    if (state.activeRecipeId && state.productionStartTime && !state.outputReady) {
                        const recipe = this.getRecipe(state.activeRecipeId);
                        if (recipe) {
                            const timeElapsed = Date.now() - state.productionStartTime;
                            if (timeElapsed >= recipe.duration) {
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
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
<<<<<<< HEAD
                const factoryIds = new Set(factories.map(f => f.instanceId));

                for (const factory of factories) {
                    if (!newStates.has(factory.instanceId)) {
                        newStates.set(factory.instanceId, {
                            instanceId: factory.instanceId,
                            level: 1,
                            queue: [],
                            outputReady: false,
                            autoRun: false,
                            lastRecipeId: null
=======
                const currentIds = new Set(currentStates.keys());
                const factoryIds = new Set(factories.map(f => f.instanceId));

                for (const factory of factories) {
                    if (!currentIds.has(factory.instanceId)) {
                        newStates.set(factory.instanceId, {
                            instanceId: factory.instanceId,
                            activeRecipeId: null,
                            productionStartTime: null,
                            outputReady: false
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
                        });
                    }
                }
                
<<<<<<< HEAD
                for (const id of currentStates.keys()) {
=======
                for (const id of currentIds) {
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
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
<<<<<<< HEAD
    getAllProcessedGoods(): ProcessedGood[] { return Array.from(this.goods.values()); }

    getFactoryConfig(instanceId: number) {
        const farmObject = this.farmService.placedObjects().find(o => o.instanceId === instanceId);
        if (!farmObject) return null;
        const item = this.objectService.getItem(farmObject.itemId);
        const state = this.factoryStates().get(instanceId);
        if (!item || !state || item.type !== 'factory' || !item.baseQueueSize || !item.speedPerLevel || !item.upgradeCost) return null;

        return {
            level: state.level,
            queueSize: item.baseQueueSize + state.level - 1,
            speedMultiplier: 1 + (state.level - 1) * item.speedPerLevel,
            upgradeCost: item.upgradeCost * state.level, // Simple scaling
        };
    }
=======
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396

    startProduction(instanceId: number, recipeId: string) {
        const state = this.factoryStates().get(instanceId);
        const recipe = this.getRecipe(recipeId);
<<<<<<< HEAD
        const config = this.getFactoryConfig(instanceId);

        if (!state || !recipe || !config || state.queue.length >= config.queueSize) {
            return false;
        }

        if (this.gameStateService.consumeFromInventory(recipe.inputs)) {
            this.factoryStates.update(states => {
                const current = states.get(instanceId)!;
                const newJob: ProductionJob = { jobId: this.nextJobId++, recipeId, startTime: 0 };
                const newQueue = [...current.queue, newJob];
                
                // If this is the first item in an empty queue, start it now
                if (newQueue.length === 1 && !current.outputReady) {
                    newQueue[0].startTime = Date.now();
                }

                const updatedState: FactoryState = { ...current, queue: newQueue, lastRecipeId: recipeId };
                const newStates = new Map(states);
                newStates.set(instanceId, updatedState);
                return newStates;
            });
            return true;
        }
        return false;
=======
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
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
    }
    
    collect(instanceId: number) {
        const state = this.factoryStates().get(instanceId);
<<<<<<< HEAD
        if (!state || !state.outputReady || state.queue.length === 0) return;

        const job = state.queue[0];
        const recipe = this.getRecipe(job.recipeId);
=======
        if (!state || !state.outputReady || !state.activeRecipeId) return;

        const recipe = this.getRecipe(state.activeRecipeId);
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
        if (!recipe) return;

        if (this.gameStateService.addToInventory(recipe.outputId, recipe.outputQuantity)) {
            this.factoryStates.update(states => {
<<<<<<< HEAD
                const current = states.get(instanceId)!;
                const newQueue = current.queue.slice(1);
                
                // Start next job if it exists
                if (newQueue.length > 0) {
                    newQueue[0].startTime = Date.now();
                }

                const updatedState = { ...current, queue: newQueue, outputReady: false };
                const newStates = new Map(states);
                newStates.set(instanceId, updatedState);
                
                // Handle Auto-Run
                if (current.autoRun && current.lastRecipeId) {
                   // We need to allow signal writes here because startProduction updates the state.
                   // The effect running this will ensure atomicity.
                   setTimeout(() => this.startProduction(instanceId, current.lastRecipeId!), 0);
                }

=======
                const newStates = new Map(states);
                newStates.set(instanceId, { 
                    ...state, 
                    activeRecipeId: null,
                    productionStartTime: null,
                    outputReady: false 
                });
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
                return newStates;
            });
        }
    }
<<<<<<< HEAD

    upgradeFactory(instanceId: number) {
        const config = this.getFactoryConfig(instanceId);
        const state = this.factoryStates().get(instanceId);
        if (!config || !state || this.gameStateService.state().coins < config.upgradeCost) {
            return;
        }
        
        this.gameStateService.state.update(s => ({...s, coins: s.coins - config.upgradeCost}));

        this.factoryStates.update(states => {
            const newStates = new Map(states);
            newStates.set(instanceId, {...state, level: state.level + 1});
            return newStates;
        });
    }

    toggleAutoRun(instanceId: number) {
        this.factoryStates.update(states => {
            const state = states.get(instanceId);
            if (state) {
                const newStates = new Map(states);
                newStates.set(instanceId, {...state, autoRun: !state.autoRun});
                return newStates;
            }
            return states;
        });
    }
}
=======
}
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
