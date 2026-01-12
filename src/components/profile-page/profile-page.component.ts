import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'profile-page',
  template: `
    <div class="p-8">
      <h1 class="text-3xl font-bold text-indigo-400">Profile & Settings</h1>
      <p class="mt-2 text-gray-300">Manage your account and game settings.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {}
