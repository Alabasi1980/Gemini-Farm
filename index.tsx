<<<<<<< HEAD

=======
import '@angular/compiler';
>>>>>>> 06d4b89be5f8ccb60b11178b1904fcf215ba9396
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
  ],
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
