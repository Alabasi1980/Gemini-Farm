import { Injectable, signal, inject } from '@angular/core';
import { FarmObject } from '../../../shared/types/game.types';
import { PlacementService } from './placement.service';
import { GRID_WIDTH, GRID_HEIGHT } from './grid.service';
import { FarmService } from './farm.service';

@Injectable({
  providedIn: 'root',
})
export class DragDropService {
    private placementService = inject(PlacementService);
    private farmService = inject(FarmService);
    
    draggingState = signal<{
        object: FarmObject;
        originalX: number;
        originalY: number;
        validPosition: boolean;
        currentX: number;
        currentY: number;
        offsetX: number;
        offsetY: number;
    } | null>(null);

    startDrag(instanceId: number, event: MouseEvent, objectElement: HTMLElement) {
        const object = this.placementService.placedObjects().find(o => o.instanceId === instanceId);
        if (!object) return;

        const rect = objectElement.getBoundingClientRect();

        this.draggingState.set({
            object: { ...object },
            originalX: object.x,
            originalY: object.y,
            currentX: object.x,
            currentY: object.y,
            validPosition: true,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        });
    }

    handleDrag(event: MouseEvent, farmGridElement: HTMLElement) {
        const state = this.draggingState();
        if (!state) return;

        const gridRect = farmGridElement.getBoundingClientRect();
        const cellWidth = gridRect.width / GRID_WIDTH;
        const cellHeight = gridRect.height / GRID_HEIGHT;
        
        const x = event.clientX - gridRect.left - state.offsetX;
        const y = event.clientY - gridRect.top - state.offsetY;

        const gridX = Math.round(x / cellWidth);
        const gridY = Math.round(y / cellHeight);

        const updatedObject = { ...state.object, x: gridX, y: gridY };
        const isValid = this.placementService.isPositionValid(updatedObject, updatedObject.instanceId);

        this.draggingState.update(s => s ? { ...s, currentX: gridX, currentY: gridY, validPosition: isValid } : null);
    }

    endDrag() {
        const state = this.draggingState();
        if (!state) return;

        if (state.validPosition) {
            this.placementService.updateObjectPosition(state.object.instanceId, state.currentX, state.currentY);
        }
        
        this.draggingState.set(null);
        this.farmService.deselectObject();
    }
}