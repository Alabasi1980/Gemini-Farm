import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FarmTile } from '../../../../shared/types/game.types';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { CropService } from '../../services/crop.service';
import { GameClockService } from '../../../world/services/game-clock.service';
import { GridService } from '../../services/grid.service';

@Component({
  selector: 'app-plot', 
  templateUrl: './plot.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlotComponent {
  plot = input.required<FarmTile>();

  farmService = inject(FarmService);
  gridService = inject(GridService);
  cropService = inject(CropService);
  gameClockService = inject(GameClockService);
  
  plotInfo = computed(() => {
    this.gameClockService.gameTick(); 
    const season = this.gameClockService.currentSeason();
    const weather = this.gameClockService.currentWeather();
    
    const tile = this.plot();
    if (tile.state !== 'planted_plot' || !tile.cropId || !tile.plantTime) {
      return { growthPercent: 0, asset: '', isReady: false };
    }
    
    const crop = this.cropService.getCrop(tile.cropId);
    if (!crop) return { growthPercent: 0, asset: '', isReady: false };

    let growthRate = 1.0;
    growthRate *= crop.seasonModifiers[season] ?? 1.0;
    if (weather === 'Rainy') growthRate *= 1.2;
    if (weather === 'Snowy') growthRate *= 0.7;
    if (weather === 'Stormy') growthRate *= 0.5;
    if (weather === 'Sunny') growthRate *= 1.1;
    if (weather === 'Windy') growthRate *= 0.9;

    const effectiveGrowthTime = crop.growthTime / growthRate;
    const timeElapsed = Date.now() - tile.plantTime;
    const growthPercent = Math.min(100, (timeElapsed / effectiveGrowthTime) * 100);
    const isReady = growthPercent >= 100;

    let currentAsset = '';
    let timeIntoGrowth = 0;
    for (const stage of crop.growthStages) {
        timeIntoGrowth += (stage.duration / growthRate);
        if (timeElapsed < timeIntoGrowth || stage.duration === 0) {
            currentAsset = stage.asset;
            break;
        }
    }

    return { growthPercent, asset: currentAsset, isReady };
  });

  onClick(event: MouseEvent) {
    event.stopPropagation();
    const tile = this.plot();
    switch(tile.state) {
      case 'locked':
        this.gridService.requestExpansionPreview(tile);
        break;
      case 'empty_plot':
        this.farmService.openPickerForPlot(tile.id);
        break;
      case 'planted_plot':
        if (this.plotInfo().isReady) {
            this.gridService.harvestPlot(tile.id);
        }
        break;
    }
  }
}