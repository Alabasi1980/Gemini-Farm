<<<<<<< HEAD
import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild, signal, computed } from '@angular/core';
=======
import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
import { CommonModule } from '@angular/common';
import { HudComponent } from '../hud/hud.component';
import { FarmGridComponent } from '../farm-grid/farm-grid.component';
import { CropPickerComponent } from '../crop-picker/crop-picker.component';
import { FarmService } from '../../services/farm.service';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';
import { RecipePickerComponent } from '../recipe-picker/recipe-picker.component';
import { FactoryService } from '../../services/factory.service';
<<<<<<< HEAD
import { GameClockService } from '../../services/game-clock.service';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.8;
=======
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396

@Component({
  selector: 'farm-page',
  templateUrl: './farm-page.component.html',
  imports: [CommonModule, HudComponent, FarmGridComponent, CropPickerComponent, PlaceableObjectComponent, RecipePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
<<<<<<< HEAD
=======
  host: {
    '(mousemove)': 'onMouseMove($event)',
    '(mouseup)': 'onMouseUp()'
  }
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
})
export class FarmPageComponent {
  farmService = inject(FarmService);
  factoryService = inject(FactoryService);
<<<<<<< HEAD
  gameClockService = inject(GameClockService);
=======

  farmGrid = viewChild.required(FarmGridComponent, { read: ElementRef });
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396

  showCropPicker = this.farmService.activePickerPlotId;
  showRecipePicker = this.farmService.activeFactoryId;

<<<<<<< HEAD
  // Game clock state
  season = this.gameClockService.currentSeason;
  weather = this.gameClockService.currentWeather;

  seasonClass = computed(() => `season-${this.season().toLowerCase()}`);
  weatherClass = computed(() => `weather-${this.weather().toLowerCase()}`);

  // Camera State
  scale = signal(0.8);
  translate = signal({ x: 0, y: 0 });
  isPanning = signal(false);
  private panStart = { x: 0, y: 0 };
  private panStartTranslate = { x: 0, y: 0 };

  cameraTransform = computed(() => `translate(${this.translate().x}px, ${this.translate().y}px) scale(${this.scale()})`);
  
=======
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
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

<<<<<<< HEAD
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
    // Only pan if not dragging an object and not clicking on an interactive element
    if (this.farmService.draggingState() || (event.target as HTMLElement).closest('.interactive-child')) return;

    event.preventDefault();
    this.isPanning.set(true);
    this.panStart = { x: event.clientX, y: event.clientY };
    this.panStartTranslate = { ...this.translate() };
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isPanning()) return;

    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;

    this.translate.set({
      x: this.panStartTranslate.x + dx,
      y: this.panStartTranslate.y + dy,
    });
  }

  onMouseUp(event: MouseEvent) {
    this.isPanning.set(false);
    // Also handle object drop
=======
  onMouseMove(event: MouseEvent) {
    if (this.farmService.draggingState()) {
      this.farmService.handleDrag(event, this.farmGrid().nativeElement);
    }
  }

  onMouseUp() {
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
    if (this.farmService.draggingState()) {
      this.farmService.endDrag();
    }
  }
<<<<<<< HEAD

  onMouseLeave() {
    this.isPanning.set(false);
  }
}
=======
}
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
