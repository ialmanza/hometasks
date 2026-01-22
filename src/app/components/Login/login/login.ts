import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/Supabase/supabaseservice';
import { PushSubscriptionService } from '../../../services/push-subscription.service';
import { SecuritySettingsService } from '../../../services/security-settings.service';
import { SessionHelperService } from '../../../services/session-helper.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  isCheckingInitialSession: boolean = true; // Estado para verificación inicial
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private pushSubscriptionService: PushSubscriptionService,
    private securitySettingsService: SecuritySettingsService,
    private sessionHelper: SessionHelperService
  ) {}

  /**
   * Verifica si hay sesión válida y PIN configurado al inicializar el componente
   * Si ambas condiciones se cumplen, redirige automáticamente a /lock
   */
  async ngOnInit() {
    this.isCheckingInitialSession = true;
    
    try {
      // Usar el servicio helper para verificar sesión y PIN
      const result = await this.sessionHelper.checkSessionAndPin();
      
      if (result.shouldShowLock) {
        // Usuario tiene sesión válida y PIN configurado → redirigir a lock screen
        console.log('Usuario con sesión y PIN configurado, redirigiendo a lock screen');
        this.router.navigate(['/lock'], { 
          queryParams: { returnUrl: '/expenses-dashboard' } 
        });
        return;
      }
      
      // Si hay error pero no es crítico, continuar con login normal
      if (result.session.error && !result.session.hasSession) {
        console.warn('Error verificando sesión:', result.session.error);
      }
    } catch (error) {
      console.error('Error en verificación inicial:', error);
      // Si hay cualquier error, mostrar formulario de login normalmente
    } finally {
      this.isCheckingInitialSession = false;
    }
  }

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
      next: async (response: any) => {
        if (response.error) {
          this.handleLoginError(response.error);
        } else {
          console.log('Login exitoso:', response);
          
          // Limpiar cache para forzar verificación fresca después del login
          // Esto asegura que no se use información obsoleta de sesiones anteriores
          this.sessionHelper.clearCache();
          
          // Esperar un momento para que la sesión se propague completamente en localStorage
          // Esto es necesario porque Supabase puede tardar un poco en almacenar la sesión
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Inicializar notificaciones push en background (no bloquea la navegación)
          this.pushSubscriptionService.checkAndSubscribe().catch(error => {
            console.error('Error inicializando notificaciones push:', error);
          });
          
          // Verificar si el usuario tiene PIN configurado usando el servicio helper
          // Usar useCache: false para forzar verificación fresca sin usar cache
          try {
            const pinResult = await this.sessionHelper.checkPinConfigured(undefined, false);
            
            if (pinResult.hasPinConfigured) {
              // Usuario tiene PIN configurado → redirigir directamente a lock screen
              // Esto evita la doble verificación (login + lock)
              console.log('Usuario con PIN configurado, redirigiendo a lock screen');
              this.router.navigate(['/lock'], { 
                queryParams: { returnUrl: '/expenses-dashboard' } 
              });
            } else {
              // Usuario no tiene PIN configurado → redirigir al dashboard
              // El AuthGuard se encargará de redirigir a settings si es necesario
              this.router.navigate(['/expenses-dashboard']);
            }
          } catch (settingsError) {
            console.error('Error verificando configuración de seguridad después del login:', settingsError);
            // Si falla la verificación, redirigir al dashboard (fallback seguro)
            this.router.navigate(['/expenses-dashboard']);
          }
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
