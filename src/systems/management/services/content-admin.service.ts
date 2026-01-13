import { Injectable, inject } from '@angular/core';
import { DatabaseService } from '../../../shared/services/database.service';
import { ContentService } from '../../../shared/services/content.service';
import { Crop, PlaceableItem } from '../../../shared/types/game.types';

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

  async deleteCrop(cropId: string): Promise<void> {
    try {
      await this.dbService.deleteDocumentFromCollection('content/live/crops', cropId);
      // After deleting, reload all content to reflect changes
      await this.contentService.loadContent();
    } catch (error) {
      console.error("Error deleting crop:", error);
      throw error;
    }
  }

  async savePlaceableItem(item: PlaceableItem): Promise<void> {
    try {
      const { id, ...itemData } = item;
      await this.dbService.setDocumentInCollection('content/live/placeable_items', id, itemData);
      await this.contentService.loadContent();
    } catch (error) {
      console.error("Error saving placeable item:", error);
      throw error;
    }
  }

  async deletePlaceableItem(itemId: string): Promise<void> {
    try {
      await this.dbService.deleteDocumentFromCollection('content/live/placeable_items', itemId);
      await this.contentService.loadContent();
    } catch (error) {
      console.error("Error deleting placeable item:", error);
      throw error;
    }
  }
}