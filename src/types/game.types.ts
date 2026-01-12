export interface PlayerState {
  coins: number;
  xp: number;
  level: number;
  storage: {
    current: number;
    max: number;
  };
  inventory: Map<string, number>;
}

export type PlotState = 'locked' | 'empty' | 'planted';

export interface Plot {
  id: number;
  x: number;
  y: number;
  state: PlotState;
  cropId?: string;
  plantTime?: number;
}

export interface CropGrowthStage {
  stage: number; // e.g., 0, 1, 2, 3
  duration: number; // ms until this stage is complete
  asset: string; // e.g., emoji or image path
}

export interface Crop {
  id: string;
  name: string;
  plantCost: number;
  sellPrice: number;
  growthTime: number; // total ms for full growth
  growthStages: CropGrowthStage[];
}

// Object types
export type ObjectType = 'decoration' | 'building' | 'animal_housing' | 'factory';

export interface PlaceableItem {
  id: string;
  name: string;
  type: ObjectType;
  cost: number;
  width: number; // in grid cells
  height: number; // in grid cells
  asset: string; // emoji
  // Optional properties
  producesProductId?: string;
  productionTime?: number; // ms
  recipeIds?: string[];
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
  sellPrice: number;
  asset: string; // emoji
}

export interface AnimalBuildingState {
  instanceId: number;
  lastCollectionTime: number;
}

// Factory-related types
export interface Recipe {
    id: string;
    name: string;
    duration: number; // ms
    inputs: Map<string, number>; // itemId -> quantity
    outputId: string;
    outputQuantity: number;
}

export interface ProcessedGood {
    id: string;
    name: string;
    sellPrice: number;
    asset: string;
}

export interface FactoryState {
    instanceId: number;
    activeRecipeId: string | null;
    productionStartTime: number | null;
    outputReady: boolean;
}

// Generic type for displaying items in inventory
export interface DisplayItem {
    id: string;
    name: string;
    sellPrice: number;
    asset: string;
    quantity: number;
}
