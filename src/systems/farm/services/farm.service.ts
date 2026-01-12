import { Injectable, signal, inject, computed } from '@angular/core';
import { FarmObject, FarmTile } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { CropService } from './crop.service';
import { ObjectService } from './object.service';

// Large grid for an expansive feel
const GRID_WIDTH = 31;
const GRID_HEIGHT = 31;

// Initial 7x7 unlocked area
const START_AREA_SIZE = 7;
const START_OFFSET = Math.floor((GRID_WIDTH - START_AREA_SIZE) / 2); // Center the area

// Expansion cost formula constants
const EXPANSION_BASE_COST = 800;
const EXPANSION_MULTIPLIER = 1.35;
const EXPANSION_CHUNK_SIZE = 7;


@Injectable({
  providedIn: 'root',
})
export class FarmService {
  gameStateService = inject(GameStateService);
  cropService = inject(CropService);
  objectService = inject(ObjectService);

  // State
  tiles = signal<FarmTile[]>([]);
  placedObjects = signal<FarmObject[]>([]);
  gameTick = signal<number>(Date.now());
  
  // UI State
  activePickerPlotId = signal<number | null>(null);
  activeFactoryId = signal<number | null>(null);
  selectedObjectInstanceId = signal<number | null>(null);
  expansionPreview = signal<{ tiles: FarmTile[], cost: number, direction: 'up'|'down'|'left'|'right' } | null>(null);

  draggingState = signal<{
    object: FarmObject;
    originalX: number;
    originalY: number;
    validPosition: boolean;
    currentX: number;
    currentY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  private nextInstanceId = signal(0);
  
  // Computed State
  unlockedBounds = computed(() => {
    const unlocked = this.tiles().filter(t => t.state !== 'locked');
    if (unlocked.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    let minX = GRID_WIDTH, maxX = 0, minY = GRID_HEIGHT, maxY = 0;
    for (const tile of unlocked) {
        if (tile.x < minX) minX = tile.x;
        if (tile.x > maxX) maxX = tile.x;
        if (tile.y < minY) minY = tile.y;
        if (tile.y > maxY) maxY = tile.y;
    }
    return { minX, maxX, minY, maxY };
  });

  expansionCost = computed(() => {
    const expansionsPurchased = this.gameStateService.state().expansionsPurchased;
    const cost = EXPANSION_BASE_COST * (EXPANSION_MULTIPLIER ** expansionsPurchased);
    return Math.round(cost / 10) * 10; // Round to nearest 10
  });

  canAffordExpansion = computed(() => this.gameStateService.state().coins >= this.expansionCost());
  
  harvestablePlots = computed(() => {
    this.gameTick(); // Depend on tick
    return this.tiles().filter(t => {
        if (t.state !== 'planted_plot' || !t.cropId || !t.plantTime) return false;
        const crop = this.cropService.getCrop(t.cropId);
        if (!crop) return false;
        const timeElapsed = Date.now() - t.plantTime;
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
    const grid: FarmTile[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const id = y * GRID_WIDTH + x;
        const isUnlocked = x >= START_OFFSET && x < START_OFFSET + START_AREA_SIZE &&
                           y >= START_OFFSET && y < START_OFFSET + START_AREA_SIZE;
        grid.push({ id, x, y, state: isUnlocked ? 'free_space' : 'locked' });
      }
    }
    
    // Place initial features
    // 5 farm plots
    grid[(START_OFFSET + 1) * GRID_WIDTH + (START_OFFSET + 2)].state = 'empty_plot';
    grid[(START_OFFSET + 1) * GRID_WIDTH + (START_OFFSET + 3)].state = 'empty_plot';
    grid[(START_OFFSET + 1) * GRID_WIDTH + (START_OFFSET + 4)].state = 'empty_plot';
    grid[(START_OFFSET + 2) * GRID_WIDTH + (START_OFFSET + 2)].state = 'empty_plot';
    grid[(START_OFFSET + 2) * GRID_WIDTH + (START_OFFSET + 4)].state = 'empty_plot';

    this.tiles.set(grid);
  }

  requestExpansionPreview(tile: FarmTile) {
      if (tile.state !== 'locked') return;
      const bounds = this.unlockedBounds();
      let tilesToUnlock: FarmTile[] = [];
      let direction: 'up'|'down'|'left'|'right' | null = null;
      
      // Determine direction and tiles
      if (tile.x === bounds.minX - 1 && tile.y >= bounds.minY && tile.y <= bounds.maxY) {
          direction = 'left';
          for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
              tilesToUnlock.push(this.tiles()[(bounds.minY + i) * GRID_WIDTH + (bounds.minX - 1)]);
          }
      } else if (tile.x === bounds.maxX + 1 && tile.y >= bounds.minY && tile.y <= bounds.maxY) {
          direction = 'right';
          for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
              tilesToUnlock.push(this.tiles()[(bounds.minY + i) * GRID_WIDTH + (bounds.maxX + 1)]);
          }
      } else if (tile.y === bounds.minY - 1 && tile.x >= bounds.minX && tile.x <= bounds.maxX) {
          direction = 'up';
          for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
              tilesToUnlock.push(this.tiles()[(bounds.minY - 1) * GRID_WIDTH + (bounds.minX + i)]);
          }
      } else if (tile.y === bounds.maxY + 1 && tile.x >= bounds.minX && tile.x <= bounds.maxX) {
          direction = 'down';
           for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
              tilesToUnlock.push(this.tiles()[(bounds.maxY + 1) * GRID_WIDTH + (bounds.minX + i)]);
          }
      }

      if (tilesToUnlock.length > 0 && direction) {
          this.expansionPreview.set({ tiles: tilesToUnlock, cost: this.expansionCost(), direction });
      }
  }

  confirmExpansion() {
      if (!this.canAffordExpansion() || !this.expansionPreview()) return;
      const cost = this.expansionCost();
      const tilesToUnlock = this.expansionPreview()!.tiles;
      const tileIdsToUnlock = new Set(tilesToUnlock.map(t => t.id));

      // 1. Deduct cost & increment counter
      this.gameStateService.state.update(s => ({
          ...s, 
          coins: s.coins - cost,
          expansionsPurchased: s.expansionsPurchased + 1,
      }));

      // 2. Update tiles
      this.tiles.update(currentTiles => 
          currentTiles.map(t => tileIdsToUnlock.has(t.id) ? { ...t, state: 'free_space' } : t)
      );
      
      // 3. Close preview
      this.expansionPreview.set(null);
  }

  cancelExpansion() {
      this.expansionPreview.set(null);
  }

  // Crop Methods
  plantCrop(tileId: number, cropId: string) {
    const crop = this.cropService.getCrop(cropId);
    if (!crop || this.gameStateService.state().coins < crop.plantCost) return;

    this.gameStateService.state.update(s => ({...s, coins: s.coins - crop.plantCost}));
    this.tiles.update(tiles => tiles.map(t => 
        t.id === tileId 
            ? { ...t, state: 'planted_plot', cropId: cropId, plantTime: Date.now() } 
            : t
    ));
    this.activePickerPlotId.set(null);
  }

  harvestPlot(tileId: number) {
      const tile = this.tiles().find(t => t.id === tileId);
      if (!tile || !tile.cropId) return;

      if (this.gameStateService.addToInventory(tile.cropId, 1)) {
          this.tiles.update(tiles => tiles.map(t => 
              t.id === tileId
                  ? { ...t, state: 'empty_plot', cropId: undefined, plantTime: undefined }
                  : t
          ));
      }
  }

  openPickerForPlot(tileId: number) { this.activePickerPlotId.set(tileId); }
  closePicker() { this.activePickerPlotId.set(null); }

  openRecipePickerForFactory(instanceId: number) { this.activeFactoryId.set(instanceId); }
  closeRecipePicker() { this.activeFactoryId.set(null); }

  // Object Selection
  selectObject(instanceId: number) {
    this.selectedObjectInstanceId.set(instanceId);
  }

  deselectObject() {
    this.selectedObjectInstanceId.set(null);
  }

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

    // 1. Bounds Check (ensure all tiles it covers are on buildable land)
    for (let y = objectToPlace.y; y < objectToPlace.y + item.height; y++) {
      for (let x = objectToPlace.x; x < objectToPlace.x + item.width; x++) {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
        const tile = this.tiles()[y * GRID_WIDTH + x];
        if (!tile || tile.state === 'locked' || tile.state === 'empty_plot' || tile.state === 'planted_plot') return false;
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
  startDrag(instanceId: number, event: MouseEvent, objectElement: HTMLElement) {
    const object = this.placedObjects().find(o => o.instanceId === instanceId);
    if (!object) return;

    const rect = objectElement.getBoundingClientRect();

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
    
    this.draggingState.set(null);
    this.deselectObject();
  }
}