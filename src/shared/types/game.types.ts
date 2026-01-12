export interface PlayerState {
  coins: number;
  xp: number;
  level: number;
  storage: {
    max: number;
  };
  inventory: { [itemId: string]: number };
  expansionsPurchased: number;
}

export type TileState = 'locked' | 'free_space' | 'empty_plot' | 'planted_plot';

export interface FarmTile {
  id: number;
  x: number;
  y: number;
  state: TileState;
  cropId?: string;
  plantTime?: number;
}

export interface CropGrowthStage {
  stage: number; // e.g., 0, 1, 2, 3
  duration: number; // ms until this stage is complete
  asset: string; // e.g., emoji or image path
}

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';
export type Weather = 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Windy' | 'Stormy';

export interface Crop {
  // FIX: `id` is always present on client-side Crop objects. Making it required simplifies type checks.
  id: string;
  name: string;
  description: string;
  plantCost: number;
  sellPrice: number;
  growthTime: number; // total ms for full growth
  growthStages: CropGrowthStage[];
  seasonModifiers: Partial<Record<Season, number>>;
  unlockLevel: number;
  balanceTags: string[]; // e.g., ['common', 'fast_grow']
}

// Object types
export type ObjectType = 'decoration' | 'building' | 'animal_housing' | 'factory';

export interface PlaceableItem {
  id: string;
  name: string;
  description: string;
  type: ObjectType;
  cost: number;
  width: number; // in grid cells
  height: number; // in grid cells
  asset: string; // emoji
  unlockLevel: number;
  // Optional properties for specific types
  producesProductId?: string;
  productionTime?: number; // ms
  recipeIds?: string[];
  baseQueueSize?: number;
  upgradeCost?: number;
  speedPerLevel?: number; // e.g., 0.1 for 10%
}

export interface FarmObject {
  instanceId: number; // unique instance id
  itemId: string;
  x: number; // grid coordinate
  y: number; // grid coordinate
}

// Animal-related types
export interface AnimalProduct {
  id: string;
  name: string;
  description: string;
  sellPrice: number;
  asset: string; // emoji
  unlockLevel: number;
}

export interface AnimalBuildingState {
  instanceId: number;
  lastCollectionTime: number;
}

// Factory-related types
export interface Recipe {
    id:string;
    name: string;
    description: string;
    duration: number; // ms
    inputs: { [itemId: string]: number };
    outputId: string;
    outputQuantity: number;
    unlockLevel: number;
}

export interface ProcessedGood {
    id: string;
    name: string;
    description: string;
    sellPrice: number;
    asset: string;
    unlockLevel: number;
}

export interface ProductionJob {
    jobId: number;
    recipeId: string;
    startTime: number;
}

export interface FactoryState {
    instanceId: number;
    level: number;
    queue: ProductionJob[];
    outputReady: boolean;
    autoRun: boolean;
    lastRecipeId: string | null;
}


// Task-related types
export type TaskType = 'INVENTORY';

export interface TaskReward {
    coins: number;
    xp: number;
}

export interface GameTask {
    id:string;
    description: string;
    type: TaskType;
    targetItemId: string;
    targetQuantity: number;
    reward: TaskReward;
}

export interface TaskState {
    taskId: string;
    progress: number;
    completed: boolean;
    claimed: boolean;
}

// Community-related types
export interface LeaderboardEntry {
    rank: number;
    name: string;
    level: number;
    xp: number;
    isPlayer: boolean;
}

// Market-related types
export interface MarketEvent {
    id: string;
    description: string; // "Wheat prices are booming!"
    itemId: string;      // "wheat"
    priceMultiplier: number; // e.g., 1.5 for +50%
}

// Worker-related types
export type WorkerStatus = 'Idle' | 'Working' | 'Moving';

export interface ActionLog {
    timestamp: number;
    message: string;
}

export interface Worker {
    id: string;
    name: string;
    asset: string;
    status: WorkerStatus;
    active: boolean;
    x: number; // grid coordinate
    y: number; // grid coordinate
    lastAction?: ActionLog;
}


// Generic type for displaying items in inventory
export interface DisplayItem {
    id: string;
    name: string;
    sellPrice: number;
    asset: string;
    quantity: number;
}

// --- Database Document Type ---
export interface GameDataDocument {
    playerState: PlayerState;
    // Add other systems to save here later, e.g., farm, production
}