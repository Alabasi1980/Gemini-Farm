import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FarmService } from '../../../farm/services/farm.service';
import { GameStateService } from '../../../player/services/game-state.service';
import { CommonModule } from '@angular/common';
import { CropService } from '../../../farm/services/crop.service';
import { ObjectService } from '../../../farm/services/object.service';

@Component({
  selector: 'shop-page',
  templateUrl: './shop-page.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopPageComponent {
  farmService = inject(FarmService);
  gameStateService = inject(GameStateService);
  cropService = inject(CropService);
  objectService = inject(ObjectService);

  playerCoins = this.gameStateService.state().coins;
  expansionCost = this.farmService.expansionCost;
  canAffordExpansion = this.farmService.canAffordExpansion;
  availableCrops = this.cropService.getAllCrops();
  placeableItems = this.objectService.getAllItems();
  
  buyExpansion() {
    this.farmService.unlockNextPlots();
  }

  buyObject(itemId: string) {
    this.farmService.buyObject(itemId);
  }
}