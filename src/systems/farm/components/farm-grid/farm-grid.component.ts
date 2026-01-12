import { ChangeDetectionStrategy, Component, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { PlotComponent } from '../plot/plot.component';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';
import { WorkerService } from '../../../management/services/worker.service';
import { WorkerComponent } from '../../../management/components/worker/worker.component';
// FIX: Import services that now hold farm grid state.
import { GridService } from '../../services/grid.service';
import { PlacementService } from '../../services/placement.service';

@Component({
  selector: 'app-farm-grid',
  templateUrl: './farm-grid.component.html',
  imports: [CommonModule, PlotComponent, PlaceableObjectComponent, WorkerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmGridComponent {
  farmService = inject(FarmService);
  workerService = inject(WorkerService);
  private gridService = inject(GridService);
  private placementService = inject(PlacementService);
  
  // FIX: Property 'tiles' does not exist on type 'FarmService'. It has been moved to GridService.
  plots = this.gridService.tiles;
  // FIX: Property 'placedObjects' does not exist on type 'FarmService'. It has been moved to PlacementService.
  placedObjects = this.placementService.placedObjects;
  workers = this.workerService.workers;
  
  elementRef = inject(ElementRef);
}
