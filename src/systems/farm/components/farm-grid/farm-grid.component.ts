import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { PlotComponent } from '../plot/plot.component';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';
import { WorkerService } from '../../../management/services/worker.service';
import { WorkerComponent } from '../../../management/components/worker/worker.component';

@Component({
  selector: 'app-farm-grid',
  templateUrl: './farm-grid.component.html',
  styleUrl: './farm-grid.component.css',
  imports: [CommonModule, PlotComponent, PlaceableObjectComponent, WorkerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmGridComponent {
  farmService = inject(FarmService);
  workerService = inject(WorkerService);
  
  plots = this.farmService.plots;
  placedObjects = this.farmService.placedObjects;
  workers = this.workerService.workers;
}