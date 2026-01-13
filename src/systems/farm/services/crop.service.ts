import { Injectable, computed, inject } from '@angular/core';
import { Crop, Season } from '../../../shared/types/game.types';
import { ContentService } from '../../../shared/services/content.service';

@Injectable({
  providedIn: 'root',
})
export class CropService {
  private contentService = inject(ContentService);
  
  private crops = computed(() => {
    return new Map<string, Crop>(this.contentService.crops().map(c => [c.id, c]));
  });

  getAllCrops(): Crop[] {
    return Array.from(this.crops().values());
  }

  getCrop(id: string): Crop | undefined {
    return this.crops().get(id);
  }

  isCropInSeason(cropId: string, season: Season): boolean {
    const crop = this.getCrop(cropId);
    // If crop doesn't exist, or has no specific seasons, it's plantable year-round as a fallback.
    if (!crop || !crop.seasons || crop.seasons.length === 0) {
      return true;
    }
    return crop.seasons.includes(season);
  }
}