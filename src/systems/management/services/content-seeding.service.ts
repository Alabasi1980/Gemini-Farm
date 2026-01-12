import { Injectable, inject } from '@angular/core';
import { DatabaseService } from '../../../shared/services/database.service';
import { DEFAULT_ANIMAL_PRODUCTS, DEFAULT_CROPS, DEFAULT_PLACEABLE_ITEMS, DEFAULT_PROCESSED_GOODS, DEFAULT_RECIPES } from './default-content';

@Injectable({ providedIn: 'root' })
export class ContentSeedingService {
  private dbService = inject(DatabaseService);

  async seedInitialContentIfNeeded(): Promise<void> {
    try {
      // Check if crops collection is empty. If so, we assume all content needs seeding.
      const crops = await this.dbService.getCollection('content/live/crops');
      if (crops.length > 0) {
        console.log('Game content already exists in Firestore. Skipping seeding.');
        return;
      }

      console.log('No game content found. Seeding initial data into Firestore...');

      const seedingPromises = [
        ...DEFAULT_CROPS.map(crop => {
            const { id, ...data } = crop;
            return this.dbService.setDocumentInCollection('content/live/crops', id, data);
        }),
        ...DEFAULT_PLACEABLE_ITEMS.map(item => {
            const { id, ...data } = item;
            return this.dbService.setDocumentInCollection('content/live/placeable_items', id, data);
        }),
        ...DEFAULT_ANIMAL_PRODUCTS.map(product => {
            const { id, ...data } = product;
            return this.dbService.setDocumentInCollection('content/live/animal_products', id, data);
        }),
        ...DEFAULT_PROCESSED_GOODS.map(good => {
            const { id, ...data } = good;
            return this.dbService.setDocumentInCollection('content/live/processed_goods', id, data);
        }),
        ...DEFAULT_RECIPES.map(recipe => {
            const { id, ...data } = recipe;
            return this.dbService.setDocumentInCollection('content/live/recipes', id, data);
        }),
      ];
      
      await Promise.all(seedingPromises);

      console.log('Successfully seeded all initial game content.');

    } catch (error) {
      console.error('CRITICAL: Failed to seed initial game content.', error);
      // This is a critical error. The app might not function correctly without this content.
      throw new Error('Could not initialize game content. The game cannot start.');
    }
  }
}
