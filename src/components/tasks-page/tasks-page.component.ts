<<<<<<< HEAD
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { ItemService } from '../../services/item.service';
import { GameTask, TaskState } from '../../types/game.types';

interface DisplayTask extends GameTask {
    state: TaskState;
    targetItemAsset: string;
}

@Component({
  selector: 'tasks-page',
  templateUrl: './tasks-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPageComponent {
    taskService = inject(TaskService);
    itemService = inject(ItemService);
    
    // Expose signals to the template
    tasks = this.taskService.tasks;
    loading = this.taskService.loading;
    error = this.taskService.error;

    displayTasks = computed<DisplayTask[]>(() => {
        const currentTasks = this.tasks();
        const states = this.taskService.taskStates();

        if (!states.size || currentTasks.length === 0) return [];

        return currentTasks.map(task => ({
            ...task,
            state: states.get(task.id)!,
            targetItemAsset: this.itemService.getItem(task.targetItemId)?.asset || '?'
        }));
    });

    generateTasks() {
        this.taskService.fetchNewTasks();
    }

    claim(taskId: string) {
        this.taskService.claimReward(taskId);
    }
}
=======
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
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
