import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { AdminService } from '../../services/admin.service';

type LogView = 'errors' | 'events';

@Component({
  selector: 'app-observability-page',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  templateUrl: './observability-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservabilityPageComponent {
  adminService = inject(AdminService);
  
  errorLogs = this.adminService.errorLogs;
  analyticsEvents = this.adminService.analyticsEvents;
  loading = this.adminService.loading;
  error = this.adminService.error;

  activeView = signal<LogView>('errors');

  setView(view: LogView) {
    this.activeView.set(view);
  }

  formatTimestamp(timestamp: { seconds: number; nanoseconds: number }): Date {
    if (!timestamp) return new Date();
    return new Date(timestamp.seconds * 1000);
  }
}
