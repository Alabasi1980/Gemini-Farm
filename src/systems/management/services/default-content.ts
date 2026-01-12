import { Crop, PlaceableItem, AnimalProduct, ProcessedGood, Recipe } from "../../../shared/types/game.types";

export const DEFAULT_CROPS: Crop[] = [
    {
        id: 'wheat',
        name: 'Wheat',
        description: 'A basic grain, essential for many recipes.',
        plantCost: 10,
        sellPrice: 15,
        growthTime: 20 * 1000, // 20 seconds
        unlockLevel: 1,
        balanceTags: ['starter', 'grain'],
        seasonModifiers: { Spring: 1.2, Summer: 1.0, Autumn: 1.1, Winter: 0.8 },
        growthStages: [
            { stage: 0, duration: 10 * 1000, asset: '🌱' },
            { stage: 1, duration: 10 * 1000, asset: '🌾' },
            { stage: 2, duration: 0, asset: '🌾' },
        ]
    },
    {
        id: 'corn',
        name: 'Corn',
        description: 'A sweet and versatile crop.',
        plantCost: 20,
        sellPrice: 35,
        growthTime: 45 * 1000, // 45 seconds
        unlockLevel: 3,
        balanceTags: ['common', 'vegetable'],
        seasonModifiers: { Spring: 1.0, Summer: 1.3, Autumn: 1.0, Winter: 0.7 },
        growthStages: [
            { stage: 0, duration: 20 * 1000, asset: '🌱' },
            { stage: 1, duration: 25 * 1000, asset: '🌽' },
            { stage: 2, duration: 0, asset: '🌽' },
        ]
    },
    {
        id: 'carrot',
        name: 'Carrot',
        description: 'A crunchy root vegetable.',
        plantCost: 15,
        sellPrice: 25,
        growthTime: 30 * 1000, // 30 seconds
        unlockLevel: 2,
        balanceTags: ['common', 'root_vegetable'],
        seasonModifiers: { Spring: 1.1, Summer: 0.9, Autumn: 1.2, Winter: 1.0 },
        growthStages: [
            { stage: 0, duration: 15 * 1000, asset: '🌱' },
            { stage: 1, duration: 15 * 1000, asset: '🥕' },
            { stage: 2, duration: 0, asset: '🥕' },
        ]
    },
];

export const DEFAULT_PLACEABLE_ITEMS: PlaceableItem[] = [
    {
        id: 'scarecrow',
        name: 'Scarecrow',
        description: 'A friendly-looking scarecrow to watch over your crops.',
        type: 'decoration',
        cost: 100,
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
        cost: 250,
        width: 2,
        height: 2,
        asset: '🐔',
        unlockLevel: 2,
        producesProductId: 'egg',
        productionTime: 60 * 1000 // 1 minute
    },
    {
        id: 'mill',
        name: 'Mill',
        description: 'Grinds grains into flour.',
        type: 'factory',
        cost: 500,
        width: 3,
        height: 3,
        asset: '🏭',
        unlockLevel: 4,
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
        cost: 750,
        width: 3,
        height: 2,
        asset: '🥖',
        unlockLevel: 5,
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
        sellPrice: 20,
        asset: '🥚',
        unlockLevel: 2
    }
];

export const DEFAULT_PROCESSED_GOODS: ProcessedGood[] = [
    {
        id: 'flour',
        name: 'Flour',
        description: 'Finely ground wheat, perfect for baking.',
        sellPrice: 40,
        asset: '🥡',
        unlockLevel: 4
    },
    {
        id: 'bread',
        name: 'Bread',
        description: 'A warm, crusty loaf of bread.',
        sellPrice: 85,
        asset: '🍞',
        unlockLevel: 5
    }
];

export const DEFAULT_RECIPES: Recipe[] = [
    {
        id: 'wheat_to_flour',
        name: 'Grind Flour',
        description: 'Turn wheat into flour.',
        duration: 30 * 1000, // 30 seconds
        inputs: { wheat: 2 },
        outputId: 'flour',
        outputQuantity: 1,
        unlockLevel: 4
    },
    {
        id: 'flour_to_bread',
        name: 'Bake Bread',
        description: 'Bake flour into bread.',
        duration: 90 * 1000, // 1.5 minutes
        inputs: { flour: 2 },
        outputId: 'bread',
        outputQuantity: 1,
        unlockLevel: 5
    }
];
