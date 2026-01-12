import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FarmService } from '../../services/farm.service';
import { PlotComponent } from '../plot/plot.component';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';
<<<<<<< HEAD
import { WorkerService } from '../../services/worker.service';
import { WorkerComponent } from '../worker/worker.component';
=======
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396

@Component({
  selector: 'app-farm-grid',
  templateUrl: './farm-grid.component.html',
<<<<<<< HEAD
  imports: [CommonModule, PlotComponent, PlaceableObjectComponent, WorkerComponent],
=======
  imports: [CommonModule, PlotComponent, PlaceableObjectComponent],
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmGridComponent {
  farmService = inject(FarmService);
<<<<<<< HEAD
  workerService = inject(WorkerService);
  
  plots = this.farmService.plots;
  placedObjects = this.farmService.placedObjects;
  workers = this.workerService.workers;
}
=======
  plots = this.farmService.plots;
  placedObjects = this.farmService.placedObjects;
}
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
