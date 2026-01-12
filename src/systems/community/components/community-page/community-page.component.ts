import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityService } from '../../services/community.service';

@Component({
  selector: 'community-page',
  templateUrl: './community-page.component.html',
  imports: [CommonModule],
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