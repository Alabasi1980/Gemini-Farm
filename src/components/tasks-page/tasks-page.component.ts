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
