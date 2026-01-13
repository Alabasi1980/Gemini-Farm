import { ChangeDetectionStrategy, Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TutorialService } from '../../services/tutorial.service';

@Component({
  selector: 'app-tutorial-guide',
  templateUrl: './tutorial-guide.component.html',
  imports: [CommonModule],
})
export class TutorialGuideComponent {
    tutorialService = inject(TutorialService);
    
    step = this.tutorialService.currentStep;
    highlightStyle = signal<{ [key: string]: string }>({});
    
    isPlayerActionPending = computed(() => {
        const currentStep = this.step();
        if (!currentStep) return false;
        
        // These are waiting steps, not "Next" button steps
        return [3, 9].includes(currentStep.step);
    });

    constructor() {
        effect(() => {
            const currentStep = this.step();
            if (currentStep) {
                // Use a timeout to allow the DOM to update for new elements
                setTimeout(() => this.updateHighlight(currentStep.targetId, currentStep.highlightPadding), 100);
            }
        });
    }

    updateHighlight(targetId: string, padding = 0) {
        const element = document.querySelector(`[data-tutorial-id='${targetId}']`);
        if (element) {
            const rect = element.getBoundingClientRect();
            this.highlightStyle.set({
                'position': 'fixed',
                'left': `${rect.left - padding}px`,
                'top': `${rect.top - padding}px`,
                'width': `${rect.width + (padding * 2)}px`,
                'height': `${rect.height + (padding * 2)}px`,
                'box-shadow': '0 0 0 5000px rgba(0, 0, 0, 0.7)',
                'border-radius': '8px',
                'pointer-events': 'none',
                'transition': 'all 0.3s ease-in-out',
                'z-index': '9998',
            });
        } else {
             this.highlightStyle.set({ 'display': 'none' });
        }
    }

    next() {
        if (this.isPlayerActionPending()) return;
        this.tutorialService.advanceStep();
    }

    skip() {
        this.tutorialService.completeTutorial();
    }
}