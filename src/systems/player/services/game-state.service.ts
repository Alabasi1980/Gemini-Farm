import { Injectable, signal, computed, effect, inject, Injector } from '@angular/core';
import { PlayerState, GameDataDocument, SerializableMap, FactoryState, AnimalBuildingState, TaskState } from '../../../shared/types/game.types';
import { AuthenticationService } from './authentication.service';
import { DatabaseService } from '../../../shared/services/database.service';
import { ContentService } from '../../../shared/services/content.service';
import { ObservabilityService } from '../../../shared/services/observability.service';
import { GridService } from '../../farm/services/grid.service';
import { PlacementService } from '../../farm/services/placement.service';
import { FactoryService } from '../../production/services/factory.service';
import { AnimalService } from '../../farm/services/animal.service';
import { TaskService } from '../../tasks/services/task.service';
import { WorkerService } from '../../management/services/worker.service';

const CURRENT_STATE_VERSION = 1;
const SAVE_DEBOUNCE_TIME = 2500; // ms

const NEW_PLAYER_STATE: PlayerState = {
  version: CURRENT_STATE_VERSION,
  coins: 25,
  xp: 0,
  level: 1,
  storage: {
    max: 25,
  },
  inventory: {},
  expansionsPurchased: 0,
  milestones: {
    hasPlantedFirstCrop: false,
    hasHarvestedFirstCrop: false,
    tutorialCompleted: false,
    tutorialStep: 0,
  },
};

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private authService = inject(AuthenticationService);
  private dbService = inject(DatabaseService);
  private contentService = inject(ContentService);
  private observabilityService = inject(ObservabilityService);
  
  private injector = inject(Injector);

  private _gridService: GridService | null = null;
  private get gridService(): GridService {
    if (!this._gridService) this._gridService = this.injector.get(GridService);
    return this._gridService;
  }

  private _placementService: PlacementService | null = null;
  private get placementService(): PlacementService {
    if (!this._placementService) this._placementService = this.injector.get(PlacementService);
    return this._placementService;
  }

  private _factoryService: FactoryService | null = null;
  private get factoryService(): FactoryService {
    if (!this._factoryService) this._factoryService = this.injector.get(FactoryService);
    return this._factoryService;
  }

  private _animalService: AnimalService | null = null;
  private get animalService(): AnimalService {
    if (!this._animalService) this._animalService = this.injector.get(AnimalService);
    return this._animalService;
  }

  private _taskService: TaskService | null = null;
  private get taskService(): TaskService {
    if (!this._taskService) this._taskService = this.injector.get(TaskService);
    return this._taskService;
  }

  private _workerService: WorkerService | null = null;
  private get workerService(): WorkerService {
    if (!this._workerService) this._workerService = this.injector.get(WorkerService);
    return this._workerService;
  }

  state = signal<PlayerState | null>(null);
  loading = signal<boolean>(true);
  saveStatus = signal<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  conflictDetected = signal(false);

  private saveTimeout: any = null;
  private savePromise: Promise<void> | null = null;
  private lastLoadedTimestamp: any = null;
  private unsubscribeFromStateChanges: (() => void) | null = null;
  
  // SYNC STRATEGY: Session ID + Mutation ID
  // A unique ID for this browser session. Generated once per reload.
  private sessionId = crypto.randomUUID();
  // Set of mutations we initiated but haven't seen echoed back yet.
  private pendingMutations = new Set<string>();
  
  currentStorage = computed(() => {
    const currentInventory = this.state()?.inventory;
    if (!currentInventory) return 0;
    return Object.values(currentInventory).reduce((acc: number, quantity: number) => acc + quantity, 0);
  });

  constructor() {
    effect(() => {
        const userId = this.authService.userId();
        if (userId) {
            this.loadPlayerData(userId);
            this.listenForRemoteChanges(userId);
        } else {
            this.state.set(null);
            this.loading.set(false);
            this.lastLoadedTimestamp = null;
            this.conflictDetected.set(false);
            this.pendingMutations.clear();
            
            if (this.unsubscribeFromStateChanges) {
                this.unsubscribeFromStateChanges();
                this.unsubscribeFromStateChanges = null;
            }

            this.gridService.initializeState(undefined);
            this.placementService.initializeState(undefined);
            this.factoryService.initializeState(undefined);
            this.animalService.initializeState(undefined);
            this.taskService.initializeState(undefined, undefined);
            this.workerService.initializeState(undefined);
        }
    }, { allowSignalWrites: true });

    effect(() => {
        const currentUserId = this.authService.userId();
        const fullState = {
            player: this.state(),
            tiles: this.gridService.tiles(),
            objects: this.placementService.placedObjects(),
            factories: this.factoryService.factoryStates(),
            animals: this.animalService.productionStates(),
            tasks: this.taskService.tasks(),
            taskStates: this.taskService.taskStates(),
            workers: this.workerService.workers(),
        };

        if (fullState.player && currentUserId && !this.conflictDetected()) {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            this.saveTimeout = setTimeout(() => {
                this.saveStateDebounced(currentUserId);
            }, SAVE_DEBOUNCE_TIME);
        }
    }, { allowSignalWrites: true });
  }

  async initialize(): Promise<void> {
    await this.loadInitialContent();
  }

  private mapToObject<T>(map: Map<number | string, T>): SerializableMap<T> {
    const obj: SerializableMap<T> = {};
    for (const [key, value] of map.entries()) {
        obj[String(key)] = value;
    }
    return obj;
  }

  private async performSave(userId: string): Promise<void> {
    const gameData: Partial<GameDataDocument> = {
        playerState: this.state()!,
        farmTiles: this.gridService.tiles(),
        placedObjects: this.placementService.placedObjects(),
        factoryStates: this.mapToObject(this.factoryService.factoryStates()),
        animalBuildingStates: this.mapToObject(this.animalService.productionStates()),
        tasks: this.taskService.tasks(),
        taskStates: this.mapToObject(this.taskService.taskStates()),
        workers: this.workerService.workers(),
    };

    const mutationId = crypto.randomUUID();
    this.pendingMutations.add(mutationId);

    try {
        return await this.dbService.saveGameData(
            userId, 
            gameData, 
            this.lastLoadedTimestamp, 
            { sessionId: this.sessionId, mutationId }
        );
    } catch (e) {
        this.pendingMutations.delete(mutationId);
        throw e;
    }
  }
  
  private async saveStateDebounced(userId: string) {
    if (this.savePromise) {
      await this.savePromise; 
    }
    
    this.saveStatus.set('saving');
    this.savePromise = this.performSave(userId);
    try {
        await this.savePromise;
        // Don't update lastLoadedTimestamp here immediately; we wait for the snapshot.
        // Or if we do, we might risk race conditions with the snapshot listener.
        // The snapshot listener handles the "echo" and updates the timestamp correctly.
        this.saveStatus.set('saved');
        setTimeout(() => {
            if (this.saveStatus() === 'saved') this.saveStatus.set('idle');
        }, 2000);
    } catch(e: any) {
        if (e.message === 'STATE_CONFLICT') {
            console.error("State conflict detected (Debounced). Server has newer data.");
            this.conflictDetected.set(true);
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
        } else {
            console.error("Auto-save failed:", e);
            this.observabilityService.logError(e, 'GameStateService.saveStateDebounced');
            this.saveStatus.set('failed');
            setTimeout(() => {
                if (this.saveStatus() === 'failed') this.saveStatus.set('idle');
            }, 3000);
        }
    } finally {
        this.savePromise = null;
    }
  }

  public async saveStateImmediately(): Promise<void> {
    if (this.conflictDetected()) return;

    const currentUserId = this.authService.userId();
    if (this.state() && currentUserId) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      
      await this.savePromise;
      
      this.saveStatus.set('saving');
      this.savePromise = this.performSave(currentUserId);
      try {
        await this.savePromise;
        this.saveStatus.set('saved');
        setTimeout(() => {
            if (this.saveStatus() === 'saved') this.saveStatus.set('idle');
        }, 2000);
      } catch(e: any) {
         if (e.message === 'STATE_CONFLICT') {
            console.error("State conflict detected (Immediate). Server has newer data.");
            this.conflictDetected.set(true);
         } else {
            console.error("Immediate save failed:", e);
            this.observabilityService.logError(e, 'GameStateService.saveStateImmediately');
            this.saveStatus.set('failed');
         }
      } finally {
        this.savePromise = null;
      }
    }
  }

  private async loadInitialContent() {
    try {
        await this.contentService.loadContent();
    } catch (error) {
        console.error("CRITICAL: Failed to load game content.", error);
        this.observabilityService.logError(error, 'GameStateService.loadInitialContent');
    }
  }

  private async loadPlayerData(userId: string) {
    this.loading.set(true);
    try {
      const savedData = await this.dbService.loadGameData(userId);
      if (savedData?.playerState) {
          this.lastLoadedTimestamp = savedData.updatedAt ?? null;
          const migratedState = this.migrateState(savedData.playerState);
          this.state.set(migratedState);

          this.gridService.initializeState(savedData.farmTiles);
          this.placementService.initializeState(savedData.placedObjects);
          this.factoryService.initializeState(savedData.factoryStates);
          this.animalService.initializeState(savedData.animalBuildingStates);
          this.taskService.initializeState(savedData.tasks, savedData.taskStates);
          this.workerService.initializeState(savedData.workers);
      } else {
          console.log("Creating new player state for user:", userId);
          this.state.set(NEW_PLAYER_STATE);

          this.gridService.initializeState(undefined);
          this.placementService.initializeState(undefined);
          this.factoryService.initializeState(undefined);
          this.animalService.initializeState(undefined);
          this.taskService.initializeState(undefined, undefined);
          this.workerService.initializeState(undefined);

          await this.saveStateImmediately();
      }
    } catch (error) {
        console.error("Failed to load player data, using default state:", error);
        this.observabilityService.logError(error, 'GameStateService.loadPlayerData');
        this.state.set(NEW_PLAYER_STATE);
        this.lastLoadedTimestamp = null;
    } finally {
        this.loading.set(false);
    }
  }
  
  private listenForRemoteChanges(userId: string) {
    if (this.unsubscribeFromStateChanges) {
      this.unsubscribeFromStateChanges();
    }

    this.unsubscribeFromStateChanges = this.dbService.onPlayerDocChanges(userId, (serverData) => {
        if (this.conflictDetected() || !serverData?.updatedAt) return;

        // SYNC STRATEGY: Mutation ID Check
        const lastMutation = serverData.lastMutation;
        if (lastMutation && lastMutation.sessionId === this.sessionId && this.pendingMutations.has(lastMutation.mutationId)) {
            // This update was caused by us. It's an ECHO.
            // We should accept it as the new truth for timestamp purposes, but NOT trigger a reload/conflict.
            console.log("Sync: Ignoring echo from local mutation:", lastMutation.mutationId);
            this.pendingMutations.delete(lastMutation.mutationId);
            this.lastLoadedTimestamp = serverData.updatedAt;
            return;
        }

        if (this.lastLoadedTimestamp && serverData.updatedAt.toMillis() > this.lastLoadedTimestamp.toMillis()) {
            console.warn(`Remote change detected. Local: ${this.lastLoadedTimestamp.toMillis()}, Server: ${serverData.updatedAt.toMillis()}`);
            this.conflictDetected.set(true);
            
            if (this.unsubscribeFromStateChanges) {
                this.unsubscribeFromStateChanges();
                this.unsubscribeFromStateChanges = null;
            }
        }
    });
  }

  private migrateState(playerState: PlayerState): PlayerState {
      let migratedState = { ...playerState };

      if (!migratedState.version || migratedState.version < CURRENT_STATE_VERSION) {
          migratedState.version = CURRENT_STATE_VERSION;
      }
      
      if (!migratedState.milestones) {
        migratedState.milestones = {
            hasPlantedFirstCrop: false,
            hasHarvestedFirstCrop: false,
            tutorialCompleted: false,
            tutorialStep: 0,
        };
      }
      
      if (typeof migratedState.milestones.tutorialCompleted === 'undefined') {
        migratedState.milestones.tutorialCompleted = false;
      }
      if (typeof migratedState.milestones.tutorialStep === 'undefined') {
        migratedState.milestones.tutorialStep = 0;
      }

      return migratedState;
  }

  public async applyResourceChanges(deltas: { coins?: number; xp?: number; inventory?: { [itemId: string]: number } }): Promise<void> {
    const userId = this.authService.userId();
    if (!userId || this.conflictDetected()) return;

    // 1. Optimistic Update (Client-side)
    this.state.update(s => {
      if (!s) return null;

      const newCoins = s.coins + (deltas.coins || 0);
      const newXp = s.xp + (deltas.xp || 0);
      const newInventory = { ...s.inventory };
      
      if (deltas.inventory) {
        for (const [itemId, delta] of Object.entries(deltas.inventory)) {
          const currentAmount = newInventory[itemId] || 0;
          const newAmount = currentAmount + delta;
          if (newAmount > 0) {
            newInventory[itemId] = newAmount;
          } else {
            delete newInventory[itemId];
          }
        }
      }

      return {
        ...s,
        coins: newCoins < 0 ? 0 : newCoins,
        xp: newXp,
        inventory: newInventory,
      };
    });

    // 2. Server Update with Mutation ID
    const mutationId = crypto.randomUUID();
    this.pendingMutations.add(mutationId);

    try {
      await this.dbService.atomicallyUpdateResources(
          userId, 
          deltas, 
          { sessionId: this.sessionId, mutationId }
      );
      // We do NOT update lastLoadedTimestamp here manually anymore.
      // We wait for the snapshot listener to catch the echo and update it.
      // This ensures we always have the exact server timestamp.
    } catch (e) {
      console.error("Atomic resource update failed, forcing a state conflict to reload.", e);
      this.observabilityService.logError(e, 'GameStateService.applyResourceChanges');
      this.pendingMutations.delete(mutationId);
      this.conflictDetected.set(true);
    }
  }

  addToInventory(itemId: string, quantity: number): boolean {
    const currentState = this.state();
    if (!currentState) return false;
    
    const maxStorage = currentState.storage.max;
    if (this.currentStorage() + quantity > maxStorage) {
        console.warn('Not enough storage space.');
        return false;
    }

    this.state.update(s => {
        if (!s) return null;
        const newInventory = { ...s.inventory };
        newInventory[itemId] = (newInventory[itemId] || 0) + quantity;
        return { ...s, inventory: newInventory };
    });
    return true;
  }

  async consumeFromInventory(items: { [itemId: string]: number }, save: boolean = true): Promise<boolean> {
    const currentState = this.state();
    if (!currentState) return false;

    const currentInventory = currentState.inventory;

    for (const [itemId, requiredQuantity] of Object.entries(items)) {
        if ((currentInventory[itemId] || 0) < requiredQuantity) {
            console.warn(`Not enough ${itemId} in inventory.`);
            return false;
        }
    }

    if (save) {
        const inventoryDeltas: { [itemId: string]: number } = {};
        for (const [itemId, requiredQuantity] of Object.entries(items)) {
            inventoryDeltas[itemId] = -requiredQuantity;
        }
        await this.applyResourceChanges({ inventory: inventoryDeltas });
    } else {
        this.state.update(s => {
            if (!s) return null;
            const newInventory = { ...s.inventory };
            for (const [itemId, requiredQuantity] of Object.entries(items)) {
                const newQuantity = newInventory[itemId] - requiredQuantity;
                if (newQuantity > 0) {
                    newInventory[itemId] = newQuantity;
                } else {
                    delete newInventory[itemId];
                }
            }
            return { ...s, inventory: newInventory };
        });
    }

    return true;
  }

  async sellFromInventory(itemId: string, quantity: number, price: number): Promise<void> {
    const currentState = this.state();
    if (!currentState) return;
    
    const currentQuantity = currentState.inventory[itemId] || 0;
    if(currentQuantity < quantity) {
        console.error('Not enough items to sell.');
        return;
    }

    const earnings = quantity * price;

    await this.applyResourceChanges({
      coins: earnings,
      xp: earnings,
      inventory: { [itemId]: -quantity }
    });
  }
}
