import { Injectable, signal, computed, inject } from '@angular/core';
import { LeaderboardEntry } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';

const MOCK_NAMES = [
    'Willow', 'Jasper', 'Clover', 'Axel', 'Briar', 'Rowan',
    'Sage', 'Finn', 'Hazel', 'Silas', 'Ivy', 'Leo',
    'Poppy', 'Kai', 'Olive', 'Ronan', 'Juniper', 'Asher',
    'Luna', 'Felix', 'Aurora', 'Theo', 'Stella', 'Milo'
];


@Injectable({ providedIn: 'root' })
export class CommunityService {
    private gameStateService = inject(GameStateService);

    leaderboard = computed<LeaderboardEntry[]>(() => {
        const playerState = this.gameStateService.state();
        const mockData: Omit<LeaderboardEntry, 'rank'>[] = [];

        // Add current player
        mockData.push({
            name: 'You',
            level: playerState.level,
            xp: playerState.xp,
            isPlayer: true
        });

        // Generate other players
        for (let i = 0; i < 24; i++) {
            const xp = Math.floor(Math.random() * (playerState.xp * 2.5)) + 50;
            const level = Math.floor(xp / 1000) + 1;
            mockData.push({
                name: MOCK_NAMES[i],
                level: level,
                xp: xp,
                isPlayer: false
            });
        }

        // Sort by XP and add rank
        return mockData
            .sort((a, b) => b.xp - a.xp)
            .map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));
    });
}