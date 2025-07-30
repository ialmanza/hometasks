import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/Supabase/supabaseservice';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  /**
   * Maneja el envío del formulario de login
   */
  onLogin() {
    if (!this.email || !this.password) {
      this.showError('Por favor completa todos los campos');
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    this.supabaseService.signIn(this.email, this.password).subscribe({
      next: (response: any) => {
        if (response.error) {
          this.handleLoginError(response.error);
        } else {
          console.log('Login exitoso:', response);
          this.showSuccess('¡Inicio de sesión exitoso!');
          setTimeout(() => {
            this.router.navigate(['/expenses-dashboard']);
          }, 1000);
        }
      },
      error: (error: any) => {
        console.error('Error en login:', error);
        this.showError('Error al conectar con el servidor');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Maneja los diferentes tipos de errores de login
   */
  private handleLoginError(error: any) {
    this.isLoading = false;

    switch (error.message) {
      case 'Invalid login credentials':
        this.showError('Email o contraseña incorrectos');
        break;
      case 'Email not confirmed':
        this.showError('Por favor confirma tu email antes de iniciar sesión');
        break;
      case 'Too many requests':
        this.showError('Demasiados intentos. Intenta de nuevo en unos minutos');
        break;
      default:
        this.showError('Error al iniciar sesión. Intenta de nuevo');
    }
  }

  /**
   * Maneja el clic en "¿Olvidaste tu contraseña?"
   */
  onForgotPassword() {
    if (!this.email) {
      this.showError('Por favor ingresa tu email para recuperar la contraseña');
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    this.supabaseService.resetPassword(this.email).subscribe({
      next: (response: any) => {
        if (response.error) {
          this.showError('Error al enviar el email de recuperación');
        } else {
          this.showSuccess('Email de recuperación enviado. Revisa tu bandeja de entrada');
        }
      },
      error: (error: any) => {
        console.error('Error al recuperar contraseña:', error);
        this.showError('Error al enviar el email de recuperación');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Navega directamente a la página de reset password
   */
  onGoToResetPassword() {
    console.log('Navegando a reset password');
    this.router.navigate(['/reset-password']);
  }

  /**
   * Maneja el login con Facebook
   */
  onFacebookLogin() {
    console.log('Iniciando sesión con Facebook');
    this.showError('Funcionalidad de Facebook en desarrollo');
    // Aquí puedes implementar la autenticación con Facebook
    // this.supabaseService.signInWithProvider('facebook')
  }

  /**
   * Maneja el login con Google
   */
  onGoogleLogin() {
    console.log('Iniciando sesión con Google');
    this.showError('Funcionalidad de Google en desarrollo');
    // Aquí puedes implementar la autenticación con Google
    // this.supabaseService.signInWithProvider('google')
  }

  /**
   * Maneja el clic en "¿No tienes una cuenta? Regístrate"
   */
  onRegister() {
    console.log('Redirigiendo a registro');
    this.router.navigate(['/register']);
  }

  /**
   * Método para limpiar el mensaje de error cuando el usuario empiece a escribir
   */
  onInputChange() {
    if (this.errorMessage || this.successMessage) {
      this.clearMessages();
    }
  }

  /**
   * Muestra un mensaje de error
   */
  private showError(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
  }

  /**
   * Muestra un mensaje de éxito
   */
  private showSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
  }

  /**
   * Limpia todos los mensajes de error y éxito
   */
  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
