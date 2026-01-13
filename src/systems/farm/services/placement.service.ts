import { Injectable, signal, inject } from '@angular/core';
import { FarmObject } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { ObjectService } from './object.service';
import { GridService, GRID_WIDTH, GRID_HEIGHT } from './grid.service';

@Injectable({
  providedIn: 'root',
})
export class PlacementService {
  private gameStateService = inject(GameStateService);
  private objectService = inject(ObjectService);
  private gridService = inject(GridService);

  placedObjects = signal<FarmObject[]>([]);
  private nextInstanceId = signal(0);
  
  constructor() {}

  public initializeState(objects: FarmObject[] | undefined) {
    if (objects && objects.length > 0) {
        this.placedObjects.set(objects);
        const maxId = Math.max(...objects.map(o => o.instanceId));
        this.nextInstanceId.set(maxId + 1);
    } else {
        this.placedObjects.set([]);
        this.nextInstanceId.set(0);
    }
  }

  buyObject(itemId: string) {
    const item = this.objectService.getItem(itemId);
    if (!item || (this.gameStateService.state()?.coins ?? 0) < item.cost) return;

    // Find first available spot on unlocked land
    const unlockedBounds = this.gridService.unlockedBounds();
    for (let y = unlockedBounds.minY; y <= unlockedBounds.maxY - (item.height-1); y++) {
      for (let x = unlockedBounds.minX; x <= unlockedBounds.maxX - (item.width-1); x++) {
        const newObj: FarmObject = { instanceId: -1, itemId, x, y };
        if (this.isPositionValid(newObj)) {
          this.gameStateService.state.update(s => ({ ...s!, coins: s!.coins - item.cost }));
          
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
        const tile = this.gridService.tiles()[y * GRID_WIDTH + x];
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

  updateObjectPosition(instanceId: number, x: number, y: number) {
      this.placedObjects.update(objs => objs.map(o => 
        o.instanceId === instanceId ? { ...o, x, y } : o
      ));
  }
}
