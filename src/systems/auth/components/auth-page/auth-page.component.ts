import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthenticationService } from '../../../player/services/authentication.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'auth-page',
  templateUrl: './auth-page.component.html',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageComponent {
  private authService = inject(AuthenticationService);
  // FIX: Explicitly type `fb` to avoid a type inference issue where it becomes `unknown`.
  private fb: FormBuilder = inject(FormBuilder);

  mode = signal<AuthMode>('login');
  loading = signal(false);
  error = signal<string | null>(null);

  authForm: FormGroup;

  constructor() {
    // FIX: Initializing the form group in the constructor ensures that the
    // FormBuilder dependency (`fb`) is resolved before it is used.
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get email() { return this.authForm.get('email'); }
  get password() { return this.authForm.get('password'); }

  toggleMode() {
    this.mode.update(current => current === 'login' ? 'register' : 'login');
    this.authForm.reset();
    this.error.set(null);
  }

  async onSubmit() {
    if (this.authForm.invalid) {
      return;
    }
    
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.authForm.value;

    try {
      if (this.mode() === 'login') {
        await this.authService.login(email!, password!);
      } else {
        await this.authService.register(email!, password!);
      }
    } catch (err: any) {
      console.error("Authentication Error:", err); // Log the full Firebase error for debugging
      this.error.set(this.getFriendlyErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private getFriendlyErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please log in.';
      case 'auth/weak-password':
        return 'Password is too weak. It should be at least 6 characters long.';
      case 'auth/operation-not-allowed':
        return 'Registration is currently disabled. Please enable Email/Password sign-in in your Firebase console.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }
}