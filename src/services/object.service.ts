import { Injectable } from '@angular/core';
import { PlaceableItem } from '../types/game.types';

const PLACEABLE_ITEMS_DATA: PlaceableItem[] = [
    {
        id: 'scarecrow',
        name: 'Scarecrow',
        type: 'decoration',
        cost: 50,
        width: 1,
        height: 1,
        asset: '🧍'
    },
    {
        id: 'chicken_coop',
        name: 'Chicken Coop',
        type: 'animal_housing',
        cost: 150,
        width: 2,
        height: 2,
        asset: '🐔',
        producesProductId: 'egg',
        productionTime: 1000 * 60 // 1 minute
    },
    {
        id: 'mill',
        name: 'Mill',
        type: 'factory',
        cost: 200,
        width: 2,
        height: 2,
        asset: '🏭',
        recipeIds: ['wheat_to_flour']
    },
    {
        id: 'barn_red',
        name: 'Red Barn',
        type: 'building',
        cost: 250,
        width: 3,
        height: 2,
        asset: '헛'
    },
    {
      id: 'well',
      name: 'Water Well',
      type: 'decoration',
      cost: 120,
      width: 2,
      height: 2,
      asset: '🧱'
    }
];

@Injectable({ providedIn: 'root' })
export class ObjectService {
    private items = new Map<string, PlaceableItem>(PLACEABLE_ITEMS_DATA.map(i => [i.id, i]));

    getAllItems(): PlaceableItem[] {
        return Array.from(this.items.values());
    }

    getItem(id: string): PlaceableItem | undefined {
        return this.items.get(id);
    }
}
