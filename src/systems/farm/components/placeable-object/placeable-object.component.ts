import { ChangeDetectionStrategy, Component, computed, inject, input, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FarmObject, PlaceableItem } from '../../../../shared/types/game.types';
import { FarmService } from '../../services/farm.service';
import { ObjectService } from '../../services/object.service';
import { AnimalService } from '../../services/animal.service';
import { FactoryService } from '../../../production/services/factory.service';
import { DragDropService } from '../../services/drag-drop.service';
import { GameClockService } from '../../../world/services/game-clock.service';

@Component({
  selector: 'app-placeable-object',
  templateUrl: './placeable-object.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.grid-column]': 'positionStyles().gridColumn',
    '[style.grid-row]': 'positionStyles().gridRow',
    '[style.z-index]': 'positionStyles().zIndex',
    '[class.is-dragging]': 'isBeingDragged()',
    '[class.pointer-events-auto]': 'true',
    // Enable smooth transitions only when NOT dragging.
    // This makes the object animate back smoothly on an invalid drop.
    '[class.transition-all]': '!isBeingDragged()',
    '[class.duration-300]': '!isBeingDragged()',
    '[class.ease-in-out]': '!isBeingDragged()',
  }
})
export class PlaceableObjectComponent {
  object = input.required<FarmObject>();
  
  farmService = inject(FarmService);
  objectService = inject(ObjectService);
  animalService = inject(AnimalService);
  factoryService = inject(FactoryService);
  dragDropService = inject(DragDropService);
  gameClockService = inject(GameClockService);
  elementRef = inject(ElementRef);
  
  gameTick = this.gameClockService.gameTick;
  draggingState = this.dragDropService.draggingState;
  
  item = computed<PlaceableItem | undefined>(() => this.objectService.getItem(this.object().itemId));
  isBeingDragged = computed(() => this.draggingState()?.object.instanceId === this.object().instanceId);
  isSelected = computed(() => this.farmService.selectedObjectInstanceId() === this.object().instanceId);
  isAnimalBuilding = computed(() => this.item()?.type === 'animal_housing');
  isFactory = computed(() => this.item()?.type === 'factory');

  animalProductionInfo = computed(() => {
    this.gameTick(); // Rerun on tick
    if (!this.isAnimalBuilding()) return null;

    const item = this.item();
    const state = this.animalService.productionStates().get(this.object().instanceId);
    if (!item || !state || !item.productionTime) return null;
    
    const timeElapsed = Date.now() - state.lastCollectionTime;
    const progress = Math.min(100, (timeElapsed / item.productionTime) * 100);
    const isReady = progress >= 100;
    
    return { progress, isReady };
  });

  factoryInfo = computed(() => {
    this.gameTick(); // Depend on tick
    if (!this.isFactory()) return null;

    const state = this.factoryService.factoryStates().get(this.object().instanceId);
    const config = this.factoryService.getFactoryConfig(this.object().instanceId);
    if (!state || !config) return null;
    
    if (state.outputReady) {
        return { isReady: true, progress: 100, isProducing: false, queueCount: state.queue.length, queueSize: config.queueSize };
    }

    if (state.queue.length > 0) {
        const job = state.queue[0];
        const recipe = this.factoryService.getRecipe(job.recipeId);
        if (!recipe) return null;
        
        const duration = recipe.duration / config.speedMultiplier;
        const timeElapsed = Date.now() - job.startTime;
        const progress = Math.min(100, (timeElapsed / duration) * 100);
        
        return { isReady: false, progress, isProducing: true, queueCount: state.queue.length, queueSize: config.queueSize };
    }

    return { isReady: false, progress: 0, isProducing: false, queueCount: 0, queueSize: config.queueSize };
  });

  displayState = computed(() => {
    const state = this.draggingState();
    if (this.isBeingDragged() && state) {
      return { x: state.currentX, y: state.currentY, isValid: state.validPosition };
    }
    return { x: this.object().x, y: this.object().y, isValid: true };
  });

  positionStyles = computed(() => {
    const itemData = this.item();
    const pos = this.displayState();
    if (!itemData) return {};
    
    return {
      gridColumn: `${pos.x + 1} / span ${itemData.width}`,
      gridRow: `${pos.y + 1} / span ${itemData.height}`,
      zIndex: pos.y + itemData.height,
    };
  });

  onSelectObject(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.interaction-button')) {
        return;
    }
    this.farmService.selectObject(this.object().instanceId);
    event.stopPropagation();
  }

  onStartMove(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.dragDropService.startDrag(this.object().instanceId, event, this.elementRef.nativeElement);
  }

  handleInteraction(event: MouseEvent, action: 'collect' | 'produce' | 'collect-factory') {
    event.stopPropagation();
    const instanceId = this.object().instanceId;
    if (action === 'collect') {
        this.animalService.collect(instanceId);
    } else if (action === 'produce') {
        this.farmService.openRecipePickerForFactory(instanceId);
    } else if (action === 'collect-factory') {
        this.factoryService.collect(instanceId);
    }
  }
}
