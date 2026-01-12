import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-hud',
  templateUrl: './hud.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudComponent {
  gameStateService = inject(GameStateService);
  playerState = this.gameStateService.state;
}
