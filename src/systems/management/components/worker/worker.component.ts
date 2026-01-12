import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Worker } from '../../../../shared/types/game.types';

@Component({
  selector: 'app-worker',
  templateUrl: './worker.component.html',
  host: {
    '[style.grid-column-start]': 'positionStyles().gridColumnStart',
    '[style.grid-row-start]': 'positionStyles().gridRowStart',
    '[style.z-index]': 'positionStyles().zIndex',
    '[class.transition-all]': 'true',
    '[class.duration-1000]': 'true',
    '[class.ease-in-out]': 'true',
  }
})
export class WorkerComponent {
  worker = input.required<Worker>();

  positionStyles = computed(() => {
    const w = this.worker();
    return {
      gridColumnStart: w.x + 1,
      gridRowStart: w.y + 1,
      zIndex: 100 + w.y, // Ensure workers are rendered on top
    };
  });
}