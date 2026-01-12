import { Injectable, computed, inject } from '@angular/core';
import { Crop } from '../../../shared/types/game.types';
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
}
