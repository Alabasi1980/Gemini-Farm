import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Plot } from '../../types/game.types';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { CropService } from '../../services/crop.service';

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
  
  showTooltip = signal(false);
  gameTick = this.farmService.gameTick; // Subscribe to game tick

  plotInfo = computed(() => {
    this.gameTick(); // Re-run computation on each tick
    const plot = this.plot();
    if (plot.state !== 'planted' || !plot.cropId || !plot.plantTime) {
      return { growthPercent: 0, asset: '', isReady: false };
    }
    
    const crop = this.cropService.getCrop(plot.cropId);
    if (!crop) return { growthPercent: 0, asset: '', isReady: false };

    const timeElapsed = Date.now() - plot.plantTime;
    const growthPercent = Math.min(100, (timeElapsed / crop.growthTime) * 100);
    const isReady = growthPercent >= 100;

    let currentAsset = '';
    let timeIntoGrowth = 0;
    for (const stage of crop.growthStages) {
        timeIntoGrowth += stage.duration;
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
