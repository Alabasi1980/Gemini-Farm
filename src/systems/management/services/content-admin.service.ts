import { Injectable, inject } from '@angular/core';
import { DatabaseService } from '../../../shared/services/database.service';
import { ContentService } from '../../../shared/services/content.service';
import { Crop } from '../../../shared/types/game.types';

@Injectable({ providedIn: 'root' })
export class ContentAdminService {
  private dbService = inject(DatabaseService);
  private contentService = inject(ContentService);

  // FIX: Simplified parameter type to `Crop` since `Crop.id` is now a required property.
  async saveCrop(crop: Crop): Promise<void> {
    try {
      // Create a clean object for Firestore, excluding the id from the document body
      const { id, ...cropData } = crop;
      
      await this.dbService.setDocumentInCollection('content/live/crops', id, cropData);
      
      // After saving, reload all content to reflect changes in the game
      await this.contentService.loadContent();

    } catch (error) {
      console.error("Error saving crop:", error);
      throw error;
    }
  }
}