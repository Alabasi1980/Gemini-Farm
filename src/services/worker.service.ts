import { Injectable, signal, inject, effect } from '@angular/core';
import { ActionLog, Worker } from '../types/game.types';
import { FarmService } from './farm.service';
import { AnimalService } from './animal.service';
import { FactoryService } from './factory.service';
import { ItemService } from './item.service';

const INITIAL_WORKERS: Worker[] = [
    {
        id: 'harvester-1',
        name: 'Harvester Bot',
        asset: '🤖',
        status: 'Idle',
        active: false,
        x: 5,
        y: 5,
    }
];

const WORKER_TICK_INTERVAL = 3000; // 3 seconds

@Injectable({ providedIn: 'root' })
export class WorkerService {
    farmService = inject(FarmService);
    animalService = inject(AnimalService);
    factoryService = inject(FactoryService);
    itemService = inject(ItemService);

    workers = signal<Worker[]>(INITIAL_WORKERS);
    actionLogs = signal<ActionLog[]>([]);

    constructor() {
        // Main worker logic loop
        effect(() => {
            this.farmService.gameTick(); // Depend on the game tick
            
            const activeWorkers = this.workers().filter(w => w.active);
            if (activeWorkers.length === 0) return;
            
            // This logic runs every second, but we only want workers to act periodically.
            // Using a simple timeout for each worker to avoid complex state management.
            for (const worker of activeWorkers) {
                if (worker.status === 'Idle') {
                   this.findAndPerformTask(worker.id);
                }
            }
        }, { allowSignalWrites: true });
    }

    toggleWorker(workerId: string) {
        this.workers.update(workers => 
            workers.map(w => w.id === workerId ? { ...w, active: !w.active, status: w.active ? 'Idle' : w.status } : w)
        );
        if (!this.workers().find(w => w.id === workerId)?.active) {
             this.logAction(`Deactivated ${this.workers().find(w => w.id === workerId)?.name}.`);
        } else {
            this.logAction(`Activated ${this.workers().find(w => w.id === workerId)?.name}.`);
        }
    }

    private findAndPerformTask(workerId: string) {
        // Prioritize tasks: Harvest > Animal Collect > Factory Collect
        const harvestable = this.farmService.harvestablePlots();
        if (harvestable.length > 0) {
            const plot = harvestable[0];
            const cropName = this.itemService.getItem(plot.cropId!)?.name || 'crop';
            this.updateWorkerState(workerId, { status: 'Moving', x: plot.x, y: plot.y });

            setTimeout(() => {
                this.farmService.harvestPlot(plot.id);
                this.logAction(`Harvested ${cropName} at (${plot.x}, ${plot.y}).`);
                this.updateWorkerState(workerId, { status: 'Idle' });
            }, 1000); // 1s move time
            return;
        }

        const collectableAnimals = this.animalService.collectableBuildings();
        if (collectableAnimals.length > 0) {
            const building = collectableAnimals[0];
            const buildingName = this.itemService.getItem(building.itemId)?.name || 'building';
            this.updateWorkerState(workerId, { status: 'Moving', x: building.x, y: building.y });

            setTimeout(() => {
                this.animalService.collect(building.instanceId);
                this.logAction(`Collected from ${buildingName} at (${building.x}, ${building.y}).`);
                this.updateWorkerState(workerId, { status: 'Idle' });
            }, 1000);
            return;
        }

        const collectableFactories = this.factoryService.collectableFactories();
        if (collectableFactories.length > 0) {
            const factory = collectableFactories[0];
            const factoryName = this.itemService.getItem(factory.itemId)?.name || 'factory';
            this.updateWorkerState(workerId, { status: 'Moving', x: factory.x, y: factory.y });

            setTimeout(() => {
                this.factoryService.collect(factory.instanceId);
                this.logAction(`Collected from ${factoryName} at (${factory.x}, ${factory.y}).`);
                this.updateWorkerState(workerId, { status: 'Idle' });
            }, 1000);
            return;
        }
    }

    private updateWorkerState(workerId: string, updates: Partial<Worker>) {
        this.workers.update(workers => 
            workers.map(w => w.id === workerId ? { ...w, ...updates } : w)
        );
    }

    private logAction(message: string) {
        const newLog: ActionLog = { timestamp: Date.now(), message };
        this.actionLogs.update(logs => [newLog, ...logs].slice(0, 10)); // Keep last 10 logs
    }
}
