import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CropService } from '../../services/crop.service';
import { GameStateService } from '../../../player/services/game-state.service';

@Component({
  selector: 'app-crop-picker',
  templateUrl: './crop-picker.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CropPickerComponent {
  cropSelected = output<string>();
  close = output<void>();

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
