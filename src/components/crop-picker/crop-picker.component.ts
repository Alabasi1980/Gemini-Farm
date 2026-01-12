import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CropService } from '../../services/crop.service';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-crop-picker',
  templateUrl: './crop-picker.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CropPickerComponent {
  @Output() cropSelected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  cropService = inject(CropService);
  gameStateService = inject(GameStateService);

  availableCrops = this.cropService.getAllCrops();
  playerCoins = this.gameStateService.state().coins;

  selectCrop(cropId: string) {
    this.cropSelected.emit(cropId);
  }

  closePicker() {
    this.close.emit();
  }
}
