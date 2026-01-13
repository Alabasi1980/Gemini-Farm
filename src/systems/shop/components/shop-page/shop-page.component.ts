import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { GameStateService } from '../../../player/services/game-state.service';
import { CommonModule } from '@angular/common';
import { CropService } from '../../../farm/services/crop.service';
import { ObjectService } from '../../../farm/services/object.service';
import { PlacementService } from '../../../farm/services/placement.service';
import { TutorialService } from '../../../tutorial/services/tutorial.service';
import { GameClockService } from '../../../world/services/game-clock.service';
import { Crop } from '../../../../shared/types/game.types';

interface CropForShop extends Crop {
  isInSeason: boolean;
}

@Component({
  selector: 'shop-page',
  templateUrl: './shop-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopPageComponent {
  gameStateService = inject(GameStateService);
  cropService = inject(CropService);
  objectService = inject(ObjectService);
  placementService = inject(PlacementService);
  tutorialService = inject(TutorialService);
  gameClockService = inject(GameClockService);

  playerCoins = this.gameStateService.state().coins;
  private availableCrops = this.cropService.getAllCrops();
  placeableItems = this.objectService.getAllItems();
  
  cropsForShop = computed<CropForShop[]>(() => {
    const currentSeason = this.gameClockService.currentSeason();
    return this.availableCrops.map(crop => ({
      ...crop,
      isInSeason: this.cropService.isCropInSeason(crop.id, currentSeason),
    }));
  });

  buyObject(itemId: string) {
    this.placementService.buyObject(itemId);
    if (itemId === 'chicken_coop') {
        this.tutorialService.triggerAction('tutorial-buy-coop');
    }
  }
}