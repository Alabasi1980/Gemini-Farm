import { Injectable, signal, inject } from '@angular/core';
import { LeaderboardEntry } from '../../../shared/types/game.types';
import { GameStateService } from '../../player/services/game-state.service';
import { DatabaseService } from '../../../shared/services/database.service';
import { AuthenticationService } from '../../player/services/authentication.service';

@Injectable({ providedIn: 'root' })
export class CommunityService {
    private gameStateService = inject(GameStateService);
    private dbService = inject(DatabaseService);
    private authService = inject(AuthenticationService);

    leaderboard = signal<LeaderboardEntry[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    async loadLeaderboard(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
            const [users, players] = await Promise.all([
                this.dbService.getAllUsers(),
                this.dbService.getAllPlayers()
            ]);
            
            const currentUserId = this.authService.userId();
            const usersMap = new Map(users.map(u => [u.uid, u]));

            const combinedData = players
                .map(p => {
                    // FIX: Cast the user from the map to correctly access its properties.
                    const user = usersMap.get(p.uid) as { email: string };
                    if (!user || !p.playerState) return null;
                    return {
                        name: user.email,
                        level: p.playerState.level,
                        xp: p.playerState.xp,
                        isPlayer: p.uid === currentUserId,
                    };
                })
                .filter((p): p is Omit<LeaderboardEntry, 'rank'> => p !== null);

            // Sort by XP and add rank
            const sortedLeaderboard = combinedData
                .sort((a, b) => b.xp - a.xp)
                .map((entry, index) => ({
                    ...entry,
                    rank: index + 1
                }));
            
            this.leaderboard.set(sortedLeaderboard);

        } catch (err) {
            console.error(err);
            this.error.set('Failed to load leaderboard data.');
        } finally {
            this.loading.set(false);
        }
    }
}
