import { Injectable, computed, inject } from '@angular/core';
import { PlaceableItem } from '../../../shared/types/game.types';
import { ContentService } from '../../../shared/services/content.service';


@Injectable({ providedIn: 'root' })
export class ObjectService {
    private contentService = inject(ContentService);
    
    private items = computed(() => {
        return new Map<string, PlaceableItem>(this.contentService.placeableItems().map(i => [i.id, i]));
    });

    getAllItems(): PlaceableItem[] {
        return Array.from(this.items().values());
    }

    getItem(id: string): PlaceableItem | undefined {
        return this.items().get(id);
    }
}
