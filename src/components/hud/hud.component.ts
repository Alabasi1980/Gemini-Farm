import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { GameClockService } from '../../services/game-clock.service';

@Component({
  selector: 'app-hud',
  templateUrl: './hud.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudComponent {
  gameStateService = inject(GameStateService);
  gameClockService = inject(GameClockService);

  playerState = this.gameStateService.state;
  
  gameDate = this.gameClockService.gameDate;
  season = this.gameClockService.currentSeason;
  weather = this.gameClockService.currentWeather;

  seasonIcon = computed(() => {
    switch(this.season()) {
      case 'Spring': return '🌸';
      case 'Summer': return '☀️';
      case 'Autumn': return '🍂';
      case 'Winter': return '❄️';
    }
  });

  weatherIcon = computed(() => {
    switch(this.weather()) {
        case 'Sunny': return '☀️';
        case 'Cloudy': return '☁️';
        case 'Rainy': return '🌧️';
        case 'Snowy': return '🌨️';
        case 'Windy': return '💨';
        case 'Stormy': return '⛈️';
    }
  });
}