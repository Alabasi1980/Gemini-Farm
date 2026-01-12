import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, PlayerAdminView } from '../../services/admin.service';
import { FormsModule } from '@angular/forms';
import { ContentManagementComponent } from '../content-management/content-management.component';

type ModalMode = 'coins' | 'xp';
type AdminView = 'players' | 'content';

@Component({
  selector: 'management-page',
  templateUrl: './management-page.component.html',
  imports: [CommonModule, FormsModule, ContentManagementComponent],
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
