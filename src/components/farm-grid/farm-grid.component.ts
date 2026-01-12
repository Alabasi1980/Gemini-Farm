import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { PlotComponent } from '../plot/plot.component';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';

@Component({
  selector: 'app-farm-grid',
  templateUrl: './farm-grid.component.html',
  imports: [CommonModule, PlotComponent, PlaceableObjectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmGridComponent {
  farmService = inject(FarmService);
  plots = this.farmService.plots;
  placedObjects = this.farmService.placedObjects;
}
