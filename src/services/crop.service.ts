import { Injectable } from '@angular/core';
import { Crop } from '../types/game.types';

const CROPS_DATA: Crop[] = [
  {
    id: 'wheat',
    name: 'Wheat',
    plantCost: 5,
    sellPrice: 8,
    growthTime: 1000 * 10, // 10 seconds
    growthStages: [
      { stage: 0, duration: 2000, asset: '🌱' }, // Seedling
      { stage: 1, duration: 4000, asset: '🌿' }, // Sprout
      { stage: 2, duration: 4000, asset: '🌾' }, // Grown
      { stage: 3, duration: 0, asset: '🌾' }      // Ready
    ],
    seasonModifiers: { 'Autumn': 1.2, 'Winter': 0.8 },
  },
  {
    id: 'corn',
    name: 'Corn',
    plantCost: 10,
    sellPrice: 18,
    growthTime: 1000 * 20, // 20 seconds
    growthStages: [
      { stage: 0, duration: 4000, asset: '🌱' },
      { stage: 1, duration: 8000, asset: '🌿' },
      { stage: 2, duration: 8000, asset: '🌽' },
      { stage: 3, duration: 0, asset: '🌽' }
    ],
    seasonModifiers: { 'Summer': 1.25, 'Winter': 0.7 },
  },
  {
    id: 'tomato',
    name: 'Tomato',
    plantCost: 15,
    sellPrice: 25,
    growthTime: 1000 * 30, // 30 seconds
    growthStages: [
        { stage: 0, duration: 6000, asset: '🌱' },
        { stage: 1, duration: 12000, asset: '🌿' },
        { stage: 2, duration: 12000, asset: '🍅' },
        { stage: 3, duration: 0, asset: '🍅' }
    ],
    seasonModifiers: { 'Summer': 1.2, 'Spring': 1.1, 'Autumn': 0.9 },
  },
];

@Injectable({
  providedIn: 'root',
})
export class CropService {
  private crops = new Map<string, Crop>(CROPS_DATA.map(c => [c.id, c]));

  getAllCrops(): Crop[] {
    return Array.from(this.crops.values());
  }

  getCrop(id: string): Crop | undefined {
    return this.crops.get(id);
  }
}