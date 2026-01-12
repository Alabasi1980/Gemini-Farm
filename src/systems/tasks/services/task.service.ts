import { Injectable, signal, inject, effect } from '@angular/core';
import { GameTask, TaskState } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { AiTaskService, PlayerTaskContext } from './ai-task.service';
import { ObjectService } from '../../farm/services/object.service';
import { PlacementService } from '../../farm/services/placement.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
    private gameStateService = inject(GameStateService);
    private aiTaskService = inject(AiTaskService);
    private placementService = inject(PlacementService);
    private objectService = inject(ObjectService);

    tasks = signal<GameTask[]>([]);
    taskStates = signal<Map<string, TaskState>>(new Map());
    loading = signal<boolean>(false);
    error = signal<string | null>(null);

    constructor() {
        // Effect to update task progress when player inventory or tasks change
        effect(() => {
            const state = this.gameStateService.state();
            if (!state) return;

            const inventory = state.inventory;
            const currentTasks = this.tasks();

            this.taskStates.update(currentStates => {
                const newStates = new Map(currentStates);
                let hasChanged = false;

                for (const task of currentTasks) {
                    const currentState = newStates.get(task.id) as TaskState | undefined;
                    if (!currentState || currentState.claimed) continue;

                    if (task.type === 'INVENTORY') {
                        const newProgress = inventory[task.targetItemId] || 0;
                        if (currentState.progress !== newProgress || !currentState.completed) {
                           const updatedProgress = Math.min(newProgress, task.targetQuantity);
                           const isCompleted = updatedProgress >= task.targetQuantity;
                           
                           if(currentState.progress !== updatedProgress || currentState.completed !== isCompleted) {
                                newStates.set(task.id, { ...currentState, progress: updatedProgress, completed: isCompleted });
                                hasChanged = true;
                           }
                        }
                    }
                }
                
                return hasChanged ? new Map(newStates) : currentStates;
            });
        });
    }

    private initializeTaskStates(tasks: GameTask[]) {
        const initialStates = new Map<string, TaskState>();
        for (const task of tasks) {
            initialStates.set(task.id, {
                taskId: task.id,
                progress: 0,
                completed: false,
                claimed: false,
            });
        }
        this.taskStates.set(initialStates);
    }

    async fetchNewTasks() {
        this.loading.set(true);
        this.error.set(null);
        this.tasks.set([]);
        
        const playerState = this.gameStateService.state();
        if (!playerState) {
            this.error.set("Player data not loaded yet.");
            this.loading.set(false);
            return;
        }

        try {
            // 1. Gather Context
            const inventoryObject = playerState.inventory;

            const ownedFactories = this.placementService.placedObjects()
                .map(obj => this.objectService.getItem(obj.itemId))
                .filter(item => item?.type === 'factory')
                .map(item => item!.id);

            const context: PlayerTaskContext = {
                level: playerState.level,
                xp: playerState.xp,
                inventory: inventoryObject,
                ownedFactories: [...new Set(ownedFactories)],
                existingTaskIds: this.tasks().map((t: GameTask) => t.id)
            };

            // 2. Call AI Service
            const newTasks = await this.aiTaskService.generateTasks(context);
            
            // 3. Update State
            this.tasks.set(newTasks);
            this.initializeTaskStates(newTasks);

        } catch (e: any) {
            this.error.set(e.message || "An unknown error occurred.");
        } finally {
            this.loading.set(false);
        }
    }

    claimReward(taskId: string) {
        const state = this.taskStates().get(taskId);
        const task = this.tasks().find(t => t.id === taskId);

        if (!state || !task || !state.completed || state.claimed) {
            console.warn("Cannot claim reward for task:", taskId);
            return;
        }

        this.gameStateService.state.update(s => {
            if (!s) return null;
            return {
                ...s,
                coins: s.coins + task.reward.coins,
                xp: s.xp + task.reward.xp,
            }
        });
        
        this.taskStates.update(states => {
            const newStates = new Map(states);
            newStates.set(taskId, { ...state, claimed: true });
            return newStates;
        });
    }
}