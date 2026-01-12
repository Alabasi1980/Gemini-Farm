import { Injectable, signal, computed } from '@angular/core';
import { Season, Weather } from '../../../shared/types/game.types';

const GAME_HOUR_IN_MS = 2000; // 1 game hour = 2 seconds real time
const DAYS_PER_SEASON = 30;

interface GameDate {
    day: number;
    hour: number;
    year: number;
}

const SEASON_WEATHER_PROBABILITY: Record<Season, Record<Weather, number>> = {
    Spring: { Sunny: 0.4, Cloudy: 0.25, Rainy: 0.3, Stormy: 0.05, Windy: 0, Snowy: 0 },
    Summer: { Sunny: 0.6, Cloudy: 0.2, Rainy: 0.1, Stormy: 0.1, Windy: 0, Snowy: 0 },
    Autumn: { Sunny: 0.3, Cloudy: 0.3, Rainy: 0.2, Windy: 0.15, Stormy: 0.05, Snowy: 0 },
    Winter: { Sunny: 0.2, Cloudy: 0.4, Rainy: 0.1, Snowy: 0.25, Windy: 0.05, Stormy: 0 },
};

@Injectable({
  providedIn: 'root',
})
export class GameClockService {
    gameDate = signal<GameDate>({ day: 1, hour: 6, year: 1 });
    currentWeather = signal<Weather>('Sunny');

    currentSeason = computed<Season>(() => {
        const dayOfYear = this.gameDate().day;
        if (dayOfYear <= DAYS_PER_SEASON) return 'Spring';
        if (dayOfYear <= DAYS_PER_SEASON * 2) return 'Summer';
        if (dayOfYear <= DAYS_PER_SEASON * 3) return 'Autumn';
        return 'Winter';
    });

    constructor() {
        setInterval(() => this.advanceTime(), GAME_HOUR_IN_MS);
    }

    private advanceTime() {
        this.gameDate.update(date => {
            let { day, hour, year } = date;
            hour++;

            if (hour >= 24) {
                hour = 0;
                day++;
                this.updateWeather();
            }

            if (day > DAYS_PER_SEASON * 4) {
                day = 1;
                year++;
            }
            
            return { day, hour, year };
        });
    }

    private updateWeather() {
        const season = this.currentSeason();
        const probabilities = SEASON_WEATHER_PROBABILITY[season];
        const rand = Math.random();
        let cumulative = 0;

        for (const [weather, prob] of Object.entries(probabilities)) {
            if (prob === 0) continue;
            cumulative += prob;
            if (rand < cumulative) {
                this.currentWeather.set(weather as Weather);
                return;
            }
        }
    }
}