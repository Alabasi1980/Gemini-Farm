import { ChangeDetectionStrategy, Component, output, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CropService } from '../../services/crop.service';
import { GameStateService } from '../../../player/services/game-state.service';
import { TutorialService } from '../../../tutorial/services/tutorial.service';
import { GameClockService } from '../../../world/services/game-clock.service';
import { Crop } from '../../../../shared/types/game.types';

interface CropForPicker extends Crop {
  isInSeason: boolean;
}

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
  tutorialService = inject(TutorialService);
  gameClockService = inject(GameClockService);

  private availableCrops = this.cropService.getAllCrops();
  playerCoins = this.gameStateService.state().coins;

  cropsForPicker = computed<CropForPicker[]>(() => {
    const currentSeason = this.gameClockService.currentSeason();
    return this.availableCrops.map(crop => ({
      ...crop,
      isInSeason: this.cropService.isCropInSeason(crop.id, currentSeason),
    }));
  });

  selectCrop(cropId: string) {
    this.cropSelected.emit(cropId);
    if (cropId === 'wheat') {
      this.tutorialService.triggerAction('tutorial-plant-wheat');
    }
  }

  closePicker() {
    this.close.emit();
  }
}