import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FarmObject, PlaceableItem } from '../../types/game.types';
import { FarmService } from '../../services/farm.service';
import { ObjectService } from '../../services/object.service';
import { AnimalService } from '../../services/animal.service';
import { FactoryService } from '../../services/factory.service';

@Component({
  selector: 'app-placeable-object',
  templateUrl: './placeable-object.component.html',
  host: {
    '[style.grid-column]': 'positionStyles().gridColumn',
    '[style.grid-row]': 'positionStyles().gridRow',
    '[style.z-index]': 'positionStyles().zIndex',
    '[class.is-dragging]': 'isBeingDragged()',
    '[class.pointer-events-auto]': 'true',
  }
})
export class PlaceableObjectComponent {
  object = input.required<FarmObject>();
  
  farmService = inject(FarmService);
  objectService = inject(ObjectService);
  animalService = inject(AnimalService);
  factoryService = inject(FactoryService);
  
  gameTick = this.farmService.gameTick;
  draggingState = this.farmService.draggingState;
  
  item = computed<PlaceableItem | undefined>(() => this.objectService.getItem(this.object().itemId));
  isBeingDragged = computed(() => this.draggingState()?.object.instanceId === this.object().instanceId);
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
    // Note: gameTick is already triggered by animalProductionInfo
    if (!this.isFactory()) return null;

    const state = this.factoryService.factoryStates().get(this.object().instanceId);
    if (!state) return null;
    
    if (state.outputReady) return { isReady: true, progress: 100, isProducing: false };
    if (!state.activeRecipeId || !state.productionStartTime) return { isReady: false, progress: 0, isProducing: false };

    const recipe = this.factoryService.getRecipe(state.activeRecipeId);
    if (!recipe) return null;

    const timeElapsed = Date.now() - state.productionStartTime;
    const progress = Math.min(100, (timeElapsed / recipe.duration) * 100);

    return { isReady: false, progress, isProducing: true };
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

  onMouseDown(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.interaction-button')) return;
    
    event.preventDefault();
    this.farmService.startDrag(this.object().instanceId, event);
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
