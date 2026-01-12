import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../../player/services/game-state.service';
import { CommonModule } from '@angular/common';
import { CropService } from '../../../farm/services/crop.service';
import { ObjectService } from '../../../farm/services/object.service';
import { PlacementService } from '../../../farm/services/placement.service';

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

  playerCoins = this.gameStateService.state().coins;
  availableCrops = this.cropService.getAllCrops();
  placeableItems = this.objectService.getAllItems();
  
  buyObject(itemId: string) {
    this.placementService.buyObject(itemId);
  }
}