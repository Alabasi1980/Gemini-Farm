import { Injectable, signal, inject, computed } from '@angular/core';
import { FarmObject, Plot } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { CropService } from './crop.service';
import { ObjectService } from './object.service';

const GRID_WIDTH = 12;
const GRID_HEIGHT = 10;
const INITIAL_UNLOCKED_PLOTS = 20;
const PLOTS_PER_EXPANSION = 5;

@Injectable({
  providedIn: 'root',
})
export class FarmService {
  gameStateService = inject(GameStateService);
  cropService = inject(CropService);
  objectService = inject(ObjectService);

  // State
  plots = signal<Plot[]>([]);
  placedObjects = signal<FarmObject[]>([]);
  gameTick = signal<number>(Date.now());
  
  // UI State
  activePickerPlotId = signal<number | null>(null);
  activeFactoryId = signal<number | null>(null);
  draggingState = signal<{
    object: FarmObject; // A copy of the object at drag start
    originalX: number;
    originalY: number;
    validPosition: boolean;
    currentX: number; // current grid X
    currentY: number; // current grid Y
    offsetX: number; // mouse offset within the element
    offsetY: number;
  } | null>(null);

  private nextInstanceId = signal(0);
  
  // Computed State
  unlockedPlotCount = computed(() => this.plots().filter(p => p.state !== 'locked').length);

  expansionCost = computed(() => {
    // FIX: Corrected typo from `unlockedCount` to `unlockedPlotCount`.
    const unlockedCount = this.unlockedPlotCount();
    return 100 * Math.floor(unlockedCount / PLOTS_PER_EXPANSION) ** 2 + 250;
  });

  canAffordExpansion = computed(() => this.gameStateService.state().coins >= this.expansionCost());
  
  harvestablePlots = computed(() => {
    this.gameTick(); // Depend on tick
    return this.plots().filter(p => {
        if (p.state !== 'planted' || !p.cropId || !p.plantTime) return false;
        const crop = this.cropService.getCrop(p.cropId);
        if (!crop) return false;
        const timeElapsed = Date.now() - p.plantTime;
        return timeElapsed >= crop.growthTime;
    });
  });

  // Lifecycle
  constructor() {
    this.initializeGrid();
    setInterval(() => this.gameTick.set(Date.now()), 1000);
  }

  // Grid & Plot Methods
  private initializeGrid() {
    const grid: Plot[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const id = y * GRID_WIDTH + x;
        const isUnlocked = id < INITIAL_UNLOCKED_PLOTS;
        grid.push({ id, x, y, state: isUnlocked ? 'empty' : 'locked' });
      }
    }
    this.plots.set(grid);
  }

  unlockNextPlots() {
    if (!this.canAffordExpansion()) return;
    this.gameStateService.state.update(s => ({...s, coins: s.coins - this.expansionCost()}));
    this.plots.update(currentPlots => {
        const plotsToUnlock = currentPlots.filter(p => p.state === 'locked').slice(0, PLOTS_PER_EXPANSION);
        const plotIdsToUnlock = new Set(plotsToUnlock.map(p => p.id));
        return currentPlots.map(p => plotIdsToUnlock.has(p.id) ? { ...p, state: 'empty' } : p);
    });
  }

  // Crop Methods
  plantCrop(plotId: number, cropId: string) {
    const crop = this.cropService.getCrop(cropId);
    if (!crop || this.gameStateService.state().coins < crop.plantCost) return;

    this.gameStateService.state.update(s => ({...s, coins: s.coins - crop.plantCost}));
    this.plots.update(plots => plots.map(p => 
        p.id === plotId 
            ? { ...p, state: 'planted', cropId: cropId, plantTime: Date.now() } 
            : p
    ));
    this.activePickerPlotId.set(null);
  }

  harvestPlot(plotId: number) {
      const plot = this.plots().find(p => p.id === plotId);
      if (!plot || !plot.cropId) return;

      if (this.gameStateService.addToInventory(plot.cropId, 1)) {
          this.plots.update(plots => plots.map(p => 
              p.id === plotId
                  ? { ...p, state: 'empty', cropId: undefined, plantTime: undefined }
                  : p
          ));
      }
  }

  openPickerForPlot(plotId: number) { this.activePickerPlotId.set(plotId); }
  closePicker() { this.activePickerPlotId.set(null); }

  openRecipePickerForFactory(instanceId: number) { this.activeFactoryId.set(instanceId); }
  closeRecipePicker() { this.activeFactoryId.set(null); }

  // Placeable Object Methods
  buyObject(itemId: string) {
    const item = this.objectService.getItem(itemId);
    if (!item || this.gameStateService.state().coins < item.cost) return;

    // Find first available spot
    for (let y = 0; y <= GRID_HEIGHT - item.height; y++) {
      for (let x = 0; x <= GRID_WIDTH - item.width; x++) {
        const newObj: FarmObject = { instanceId: -1, itemId, x, y };
        if (this.isPositionValid(newObj)) {
          this.gameStateService.state.update(s => ({ ...s, coins: s.coins - item.cost }));
          const instanceId = this.nextInstanceId();
          this.placedObjects.update(objs => [...objs, { ...newObj, instanceId }]);
          this.nextInstanceId.update(id => id + 1);
          return;
        }
      }
    }
    console.warn("No available space to place the object.");
  }

  isPositionValid(objectToPlace: FarmObject, ignoreInstanceId?: number): boolean {
    const item = this.objectService.getItem(objectToPlace.itemId);
    if (!item) return false;

    // 1. Bounds Check (ensure all tiles it covers are unlocked)
    for (let y = objectToPlace.y; y < objectToPlace.y + item.height; y++) {
      for (let x = objectToPlace.x; x < objectToPlace.x + item.width; x++) {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
        const plot = this.plots()[y * GRID_WIDTH + x];
        if (!plot || plot.state === 'locked') return false;
      }
    }

    // 2. Collision Check with other objects (AABB)
    for (const existingObj of this.placedObjects()) {
      if (existingObj.instanceId === ignoreInstanceId) continue;
      
      const existingItem = this.objectService.getItem(existingObj.itemId);
      if (!existingItem) continue;

      if (
        objectToPlace.x < existingObj.x + existingItem.width &&
        objectToPlace.x + item.width > existingObj.x &&
        objectToPlace.y < existingObj.y + existingItem.height &&
        objectToPlace.y + item.height > existingObj.y
      ) {
        return false; // Collision detected
      }
    }

    return true;
  }

  // Drag and Drop Handlers
  startDrag(instanceId: number, event: MouseEvent) {
    const object = this.placedObjects().find(o => o.instanceId === instanceId);
    if (!object) return;

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.draggingState.set({
      object: { ...object },
      originalX: object.x,
      originalY: object.y,
      currentX: object.x,
      currentY: object.y,
      validPosition: true,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  }

  handleDrag(event: MouseEvent, farmGridElement: HTMLElement) {
    const state = this.draggingState();
    if (!state) return;

    const gridRect = farmGridElement.getBoundingClientRect();
    const cellWidth = gridRect.width / GRID_WIDTH;
    const cellHeight = gridRect.height / GRID_HEIGHT;
    
    const x = event.clientX - gridRect.left - state.offsetX;
    const y = event.clientY - gridRect.top - state.offsetY;

    const gridX = Math.round(x / cellWidth);
    const gridY = Math.round(y / cellHeight);

    const updatedObject = { ...state.object, x: gridX, y: gridY };
    const isValid = this.isPositionValid(updatedObject, updatedObject.instanceId);

    this.draggingState.update(s => s ? { ...s, currentX: gridX, currentY: gridY, validPosition: isValid } : null);
  }

  endDrag() {
    const state = this.draggingState();
    if (!state) return;

    if (state.validPosition) {
      // Finalize move
      this.placedObjects.update(objs => objs.map(o => 
        o.instanceId === state.object.instanceId ? { ...o, x: state.currentX, y: state.currentY } : o
      ));
    }
    // else it reverts visually automatically by clearing the drag state.
    
    this.draggingState.set(null);
  }
}