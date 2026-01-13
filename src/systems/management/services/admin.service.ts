import { Injectable, signal, inject } from '@angular/core';
import { DatabaseService, UserProfile } from '../../../shared/services/database.service';
import { PlayerState } from '../../../shared/types/game.types';

export interface PlayerAdminView {
    uid: string;
    email: string;
    role: 'player' | 'admin';
    playerState: PlayerState;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private dbService = inject(DatabaseService);

    players = signal<PlayerAdminView[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    async loadAllPlayers(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
            const [users, players] = await Promise.all([
                this.dbService.getAllUsers(),
                this.dbService.getAllPlayers()
            ]);
            
            const usersMap = new Map(users.map(u => [u.uid, u]));

            const combinedData: PlayerAdminView[] = players
                .map(p => {
                    // FIX: Cast the user from the map to correctly access its properties.
                    const user = usersMap.get(p.uid) as { email: string; role: 'player' | 'admin' };
                    if (!user) return null; // Player data without a user profile
                    return {
                        uid: p.uid,
                        email: user.email,
                        role: user.role,
                        playerState: p.playerState,
                    };
                })
                .filter((p): p is PlayerAdminView => p !== null)
                .sort((a, b) => b.playerState.level - a.playerState.level); // Sort by level descending

            this.players.set(combinedData);

        } catch (err) {
            console.error(err);
            this.error.set('Failed to load player data.');
        } finally {
            this.loading.set(false);
        }
    }

    async giveCoins(userId: string, amount: number): Promise<void> {
        const player = this.players().find(p => p.uid === userId);
        if (!player || amount <= 0) return;

        const newCoins = player.playerState.coins + amount;
        await this.dbService.updatePlayerState(userId, { coins: newCoins });
        this.refreshPlayerData(userId, { coins: newCoins });
    }

    async giveXp(userId: string, amount: number): Promise<void> {
        const player = this.players().find(p => p.uid === userId);
        if (!player || amount <= 0) return;
        
        const newXp = player.playerState.xp + amount;
        await this.dbService.updatePlayerState(userId, { xp: newXp });
        this.refreshPlayerData(userId, { xp: newXp });
    }

    private refreshPlayerData(userId: string, updates: Partial<PlayerState>) {
        this.players.update(players => 
            players.map(p => 
                p.uid === userId 
                    ? { ...p, playerState: { ...p.playerState, ...updates } } 
                    : p
            )
        );
    }
}
