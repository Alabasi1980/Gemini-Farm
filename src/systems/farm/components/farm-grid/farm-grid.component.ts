import { ChangeDetectionStrategy, Component, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlotComponent } from '../plot/plot.component';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';
import { WorkerService } from '../../../management/services/worker.service';
import { WorkerComponent } from '../../../management/components/worker/worker.component';
import { GridService } from '../../services/grid.service';
import { PlacementService } from '../../services/placement.service';

@Component({
  selector: 'app-farm-grid',
  templateUrl: './farm-grid.component.html',
  imports: [CommonModule, PlotComponent, PlaceableObjectComponent, WorkerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmGridComponent {
  workerService = inject(WorkerService);
  private gridService = inject(GridService);
  private placementService = inject(PlacementService);
  
  plots = this.gridService.tiles;
  placedObjects = this.placementService.placedObjects;
  workers = this.workerService.workers;
  
  elementRef = inject(ElementRef);
}