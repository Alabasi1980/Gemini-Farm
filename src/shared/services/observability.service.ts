import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { AuthenticationService } from '../../systems/player/services/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class ObservabilityService {
  private dbService = inject(DatabaseService);
  private authService = inject(AuthenticationService);

  logError(error: any, context: string = 'Unknown'): void {
    try {
        const user = this.authService.user();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack ?? 'No stack available' : 'N/A';
        
        const logData = {
            userId: user?.uid ?? null,
            userEmail: user?.email ?? null,
            errorMessage,
            errorStack,
            context,
            userAgent: navigator.userAgent,
            // Timestamp is added by the database service
        };

        this.dbService.logClientError(logData);
    } catch (loggingError) {
        console.error("Failed to log error:", loggingError);
    }
  }
  
  logEvent(eventName: string, details: { [key: string]: any } = {}): void {
     try {
        const user = this.authService.user();
        
        const eventData = {
            userId: user?.uid ?? null,
            userEmail: user?.email ?? null,
            eventName,
            details,
            // Timestamp is added by the database service
        };
        
        this.dbService.logAnalyticsEvent(eventData);
    } catch (loggingError) {
        console.error("Failed to log analytics event:", loggingError);
    }
  }
}
