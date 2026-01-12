import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FarmService {
  // UI State for modals and selections
  activePickerPlotId = signal<number | null>(null);
  activeFactoryId = signal<number | null>(null);
  selectedObjectInstanceId = signal<number | null>(null);

  openPickerForPlot(tileId: number) { this.activePickerPlotId.set(tileId); }
  closePicker() { this.activePickerPlotId.set(null); }

  openRecipePickerForFactory(instanceId: number) { this.activeFactoryId.set(instanceId); }
  closeRecipePicker() { this.activeFactoryId.set(null); }

  selectObject(instanceId: number) {
    this.selectedObjectInstanceId.set(instanceId);
  }

  deselectObject() {
    this.selectedObjectInstanceId.set(null);
  }
}