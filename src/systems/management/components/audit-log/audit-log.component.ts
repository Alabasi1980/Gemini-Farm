import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogComponent {
  adminService = inject(AdminService);
  logs = this.adminService.auditLogs;
  loading = this.adminService.loading;
  error = this.adminService.error;

  formatTimestamp(timestamp: { seconds: number; nanoseconds: number }): Date {
    if (!timestamp) return new Date();
    return new Date(timestamp.seconds * 1000);
  }
}