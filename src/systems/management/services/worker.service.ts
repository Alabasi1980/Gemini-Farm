import { Injectable, signal, inject, effect } from '@angular/core';
import { ActionLog, Worker } from '../../../shared/types/game.types';
import { AnimalService } from '../../farm/services/animal.service';
import { FactoryService } from '../../production/services/factory.service';
import { ItemService } from '../../../shared/services/item.service';
import { GridService } from '../../farm/services/grid.service';
import { PlacementService } from '../../farm/services/placement.service';
import { GameClockService } from '../../world/services/game-clock.service';
import { ObjectService } from '../../farm/services/object.service';

const INITIAL_WORKERS: Worker[] = [
    {
        id: 'harvester-1',
        name: 'Harvester Bot',
        asset: '🤖',
        status: 'Idle',
        active: false,
        x: 15,
        y: 18,
    }
];

@Injectable({ providedIn: 'root' })
export class WorkerService {
    gridService = inject(GridService);
    animalService = inject(AnimalService);
    factoryService = inject(FactoryService);
    itemService = inject(ItemService);
    gameClockService = inject(GameClockService);
    objectService = inject(ObjectService);

    workers = signal<Worker[]>(INITIAL_WORKERS);
    actionLogs = signal<ActionLog[]>([]);

    constructor() {
        effect(() => {
            this.gameClockService.gameTick();
            
            const activeWorkers = this.workers().filter(w => w.active);
            if (activeWorkers.length === 0) return;
            
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
        const worker = this.workers().find(w => w.id === workerId);
        if (worker) {
            this.logAction(`${worker.active ? 'Activated' : 'Deactivated'} ${worker.name}.`);
        }
    }

    private findAndPerformTask(workerId: string) {
        const harvestable = this.gridService.harvestablePlots();
        if (harvestable.length > 0) {
            const plot = harvestable[0];
            const cropName = this.itemService.getItem(plot.cropId!)?.name || 'crop';
            this.updateWorkerState(workerId, { status: 'Moving', x: plot.x, y: plot.y });

            setTimeout(() => {
                this.gridService.harvestPlot(plot.id);
                this.logAction(`Harvested ${cropName} at (${plot.x}, ${plot.y}).`);
                this.updateWorkerState(workerId, { status: 'Idle' });
            }, 1000);
            return;
        }

        const collectableAnimals = this.animalService.collectableBuildings();
        if (collectableAnimals.length > 0) {
            const building = collectableAnimals[0];
            const buildingName = this.objectService.getItem(building.itemId)?.name || 'building';
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
            const factoryName = this.objectService.getItem(factory.itemId)?.name || 'factory';
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
        this.actionLogs.update(logs => [newLog, ...logs].slice(0, 10));
    }
}