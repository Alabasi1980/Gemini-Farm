import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HudComponent } from '../../../player/components/hud/hud.component';
import { FarmGridComponent } from '../farm-grid/farm-grid.component';
import { CropPickerComponent } from '../crop-picker/crop-picker.component';
import { FarmService } from '../../services/farm.service';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';
import { RecipePickerComponent } from '../../../production/components/recipe-picker/recipe-picker.component';
import { FactoryService } from '../../../production/services/factory.service';
import { GameClockService } from '../../../world/services/game-clock.service';
import { GameStateService } from '../../../player/services/game-state.service';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;

@Component({
  selector: 'farm-page',
  templateUrl: './farm-page.component.html',
  imports: [CommonModule, HudComponent, FarmGridComponent, CropPickerComponent, PlaceableObjectComponent, RecipePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmPageComponent {
  farmService = inject(FarmService);
  factoryService = inject(FactoryService);
  gameClockService = inject(GameClockService);
  gameStateService = inject(GameStateService);

  farmGrid = viewChild.required(FarmGridComponent);

  showCropPicker = this.farmService.activePickerPlotId;
  showRecipePicker = this.farmService.activeFactoryId;
  expansionPreview = this.farmService.expansionPreview;

  // Game clock state
  season = this.gameClockService.currentSeason;
  weather = this.gameClockService.currentWeather;

  seasonClass = computed(() => `season-${this.season().toLowerCase()}`);
  weatherClass = computed(() => `weather-${this.weather().toLowerCase()}`);

  // Camera State - Default zoomed out further (0.5)
  scale = signal(0.5);
  translate = signal({ x: 0, y: 0 });
  isPanning = signal(false);
  private panStart = { x: 0, y: 0 };
  private panStartTranslate = { x: 0, y: 0 };

  cameraTransform = computed(() => `translate(${this.translate().x}px, ${this.translate().y}px) scale(${this.scale()})`);
  
  onCropSelected(cropId: string) {
    const plotId = this.showCropPicker();
    if (plotId !== null) {
      this.farmService.plantCrop(plotId, cropId);
    }
  }

  onClosePicker() {
    this.farmService.closePicker();
  }

  onRecipeSelected(recipeId: string) {
      const factoryId = this.showRecipePicker();
      if (factoryId !== null) {
          this.factoryService.startProduction(factoryId, recipeId);
      }
      this.farmService.closeRecipePicker();
  }

  onCloseRecipePicker() {
      this.farmService.closeRecipePicker();
  }

  onConfirmExpansion() {
    this.farmService.confirmExpansion();
  }

  onCancelExpansion() {
    this.farmService.cancelExpansion();
  }

  // Camera Controls
  onWheel(event: WheelEvent) {
    event.preventDefault();
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const oldScale = this.scale();
    // Make zoom speed proportional to current zoom for a smoother feel
    const zoomFactor = 0.1 * oldScale;
    const delta = event.deltaY > 0 ? -zoomFactor : zoomFactor;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale + delta));

    // If scale hasn't changed, do nothing
    if (newScale === oldScale) return;

    // World position of the mouse before zoom
    const worldX = (mouseX - this.translate().x) / oldScale;
    const worldY = (mouseY - this.translate().y) / oldScale;

    // New translation to keep world position at the same screen position
    const newTranslateX = mouseX - worldX * newScale;
    const newTranslateY = mouseY - worldY * newScale;
    
    this.scale.set(newScale);
    this.translate.set({ x: newTranslateX, y: newTranslateY });
  }

  onMouseDown(event: MouseEvent) {
    // If a child element handles the click, it should stop propagation.
    // Therefore, if the event reaches here, it's a click on the background.
    this.farmService.deselectObject();

    // Don't start panning if we're already dragging something.
    if (this.farmService.draggingState()) return;

    event.preventDefault();
    this.isPanning.set(true);
    this.panStart = { x: event.clientX, y: event.clientY };
    this.panStartTranslate = { ...this.translate() };
  }

  onMouseMove(event: MouseEvent) {
    if (this.isPanning()) {
      const dx = event.clientX - this.panStart.x;
      const dy = event.clientY - this.panStart.y;

      this.translate.set({
        x: this.panStartTranslate.x + dx,
        y: this.panStartTranslate.y + dy,
      });
    } else if (this.farmService.draggingState()) {
      const gridElement = this.farmGrid().elementRef.nativeElement.querySelector('.grid');
      if (gridElement) {
        this.farmService.handleDrag(event, gridElement);
      }
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isPanning.set(false);
    // Also handle object drop
    if (this.farmService.draggingState()) {
      this.farmService.endDrag();
    }
  }

  onMouseLeave() {
    this.isPanning.set(false);
  }
}