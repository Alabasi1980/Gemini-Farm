import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, PlayerAdminView } from '../../services/admin.service';
import { FormsModule } from '@angular/forms';
import { ContentManagementComponent } from '../content-management/content-management.component';
import { AuditLogComponent } from '../audit-log/audit-log.component';
import { ObservabilityPageComponent } from '../observability-page/observability-page.component';

type ModalMode = 'coins' | 'xp';
type AdminView = 'players' | 'content' | 'audit' | 'observability';

@Component({
  selector: 'management-page',
  templateUrl: './management-page.component.html',
  imports: [CommonModule, FormsModule, ContentManagementComponent, AuditLogComponent, ObservabilityPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementPageComponent implements OnInit {
  adminService = inject(AdminService);

  players = this.adminService.players;
  loading = this.adminService.loading;
  error = this.adminService.error;

  // View State
  activeView = signal<AdminView>('players');

  // Modal State
  isModalOpen = signal(false);
  modalMode = signal<ModalMode>('coins');
  selectedPlayer = signal<PlayerAdminView | null>(null);
  amountToAdd = signal(100);

  ngOnInit() {
    this.adminService.loadAllPlayers();
  }

  setView(view: AdminView) {
    this.activeView.set(view);
    if (view === 'audit') {
        this.adminService.loadAuditLogs();
    } else if (view === 'players' && this.players().length === 0) {
        this.adminService.loadAllPlayers();
    } else if (view === 'observability') {
        this.adminService.loadErrorLogs();
        this.adminService.loadAnalyticsEvents();
    }
  }

  openModal(player: PlayerAdminView, mode: ModalMode) {
    this.selectedPlayer.set(player);
    this.modalMode.set(mode);
    this.amountToAdd.set(mode === 'coins' ? 1000 : 500);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPlayer.set(null);
  }

  async confirmAction() {
    const player = this.selectedPlayer();
    const amount = this.amountToAdd();
    if (!player || amount <= 0) return;

    if (this.modalMode() === 'coins') {
      await this.adminService.giveCoins(player.uid, amount);
    } else {
      await this.adminService.giveXp(player.uid, amount);
    }

    this.closeModal();
  }
}