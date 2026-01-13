import { Crop, PlaceableItem, AnimalProduct, ProcessedGood, Recipe } from "../../../shared/types/game.types";

export const DEFAULT_CROPS: Crop[] = [
    {
        id: 'wheat',
        name: 'Wheat',
        description: 'A basic grain, essential for many recipes.',
        plantCost: 5,
        sellPrice: 8,
        growthTime: 15 * 1000, // 15 seconds
        unlockLevel: 1,
        balanceTags: ['starter', 'grain'],
        seasonModifiers: { Spring: 1.2, Summer: 1.0, Autumn: 1.1, Winter: 0.8 },
        seasons: ['Spring', 'Summer', 'Autumn'],
        growthStages: [
            { stage: 0, duration: 7 * 1000, asset: '🌱' },
            { stage: 1, duration: 8 * 1000, asset: '🌾' },
            { stage: 2, duration: 0, asset: '🌾' },
        ]
    },
    {
        id: 'carrot',
        name: 'Carrot',
        description: 'A crunchy root vegetable. Slower but more profitable than wheat.',
        plantCost: 10,
        sellPrice: 18,
        growthTime: 40 * 1000, // 40 seconds
        unlockLevel: 1,
        balanceTags: ['starter', 'root_vegetable'],
        seasonModifiers: { Spring: 1.1, Summer: 0.9, Autumn: 1.2, Winter: 1.0 },
        seasons: ['Spring', 'Autumn'],
        growthStages: [
            { stage: 0, duration: 20 * 1000, asset: '🌱' },
            { stage: 1, duration: 20 * 1000, asset: '🥕' },
            { stage: 2, duration: 0, asset: '🥕' },
        ]
    },
    {
        id: 'corn',
        name: 'Corn',
        description: 'A sweet and versatile crop.',
        plantCost: 15,
        sellPrice: 30,
        growthTime: 90 * 1000, // 1.5 minutes
        unlockLevel: 2,
        balanceTags: ['common', 'vegetable'],
        seasonModifiers: { Spring: 1.0, Summer: 1.3, Autumn: 1.0, Winter: 0.7 },
        seasons: ['Summer'],
        growthStages: [
            { stage: 0, duration: 40 * 1000, asset: '🌱' },
            { stage: 1, duration: 50 * 1000, asset: '🌽' },
            { stage: 2, duration: 0, asset: '🌽' },
        ]
    },
];

export const DEFAULT_PLACEABLE_ITEMS: PlaceableItem[] = [
    {
        id: 'scarecrow',
        name: 'Scarecrow',
        description: 'A friendly-looking scarecrow to watch over your crops.',
        type: 'decoration',
        cost: 50,
        width: 1,
        height: 1,
        asset: '🎃',
        unlockLevel: 1
    },
    {
        id: 'chicken_coop',
        name: 'Chicken Coop',
        description: 'Houses chickens that lay eggs.',
        type: 'animal_housing',
        cost: 200,
        width: 2,
        height: 2,
        asset: '🐔',
        unlockLevel: 2,
        producesProductId: 'egg',
        productionTime: 90 * 1000 // 1.5 minutes
    },
    {
        id: 'mill',
        name: 'Mill',
        description: 'Grinds grains into flour.',
        type: 'factory',
        cost: 600,
        width: 3,
        height: 3,
        asset: '🏭',
        unlockLevel: 3,
        recipeIds: ['wheat_to_flour'],
        baseQueueSize: 2,
        upgradeCost: 800,
        speedPerLevel: 0.1, // 10% speed increase per level
    },
    {
        id: 'bakery',
        name: 'Bakery',
        description: 'Bakes delicious goods like bread.',
        type: 'factory',
        cost: 1000,
        width: 3,
        height: 2,
        asset: '🥖',
        unlockLevel: 4,
        recipeIds: ['flour_to_bread'],
        baseQueueSize: 2,
        upgradeCost: 1200,
        speedPerLevel: 0.1,
    }
];

export const DEFAULT_ANIMAL_PRODUCTS: AnimalProduct[] = [
    {
        id: 'egg',
        name: 'Egg',
        description: 'A fresh egg from a happy chicken.',
        sellPrice: 25,
        asset: '🥚',
        unlockLevel: 2
    }
];

export const DEFAULT_PROCESSED_GOODS: ProcessedGood[] = [
    {
        id: 'flour',
        name: 'Flour',
        description: 'Finely ground wheat, perfect for baking.',
        sellPrice: 30,
        asset: '🥡',
        unlockLevel: 3
    },
    {
        id: 'bread',
        name: 'Bread',
        description: 'A warm, crusty loaf of bread.',
        sellPrice: 80,
        asset: '🍞',
        unlockLevel: 4
    }
];

export const DEFAULT_RECIPES: Recipe[] = [
    {
        id: 'wheat_to_flour',
        name: 'Grind Flour',
        description: 'Turn wheat into flour.',
        duration: 45 * 1000, // 45 seconds
        inputs: { wheat: 2 },
        outputId: 'flour',
        outputQuantity: 1,
        unlockLevel: 3
    },
    {
        id: 'flour_to_bread',
        name: 'Bake Bread',
        description: 'Bake flour into bread.',
        duration: 120 * 1000, // 2 minutes
        inputs: { flour: 2 },
        outputId: 'bread',
        outputQuantity: 1,
        unlockLevel: 4
    }
];