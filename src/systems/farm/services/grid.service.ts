import { Injectable, signal, inject, computed, Injector } from '@angular/core';
import { FarmTile } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { CropService } from './crop.service';
import { GameClockService } from '../../world/services/game-clock.service';
import { ObservabilityService } from '../../../shared/services/observability.service';

// Export grid dimensions for use in other services
export const GRID_WIDTH = 31;
export const GRID_HEIGHT = 31;

// Grid and expansion constants
const START_AREA_SIZE = 7;
const START_OFFSET = Math.floor((GRID_WIDTH - START_AREA_SIZE) / 2);
const EXPANSION_BASE_COST = 800;
const EXPANSION_MULTIPLIER = 1.35;
const EXPANSION_CHUNK_SIZE = 7;

@Injectable({
  providedIn: 'root',
})
export class GridService {
  private cropService = inject(CropService);
  private gameClockService = inject(GameClockService);
  private observabilityService = inject(ObservabilityService);
  private injector = inject(Injector);

  private _gameStateService: GameStateService | null = null;
  private get gameStateService(): GameStateService {
    if (!this._gameStateService) this._gameStateService = this.injector.get(GameStateService);
    return this._gameStateService;
  }

  tiles = signal<FarmTile[]>([]);
  expansionPreview = signal<{ tiles: FarmTile[], cost: number, direction: 'up'|'down'|'left'|'right' } | null>(null);

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
    const expansionsPurchased = this.gameStateService.state()?.expansionsPurchased ?? 0;
    const cost = EXPANSION_BASE_COST * (EXPANSION_MULTIPLIER ** expansionsPurchased);
    return Math.round(cost / 10) * 10; // Round to nearest 10
  });

  canAffordExpansion = computed(() => (this.gameStateService.state()?.coins ?? 0) >= this.expansionCost());
  
  harvestablePlots = computed(() => {
    this.gameClockService.gameTick(); // Depend on global tick
    return this.tiles().filter(t => {
        if (t.state !== 'planted_plot' || !t.cropId || !t.plantTime) return false;
        const crop = this.cropService.getCrop(t.cropId);
        if (!crop) return false;
        const timeElapsed = Date.now() - t.plantTime;
        return timeElapsed >= crop.growthTime;
    });
  });

  constructor() {}

  public initializeState(tiles: FarmTile[] | undefined) {
    if (tiles) {
        this.tiles.set(tiles);
    } else {
        this.initializeGrid(); // For new players or on logout
    }
  }

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
      
      if (tile.x === bounds.minX - 1 && tile.y >= bounds.minY && tile.y <= bounds.maxY) {
          direction = 'left';
          const startY = Math.max(bounds.minY, tile.y - Math.floor(EXPANSION_CHUNK_SIZE/2));
          for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
              if(startY + i <= bounds.maxY) tilesToUnlock.push(this.tiles()[(startY + i) * GRID_WIDTH + (bounds.minX - 1)]);
          }
      } else if (tile.x === bounds.maxX + 1 && tile.y >= bounds.minY && tile.y <= bounds.maxY) {
          direction = 'right';
          const startY = Math.max(bounds.minY, tile.y - Math.floor(EXPANSION_CHUNK_SIZE/2));
          for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
              if(startY + i <= bounds.maxY) tilesToUnlock.push(this.tiles()[(startY + i) * GRID_WIDTH + (bounds.maxX + 1)]);
          }
      } else if (tile.y === bounds.minY - 1 && tile.x >= bounds.minX && tile.x <= bounds.maxX) {
          direction = 'up';
          const startX = Math.max(bounds.minX, tile.x - Math.floor(EXPANSION_CHUNK_SIZE/2));
          for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
               if(startX + i <= bounds.maxX) tilesToUnlock.push(this.tiles()[(bounds.minY - 1) * GRID_WIDTH + (startX + i)]);
          }
      } else if (tile.y === bounds.maxY + 1 && tile.x >= bounds.minX && tile.x <= bounds.maxX) {
          direction = 'down';
          const startX = Math.max(bounds.minX, tile.x - Math.floor(EXPANSION_CHUNK_SIZE/2));
           for (let i = 0; i < EXPANSION_CHUNK_SIZE; i++) {
              if(startX + i <= bounds.maxX) tilesToUnlock.push(this.tiles()[(bounds.maxY + 1) * GRID_WIDTH + (startX + i)]);
          }
      }

      if (tilesToUnlock.length > 0 && direction) {
          this.expansionPreview.set({ tiles: tilesToUnlock, cost: this.expansionCost(), direction });
      }
  }

  async confirmExpansion() {
      if (!this.canAffordExpansion() || !this.expansionPreview()) return;
      const cost = this.expansionCost();
      const tilesToUnlock = this.expansionPreview()!.tiles;
      const tileIdsToUnlock = new Set(tilesToUnlock.map(t => t.id));

      this.gameStateService.state.update(s => ({
          ...s!, 
          coins: s!.coins - cost,
          expansionsPurchased: s!.expansionsPurchased + 1,
      }));
      
      this.tiles.update(currentTiles => 
          currentTiles.map(t => tileIdsToUnlock.has(t.id) ? { ...t, state: 'free_space' } : t)
      );
      
      this.expansionPreview.set(null);
  }

  cancelExpansion() {
      this.expansionPreview.set(null);
  }

  async plantCrop(tileId: number, cropId: string) {
    const crop = this.cropService.getCrop(cropId);
    if (!crop || (this.gameStateService.state()?.coins ?? 0) < crop.plantCost) return;

    const currentSeason = this.gameClockService.currentSeason();
    if (!this.cropService.isCropInSeason(cropId, currentSeason)) {
        console.warn(`Attempted to plant ${cropId} which is out of season.`);
        return;
    }

    await this.gameStateService.applyResourceChanges({ coins: -crop.plantCost });
    
    this.tiles.update(tiles => tiles.map(t => 
        t.id === tileId 
            ? { ...t, state: 'planted_plot', cropId: cropId, plantTime: Date.now() } 
            : t
    ));
    
    const playerState = this.gameStateService.state();
    if (playerState && !playerState.milestones?.hasPlantedFirstCrop) {
        this.observabilityService.logEvent('first_plant', { cropId });
        this.gameStateService.state.update(s => ({ ...s!, milestones: { ...s!.milestones, hasPlantedFirstCrop: true } }));
    }
  }

  harvestPlot(tileId: number) {
      const tile = this.tiles().find(t => t.id === tileId);
      if (!tile || !tile.cropId) return;

      const harvestedCropId = tile.cropId;

      if (this.gameStateService.addToInventory(harvestedCropId, 1)) {
          this.tiles.update(tiles => tiles.map(t => {
              if (t.id === tileId) {
                  // Destructure to remove cropId and plantTime, then set the new state.
                  // This prevents 'undefined' values from being saved to Firestore.
                  const { cropId, plantTime, ...restOfTile } = t;
                  return { ...restOfTile, state: 'empty_plot' };
              }
              return t;
          }));

          const playerState = this.gameStateService.state();
          if (playerState && !playerState.milestones?.hasHarvestedFirstCrop) {
              this.observabilityService.logEvent('first_harvest', { cropId: harvestedCropId });
              this.gameStateService.state.update(s => ({ ...s!, milestones: { ...s!.milestones, hasHarvestedFirstCrop: true } }));
          }
      }
  }
}
