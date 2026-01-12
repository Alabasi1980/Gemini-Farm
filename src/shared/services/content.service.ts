import { Injectable, signal, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { Crop, PlaceableItem, AnimalProduct, ProcessedGood, Recipe } from '../types/game.types';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private dbService = inject(DatabaseService);

  // Signals to cache the static content
  crops = signal<Crop[]>([]);
  placeableItems = signal<PlaceableItem[]>([]);
  animalProducts = signal<AnimalProduct[]>([]);
  processedGoods = signal<ProcessedGood[]>([]);
  recipes = signal<Recipe[]>([]);

  contentLoading = signal(true);

  public async loadContent(): Promise<void> {
    this.contentLoading.set(true);
    try {
      console.log("Loading static game content from Firestore...");
      
      const [crops, placeableItems, animalProducts, processedGoods, recipes] = await Promise.all([
        this.dbService.getCollection<Crop>('content/live/crops'),
        this.dbService.getCollection<PlaceableItem>('content/live/placeable_items'),
        this.dbService.getCollection<AnimalProduct>('content/live/animal_products'),
        this.dbService.getCollection<ProcessedGood>('content/live/processed_goods'),
        this.dbService.getCollection<Recipe>('content/live/recipes')
      ]);

      this.crops.set(crops.sort((a, b) => a.unlockLevel - b.unlockLevel));
      this.placeableItems.set(placeableItems.sort((a, b) => a.unlockLevel - b.unlockLevel));
      this.animalProducts.set(animalProducts.sort((a, b) => a.unlockLevel - b.unlockLevel));
      this.processedGoods.set(processedGoods.sort((a, b) => a.unlockLevel - b.unlockLevel));
      this.recipes.set(recipes.sort((a, b) => a.unlockLevel - b.unlockLevel));

      console.log("Static game content loaded successfully.");

    } catch (error) {
      console.error("Failed to load static game content:", error);
      // This is a critical error, so we re-throw it to be handled by the app's main loading logic.
      throw new Error("Could not initialize game content. The game cannot start.");
    } finally {
        this.contentLoading.set(false);
    }
  }
}
