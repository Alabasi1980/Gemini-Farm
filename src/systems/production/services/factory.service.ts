import { Injectable, inject, signal, effect, computed, Injector } from '@angular/core';
import { FactoryState, ProcessedGood, Recipe, ProductionJob, SerializableMap } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { ObjectService } from '../../farm/services/object.service';
import { PlacementService } from '../../farm/services/placement.service';
import { GameClockService } from '../../world/services/game-clock.service';
import { ContentService } from '../../../shared/services/content.service';


@Injectable({ providedIn: 'root' })
export class FactoryService {
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

    private goods = computed(() => {
        return new Map<string, ProcessedGood>(this.contentService.processedGoods().map(g => [g.id, g]));
    });
    private recipes = computed(() => {
        return new Map<string, Recipe>(this.contentService.recipes().map(r => [r.id, r]));
    });
    
    private nextJobId = 0;

    factoryStates = signal<Map<number, FactoryState>>(new Map());

    collectableFactories = computed(() => {
        const collectable = [];
        for (const [instanceId, state] of this.factoryStates().entries()) {
            if (state.outputReady) {
                const farmObject = this.placementService.placedObjects().find(o => o.instanceId === instanceId);
                if (farmObject) {
                    collectable.push(farmObject);
                }
            }
        }
        return collectable;
    });

    constructor() {
        // Listen to game tick to update production progress
        effect(() => {
            this.gameClockService.gameTick(); // Depend on global gameTick
            this.factoryStates.update(currentStates => {
                const newStates = new Map(currentStates);
                let changed = false;
                for (const [id, state] of newStates.entries()) {
                    const typedState = state as FactoryState;
                    if (typedState.queue.length > 0 && !typedState.outputReady) {
                        const job = typedState.queue[0];
                        const recipe = this.getRecipe(job.recipeId);
                        // FIX: Cast id to number as it's being inferred as unknown from the map iterator.
                        const factory = this.getFactoryConfig(id as number);
                        if (recipe && factory) {
                            const duration = recipe.duration / factory.speedMultiplier;
                            const timeElapsed = Date.now() - job.startTime;
                            if (timeElapsed >= duration) {
                                newStates.set(id, { ...typedState, outputReady: true });
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
            const factories = this.placementService.placedObjects()
                .filter(obj => this.objectService.getItem(obj.itemId)?.type === 'factory');
            
            this.factoryStates.update(currentStates => {
                const newStates = new Map(currentStates);
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
                        });
                    }
                }
                
                for (const id of currentStates.keys()) {
                    if (!factoryIds.has(id)) {
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

    public initializeState(states: SerializableMap<FactoryState> | undefined) {
        this.factoryStates.set(this.objectToMap(states));
    }

    getRecipe(id: string): Recipe | undefined { return this.recipes().get(id); }
    getProcessedGood(id: string): ProcessedGood | undefined { return this.goods().get(id); }
    getAllProcessedGoods(): ProcessedGood[] { return Array.from(this.goods().values()); }

    getFactoryConfig(instanceId: number) {
        const farmObject = this.placementService.placedObjects().find(o => o.instanceId === instanceId);
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

    async startProduction(instanceId: number, recipeId: string): Promise<boolean> {
        const state = this.factoryStates().get(instanceId);
        const recipe = this.getRecipe(recipeId);
        const config = this.getFactoryConfig(instanceId);

        if (!state || !recipe || !config || state.queue.length >= config.queueSize) {
            return false;
        }

        if (await this.gameStateService.consumeFromInventory(recipe.inputs, true)) {
            this.factoryStates.update(states => {
                const current = states.get(instanceId)!;
                const newJob: ProductionJob = { jobId: this.nextJobId++, recipeId, startTime: 0 };
                const newQueue = [...current.queue, newJob];
                
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
    }
    
    collect(instanceId: number) {
        const state = this.factoryStates().get(instanceId);
        if (!state || !state.outputReady || state.queue.length === 0) return;

        const job = state.queue[0];
        const recipe = this.getRecipe(job.recipeId);
        if (!recipe) return;

        if (this.gameStateService.addToInventory(recipe.outputId, recipe.outputQuantity)) {
            this.factoryStates.update(states => {
                const current = states.get(instanceId)!;
                const newQueue = current.queue.slice(1);
                
                if (newQueue.length > 0) {
                    newQueue[0].startTime = Date.now();
                }

                const updatedState = { ...current, queue: newQueue, outputReady: false };
                const newStates = new Map(states);
                newStates.set(instanceId, updatedState);
                
                if (current.autoRun && current.lastRecipeId) {
                   setTimeout(() => this.startProduction(instanceId, current.lastRecipeId!), 0);
                }

                return newStates;
            });
        }
    }

    async upgradeFactory(instanceId: number) {
        const config = this.getFactoryConfig(instanceId);
        const state = this.factoryStates().get(instanceId);
        if (!config || !state || !this.gameStateService.state() || this.gameStateService.state()!.coins < config.upgradeCost) {
            return;
        }
        
        this.gameStateService.state.update(s => s ? ({...s, coins: s.coins - config.upgradeCost}) : null);

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
