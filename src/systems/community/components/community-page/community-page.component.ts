import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityService } from '../../services/community.service';

@Component({
  selector: 'community-page',
  templateUrl: './community-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPageComponent implements OnInit {
  communityService = inject(CommunityService);
  leaderboard = this.communityService.leaderboard;
  loading = this.communityService.loading;
  error = this.communityService.error;

  ngOnInit() {
    this.communityService.loadLeaderboard();
  }

  getRankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }
}