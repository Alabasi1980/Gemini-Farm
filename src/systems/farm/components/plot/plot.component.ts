import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Plot } from '../../../../shared/types/game.types';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { CropService } from '../../services/crop.service';
import { GameClockService } from '../../../world/services/game-clock.service';

@Component({
  selector: 'app-plot',
  templateUrl: './plot.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlotComponent {
  plot = input.required<Plot>();

  farmService = inject(FarmService);
  cropService = inject(CropService);
  gameClockService = inject(GameClockService);
  
  showTooltip = signal(false);
  
  plotInfo = computed(() => {
    // Depend on game tick, season, and weather for re-computation
    this.farmService.gameTick(); 
    const season = this.gameClockService.currentSeason();
    const weather = this.gameClockService.currentWeather();
    
    const plot = this.plot();
    if (plot.state !== 'planted' || !plot.cropId || !plot.plantTime) {
      return { growthPercent: 0, asset: '', isReady: false };
    }
    
    const crop = this.cropService.getCrop(plot.cropId);
    if (!crop) return { growthPercent: 0, asset: '', isReady: false };

    // Calculate growth modifiers
    let growthRate = 1.0;
    // Season modifier
    growthRate *= crop.seasonModifiers[season] ?? 1.0;
    // Weather modifier
    if (weather === 'Rainy') growthRate *= 1.2; // +20%
    if (weather === 'Snowy') growthRate *= 0.7; // -30%
    if (weather === 'Stormy') growthRate *= 0.5; // -50%
    if (weather === 'Sunny') growthRate *= 1.1; // +10%

    const effectiveGrowthTime = crop.growthTime / growthRate;
    const timeElapsed = Date.now() - plot.plantTime;
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

  onClick() {
    const p = this.plot();
    if (p.state === 'locked') {
      this.triggerTooltip();
    } else if (p.state === 'empty') {
      this.farmService.openPickerForPlot(p.id);
    } else if (p.state === 'planted' && this.plotInfo().isReady) {
      this.farmService.harvestPlot(p.id);
    }
  }

  private triggerTooltip() {
    this.showTooltip.set(true);
    setTimeout(() => this.showTooltip.set(false), 2000);
  }
}