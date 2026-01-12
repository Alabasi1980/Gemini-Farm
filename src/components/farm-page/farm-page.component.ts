import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HudComponent } from '../hud/hud.component';
import { FarmGridComponent } from '../farm-grid/farm-grid.component';
import { CropPickerComponent } from '../crop-picker/crop-picker.component';
import { FarmService } from '../../services/farm.service';
import { PlaceableObjectComponent } from '../placeable-object/placeable-object.component';
import { RecipePickerComponent } from '../recipe-picker/recipe-picker.component';
import { FactoryService } from '../../services/factory.service';

@Component({
  selector: 'farm-page',
  templateUrl: './farm-page.component.html',
  imports: [CommonModule, HudComponent, FarmGridComponent, CropPickerComponent, PlaceableObjectComponent, RecipePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(mousemove)': 'onMouseMove($event)',
    '(mouseup)': 'onMouseUp()'
  }
})
export class FarmPageComponent {
  farmService = inject(FarmService);
  factoryService = inject(FactoryService);

  farmGrid = viewChild.required(FarmGridComponent, { read: ElementRef });

  showCropPicker = this.farmService.activePickerPlotId;
  showRecipePicker = this.farmService.activeFactoryId;

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

  onMouseMove(event: MouseEvent) {
    if (this.farmService.draggingState()) {
      this.farmService.handleDrag(event, this.farmGrid().nativeElement);
    }
  }

  onMouseUp() {
    if (this.farmService.draggingState()) {
      this.farmService.endDrag();
    }
  }
}
