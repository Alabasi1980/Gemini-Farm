import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tasks-page',
  template: `
    <div class="p-8">
      <h1 class="text-3xl font-bold text-purple-400">Tasks</h1>
      <p class="mt-2 text-gray-300">Complete daily tasks for rewards.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPageComponent {}
