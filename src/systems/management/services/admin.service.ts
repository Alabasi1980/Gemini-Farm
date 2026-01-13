import { Injectable, signal, inject } from '@angular/core';
import { DatabaseService } from '../../../shared/services/database.service';
import { AdminAuditLog, AnalyticsEvent, ClientErrorLog, PlayerState } from '../../../shared/types/game.types';
import { AuthenticationService } from '../../player/services/authentication.service';

export interface PlayerAdminView {
    uid: string;
    email: string;
    role: 'player' | 'admin';
    playerState: PlayerState;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private dbService = inject(DatabaseService);
    private authService = inject(AuthenticationService);

    players = signal<PlayerAdminView[]>([]);
    auditLogs = signal<AdminAuditLog[]>([]);
    errorLogs = signal<ClientErrorLog[]>([]);
    analyticsEvents = signal<AnalyticsEvent[]>([]);

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
        const adminUser = this.authService.user();
        if (!player || amount <= 0 || !adminUser) return;

        const newCoins = player.playerState.coins + amount;

        // Log the action before performing it
        await this.dbService.logAdminAction({
            adminUid: adminUser.uid,
            adminEmail: adminUser.email,
            action: 'GIVE_COINS',
            targetUid: player.uid,
            targetEmail: player.email,
            details: {
                amount: amount,
                oldValue: player.playerState.coins,
                newValue: newCoins
            }
        });

        await this.dbService.updatePlayerState(userId, { coins: newCoins });
        this.refreshPlayerData(userId, { coins: newCoins });
    }

    async giveXp(userId: string, amount: number): Promise<void> {
        const player = this.players().find(p => p.uid === userId);
        const adminUser = this.authService.user();
        if (!player || amount <= 0 || !adminUser) return;
        
        const newXp = player.playerState.xp + amount;

        // Log the action
        await this.dbService.logAdminAction({
            adminUid: adminUser.uid,
            adminEmail: adminUser.email,
            action: 'GIVE_XP',
            targetUid: player.uid,
            targetEmail: player.email,
            details: {
                amount: amount,
                oldValue: player.playerState.xp,
                newValue: newXp
            }
        });
        
        await this.dbService.updatePlayerState(userId, { xp: newXp });
        this.refreshPlayerData(userId, { xp: newXp });
    }

    async loadAuditLogs(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
            const logs = await this.dbService.getAdminAuditLogs();
            this.auditLogs.set(logs);
        } catch (err) {
            console.error(err);
            this.error.set('Failed to load audit logs.');
        } finally {
            this.loading.set(false);
        }
    }

    async loadErrorLogs(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
            const logs = await this.dbService.getClientErrors();
            this.errorLogs.set(logs);
        } catch (err) {
            console.error(err);
            this.error.set('Failed to load error logs.');
        } finally {
            this.loading.set(false);
        }
    }

    async loadAnalyticsEvents(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
            const events = await this.dbService.getAnalyticsEvents();
            this.analyticsEvents.set(events);
        } catch (err) {
            console.error(err);
            this.error.set('Failed to load analytics events.');
        } finally {
            this.loading.set(false);
        }
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