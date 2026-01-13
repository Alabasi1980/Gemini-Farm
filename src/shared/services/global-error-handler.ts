import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ObservabilityService } from './observability.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private observabilityService = inject(ObservabilityService);

  handleError(error: any): void {
    // Log the error to your backend/observability service
    this.observabilityService.logError(error, 'GlobalErrorHandler');

    // Also log to the console for developers
    console.error('An unhandled error occurred:', error);
  }
}
