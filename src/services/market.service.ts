import { Injectable, signal, inject } from '@angular/core';
import { MarketEvent } from '../types/game.types';
import { ItemService } from './item.service';

const MARKET_EVENTS: MarketEvent[] = [
    { id: 'wheat_boom', description: "Wheat Demand Spike! Sell price +50%", itemId: 'wheat', priceMultiplier: 1.5 },
    { id: 'corn_craze', description: "Corn is in high demand! Sell price +40%", itemId: 'corn', priceMultiplier: 1.4 },
    { id: 'egg_surplus', description: "Egg Surplus! Sell price -30%", itemId: 'egg', priceMultiplier: 0.7 },
    { id: 'flour_frenzy', description: "Bakers are busy! Flour price +60%", itemId: 'flour', priceMultiplier: 1.6 },
];

const PRICE_FLUCTUATION_RANGE = 0.2; // +/- 20%
const MARKET_UPDATE_INTERVAL = 1000 * 60 * 2; // 2 minutes

@Injectable({ providedIn: 'root' })
export class MarketService {
    private itemService = inject(ItemService);

    priceModifiers = signal<Map<string, number>>(new Map());
    activeEvent = signal<MarketEvent | null>(null);

    constructor() {
        this._updateMarket(); // Initial update
        setInterval(() => this._updateMarket(), MARKET_UPDATE_INTERVAL);
    }

    private _updateMarket() {
        const newModifiers = new Map<string, number>();
        const allItems = this.itemService.getAllSellableItems();

        // 1. Decide if an event happens (e.g., 50% chance)
        const eventHappens = Math.random() < 0.5;
        const newEvent = eventHappens ? MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)] : null;
        this.activeEvent.set(newEvent);

        // 2. Set price modifiers for all items
        for (const item of allItems) {
            let modifier = 1.0;

            // Apply base fluctuation
            const fluctuation = (Math.random() * PRICE_FLUCTUATION_RANGE * 2) - PRICE_FLUCTUATION_RANGE; // -0.2 to +0.2
            modifier += fluctuation;

            // Apply event modifier if active, overriding the base fluctuation
            if (newEvent && newEvent.itemId === item.id) {
                modifier = newEvent.priceMultiplier;
            }

            newModifiers.set(item.id, modifier);
        }

        this.priceModifiers.set(newModifiers);
    }

    getPriceModifier(itemId: string): number {
        return this.priceModifiers().get(itemId) ?? 1.0;
    }
}
