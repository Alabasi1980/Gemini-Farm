import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkerService } from '../../services/worker.service';
import { Worker } from '../../types/game.types';

@Component({
  selector: 'management-page',
  templateUrl: './management-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementPageComponent {
  workerService = inject(WorkerService);

  workers = this.workerService.workers;
  logs = this.workerService.actionLogs;

  toggleWorker(workerId: string) {
    this.workerService.toggleWorker(workerId);
  }
}
