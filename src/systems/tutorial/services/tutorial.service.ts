import { Injectable, signal, effect, computed, inject } from '@angular/core';
import { GameStateService } from '../../player/services/game-state.service';
import { PlacementService } from '../../farm/services/placement.service';

export interface TutorialStep {
  step: number;
  text: string;
  targetId: string; // DOM element ID for highlighting
  highlightPadding?: number;
  isActionRequired: boolean; // Does the user need to perform an action?
}

const TUTORIAL_STEPS: TutorialStep[] = [
    { step: 0, text: "Welcome to Gemini Farm! Let's learn the basics. Click 'Next' to continue.", targetId: 'tutorial-box', isActionRequired: false },
    { step: 1, text: "This is your farm. Let's start by planting something. Click on an empty plot of land.", targetId: 'tutorial-plot', isActionRequired: true, highlightPadding: 10 },
    { step: 2, text: "Great! Now select Wheat. It's a fast-growing crop, perfect for starting out.", targetId: 'tutorial-plant-wheat', isActionRequired: true, highlightPadding: 5 },
    { step: 3, text: "Excellent! Your wheat is growing. You can see the progress on the plot. We'll wait for it to be ready.", targetId: 'farm-page', isActionRequired: true, highlightPadding: 20 },
    { step: 4, text: "Your Wheat is ready to be harvested! Click the glowing plot to collect it.", targetId: 'tutorial-plot', isActionRequired: true, highlightPadding: 10 },
    { step: 5, text: "Good job! The harvested Wheat is now in your inventory. Let's go sell it. Click the Inventory tab on the left.", targetId: 'tutorial-inventory-tab', isActionRequired: true, highlightPadding: 5 },
    { step: 6, text: "Here you can see all your items. Let's sell the Wheat to earn some coins. Click 'Sell All'.", targetId: 'tutorial-sell-wheat', isActionRequired: true, highlightPadding: 5 },
    { step: 7, text: "You've earned your first coins! Now, let's buy a building. Click on the Shop tab.", targetId: 'tutorial-shop-tab', isActionRequired: true, highlightPadding: 5 },
    { step: 8, text: "The shop has many items. Let's buy a Chicken Coop. It will produce eggs for you.", targetId: 'tutorial-buy-coop', isActionRequired: true, highlightPadding: 5 },
    { step: 9, text: "You're all set! The Chicken Coop has been placed on your farm. You can move it around later. You've learned the basics!", targetId: 'tutorial-coop-placed', isActionRequired: false, highlightPadding: 20 },
    { step: 10, text: "As a reward for completing the tutorial, here are some bonus coins and XP. Happy farming!", targetId: 'tutorial-box', isActionRequired: false },
];

@Injectable({ providedIn: 'root' })
export class TutorialService {
    private gameStateService = inject(GameStateService);
    private placementService = inject(PlacementService);

    isTutorialCompleted = computed(() => this.gameStateService.state()?.milestones?.tutorialCompleted ?? true);
    currentStepIndex = signal(0);
    
    currentStep = computed<TutorialStep | null>(() => {
        if (this.isTutorialCompleted()) return null;
        const index = this.gameStateService.state()?.milestones?.tutorialStep ?? 0;
        return TUTORIAL_STEPS[index];
    });

    constructor() {
        // Effect for auto-advancing steps based on game state changes
        effect(() => {
            const step = this.currentStep();
            if (!step || !step.isActionRequired) return;
            const currentStepIndex = this.gameStateService.state()?.milestones?.tutorialStep ?? 0;
            if (step.step !== currentStepIndex) return;

            switch (step.step) {
                // After planting, wait for wheat to appear in inventory (meaning it was harvested)
                case 3:
                    const inventory = this.gameStateService.state()?.inventory;
                    if (inventory && inventory['wheat'] > 0) {
                        this.advanceStep();
                    }
                    break;
                // After buying coop, wait for it to be placed on the farm
                case 9:
                    const hasCoop = this.placementService.placedObjects().some(obj => obj.itemId === 'chicken_coop');
                    if(hasCoop) {
                       this.advanceStep();
                    }
                    break;
            }
        });
    }

    advanceStep() {
        const state = this.gameStateService.state();
        if (!state || state.milestones?.tutorialCompleted) return;

        const currentStepIndex = state.milestones?.tutorialStep ?? 0;
        const nextStepIndex = currentStepIndex + 1;

        if (nextStepIndex >= TUTORIAL_STEPS.length) {
            this.completeTutorial();
            return;
        }

        this.updatePlayerState({ tutorialStep: nextStepIndex });
        
        if (nextStepIndex === 10) { // On the final reward step
            this.giveCompletionReward();
        }
    }

    completeTutorial() {
        const state = this.gameStateService.state();
        if(state && !state.milestones?.tutorialCompleted) {
            this.updatePlayerState({ tutorialCompleted: true });
        }
    }
    
    private async giveCompletionReward() {
        await this.gameStateService.applyResourceChanges({ coins: 100, xp: 50 });
    }

    private updatePlayerState(milestoneUpdate: { [key: string]: any }) {
        this.gameStateService.state.update(s => {
            if (!s) return null;
            return {
                ...s,
                milestones: { ...s.milestones, ...milestoneUpdate }
            }
        });
    }

    public triggerAction(targetId: string) {
        const step = this.currentStep();
        if (step && step.isActionRequired && step.targetId === targetId) {
            if ([3, 9].includes(step.step)) return; 
            
            this.advanceStep();
        }
    }
}
