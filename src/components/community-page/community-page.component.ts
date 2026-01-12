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
