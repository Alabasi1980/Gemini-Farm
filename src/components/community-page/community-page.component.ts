<<<<<<< HEAD
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityService } from '../../services/community.service';

@Component({
  selector: 'community-page',
  templateUrl: './community-page.component.html',
  imports: [CommonModule],
  // FIX: Corrected typo in ChangeDetectionStrategy.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPageComponent {
  communityService = inject(CommunityService);
  leaderboard = this.communityService.leaderboard;

  getRankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }
}
=======
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'community-page',
  template: `
    <div class="p-8">
      <h1 class="text-3xl font-bold text-teal-400">Community</h1>
      <p class="mt-2 text-gray-300">Visit friends and check the leaderboards.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPageComponent {}
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
