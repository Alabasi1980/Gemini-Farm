import { Injectable, inject } from '@angular/core';
import { CropService } from './crop.service';
import { AnimalService } from './animal.service';
import { FactoryService } from './factory.service';

interface ItemData {
    id: string;
    name: string;
    sellPrice: number;
    asset: string;
}

@Injectable({ providedIn: 'root' })
export class ItemService {
    private cropService = inject(CropService);
    private animalService = inject(AnimalService);
    private factoryService = inject(FactoryService);
    
    getItem(id: string): ItemData | undefined {
        const crop = this.cropService.getCrop(id);
        if (crop) {
            return {
                id: crop.id,
                name: crop.name,
                sellPrice: crop.sellPrice,
                asset: crop.growthStages[crop.growthStages.length - 1].asset
            };
        }

        const product = this.animalService.getProduct(id);
        if (product) {
            return {
                id: product.id,
                name: product.name,
                sellPrice: product.sellPrice,
                asset: product.asset
            };
        }

        const good = this.factoryService.getProcessedGood(id);
        if (good) {
            return {
                id: good.id,
                name: good.name,
                sellPrice: good.sellPrice,
                asset: good.asset
            };
        }
        
        return undefined;
    }
}
