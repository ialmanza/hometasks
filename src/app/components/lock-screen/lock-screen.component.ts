import { Component, OnInit, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PinService } from '../../services/pin.service';
import { SecuritySettingsService } from '../../services/security-settings.service';
import { AuthService } from '../../services/auth.service';
import { PinLockService } from '../../services/pin-lock.service';
import { BiometricService } from '../../services/biometric.service';
import { supabase } from '../../services/Supabase-Client/supabase-client';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lock-screen.component.html',
  styleUrl: './lock-screen.component.css'
})
export class LockScreenComponent implements OnInit, OnDestroy {
  // Estados
  pin = signal<string>('');
  isProcessing = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showError = signal<boolean>(false);
  lockState = signal<{
    isLocked: boolean;
    failedAttempts: number;
    lockedUntil: Date | null | undefined;
    canAttempt: boolean;
  } | null>(null);
  
  // Biometría
  isBiometricAvailable = signal<boolean>(false);
  isBiometricEnabled = signal<boolean>(false);
  biometricKeyId = signal<string | null>(null);
  isBiometricProcessing = signal<boolean>(false);
  
  // Contador de tiempo de bloqueo
  lockoutSecondsRemaining = signal<number>(0);
  private lockoutInterval: any = null;

  // Ruta de retorno después del desbloqueo
  private returnUrl: string | null = null;

  // Longitud del PIN
  readonly PIN_LENGTH = 6;

  constructor(
    private pinService: PinService,
    private securitySettingsService: SecuritySettingsService,
    private authService: AuthService,
    private pinLockService: PinLockService,
    private biometricService: BiometricService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Cargar estado del bloqueo cuando el componente se inicializa
    effect(async () => {
      await this.loadLockState();
    });
  }

  async ngOnInit() {
    // Capturar returnUrl de los query params si existe
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || null;
    });
    
    // Verificar que haya una sesión válida (local o de Supabase) antes de continuar
    const hasLocalSession = await this.authService.hasLocalSession();
    if (!hasLocalSession) {
      // No hay sesión local - verificar si hay sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        // No hay sesión válida - redirigir a login
        console.warn('No hay sesión válida, redirigiendo a login');
        this.router.navigate(['/login']);
        return;
      }
      // Hay sesión de Supabase válida - continuar
    }
    
    // Cargar estado del bloqueo
    await this.loadLockState();
    this.startLockoutTimer();
    
    // Verificar disponibilidad de biometría
    await this.checkBiometricAvailability();
    
    // Intentar biometría automáticamente si está disponible y configurada
    // (solo si no está en lockout)
    const state = this.lockState();
    if (this.isBiometricEnabled() && this.isBiometricAvailable() && state?.canAttempt) {
      // Esperar un poco antes de intentar para dar tiempo a que cargue la UI
      setTimeout(() => {
        this.attemptBiometric();
      }, 500);
    }
  }
  
  /**
   * Verifica la disponibilidad de biometría y carga la configuración
   */
  async checkBiometricAvailability() {
    try {
      // Verificar soporte del navegador
      const isSupported = this.biometricService.isSupported();
      if (!isSupported) {
        this.isBiometricAvailable.set(false);
        return;
      }

      // Verificar que haya una sesión válida antes de intentar obtener settings
      const hasLocalSession = await this.authService.hasLocalSession();
      if (!hasLocalSession) {
        // Verificar sesión de Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          // No hay sesión válida - no mostrar biometría
          this.isBiometricAvailable.set(false);
          return;
        }
      }

      // Verificar si está habilitada y obtener credentialId
      const settings = await this.securitySettingsService.getSettings();
      if (settings) {
        this.isBiometricEnabled.set(!!settings.biometric_key_id);
        this.biometricKeyId.set(settings.biometric_key_id || null);
        this.isBiometricAvailable.set(true);
      } else {
        this.isBiometricAvailable.set(false);
      }
    } catch (error) {
      console.error('Error al verificar disponibilidad biométrica:', error);
      this.isBiometricAvailable.set(false);
    }
  }

  /**
   * Intenta desbloquear usando biometría
   */
  async attemptBiometric() {
    if (this.isProcessing() || this.isBiometricProcessing()) {
      return;
    }

    const state = this.lockState();
    if (state && !state.canAttempt) {
      return; // Está en lockout, no intentar biometría
    }

    // Verificar que esté disponible y configurada
    if (!this.isBiometricAvailable() || !this.isBiometricEnabled()) {
      return;
    }

    this.isBiometricProcessing.set(true);
    this.clearError();

    try {
      const result = await this.biometricService.authenticatePasskey();

      if (result.ok) {
        // Biometría exitosa - marcar como desbloqueado y redirigir
        this.pinLockService.markUnlocked();
        this.onUnlockSuccess();
      } else {
        // Error en biometría - mostrar mensaje pero no contar como intento fallido
        // Permitir que el usuario intente con PIN
        if (result.message && result.message !== 'Autenticación cancelada por el usuario') {
          this.showErrorMessage(result.message);
        }
        // Si fue cancelado por el usuario, no mostrar error (comportamiento esperado)
      }
    } catch (error) {
      console.error('Error al intentar biometría:', error);
      // No mostrar error si fue cancelado por el usuario
    } finally {
      this.isBiometricProcessing.set(false);
    }
  }

  ngOnDestroy() {
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
    }
  }

  /**
   * Carga el estado actual del bloqueo
   */
  async loadLockState() {
    try {
      // Verificar que haya una sesión válida antes de intentar cargar settings
      const hasLocalSession = await this.authService.hasLocalSession();
      if (!hasLocalSession) {
        // Verificar sesión de Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          // No hay sesión válida - redirigir a login
          console.warn('No hay sesión válida al cargar estado de bloqueo');
          this.router.navigate(['/login']);
          return;
        }
      }
      
      const state = await this.securitySettingsService.getLockState();
      this.lockState.set({
        isLocked: state.isLocked,
        failedAttempts: state.failedAttempts,
        lockedUntil: state.lockedUntil ?? null,
        canAttempt: state.canAttempt
      });
      
      // Iniciar timer si está bloqueado
      if (state.lockedUntil && state.lockedUntil > new Date()) {
        this.startLockoutTimer();
      }
    } catch (error) {
      console.error('Error al cargar estado de bloqueo:', error);
      // Si hay error, establecer estado por defecto (no bloqueado)
      this.lockState.set({
        isLocked: false,
        failedAttempts: 0,
        lockedUntil: null,
        canAttempt: true
      });
    }
  }

  /**
   * Inicia el temporizador de bloqueo
   */
  startLockoutTimer() {
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
    }

    const state = this.lockState();
    if (!state?.lockedUntil) {
      this.lockoutSecondsRemaining.set(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const lockedUntil = state.lockedUntil;

      if (!lockedUntil || lockedUntil <= now) {
        // Bloqueo expirado
        this.lockoutSecondsRemaining.set(0);
        this.loadLockState(); // Recargar estado
        if (this.lockoutInterval) {
          clearInterval(this.lockoutInterval);
          this.lockoutInterval = null;
        }
        return;
      }

      const secondsRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
      this.lockoutSecondsRemaining.set(secondsRemaining);
    };

    updateTimer();
    this.lockoutInterval = setInterval(updateTimer, 1000);
  }

  /**
   * Maneja la entrada del PIN
   */
  onPinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Solo números
    
    // Limitar a 6 dígitos
    if (value.length > this.PIN_LENGTH) {
      value = value.substring(0, this.PIN_LENGTH);
    }
    
    this.pin.set(value);
    this.clearError();

    // Auto-submit cuando se completa el PIN
    if (value.length === this.PIN_LENGTH) {
      this.verifyPin();
    }
  }

  /**
   * Maneja el click en los botones numéricos
   */
  onNumberClick(number: string) {
    const currentPin = this.pin();
    if (currentPin.length < this.PIN_LENGTH) {
      this.pin.set(currentPin + number);
      this.clearError();
      
      // Auto-submit cuando se completa el PIN
      if ((currentPin + number).length === this.PIN_LENGTH) {
        setTimeout(() => this.verifyPin(), 100);
      }
    }
  }

  /**
   * Elimina el último dígito del PIN
   */
  onDelete() {
    const currentPin = this.pin();
    if (currentPin.length > 0) {
      this.pin.set(currentPin.slice(0, -1));
      this.clearError();
    }
  }

  /**
   * Limpia todo el PIN
   */
  onClear() {
    this.pin.set('');
    this.clearError();
  }

  /**
   * Verifica el PIN ingresado
   */
  async verifyPin() {
    const currentPin = this.pin();
    
    // Validar longitud
    if (currentPin.length !== this.PIN_LENGTH) {
      this.showErrorMessage('Por favor, ingresa un PIN de 6 dígitos');
      return;
    }

    // Verificar si puede intentar (no está en lockout)
    const state = this.lockState();
    if (state && !state.canAttempt) {
      const seconds = this.lockoutSecondsRemaining();
      this.showErrorMessage(`Demasiados intentos fallidos. Intenta nuevamente en ${seconds} segundos`);
      return;
    }

    this.isProcessing.set(true);
    this.clearError();

    try {
      // Intentar obtener settings
      // Si no está autenticado, verificar si hay sesión de Supabase que se pueda restaurar
      let settings;
      
      if (!(await this.authService.hasLocalSession())) {
        // No hay sesión válida - verificar si hay sesión de Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // No hay sesión válida - redirigir a login
          this.showErrorMessage('Sesión expirada. Por favor, inicia sesión nuevamente.');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
          return;
        }
        
        // Hay una sesión válida en Supabase - obtener settings
        settings = await this.securitySettingsService.getSettings();
      } else {
        // Usuario autenticado - obtener settings normalmente
        settings = await this.securitySettingsService.getSettings();
      }
      
      if (!settings || !settings.pin_hash || !settings.pin_salt) {
        // No tiene PIN configurado - esto no debería pasar en lock screen
        this.showErrorMessage('PIN no configurado');
        return;
      }

      // Verificar PIN usando PinLockService
      const result = await this.pinLockService.verifyPin(currentPin);

      if (result.ok) {
        // PIN correcto - marcar como desbloqueado y redirigir
        this.pinLockService.markUnlocked();
        this.onUnlockSuccess();
      } else {
        // PIN incorrecto
        await this.handleFailedAttempt(result);
      }
    } catch (error) {
      console.error('Error al verificar PIN:', error);
      this.showErrorMessage('Error al verificar el PIN. Por favor, intenta nuevamente.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Maneja un intento fallido
   */
  async handleFailedAttempt(result: any) {
    await this.securitySettingsService.incrementFailedAttempts();
    
    // Recargar estado
    await this.loadLockState();
    this.startLockoutTimer();

    const state = this.lockState();
    const remainingAttempts = 5 - (state?.failedAttempts || 0);

    if (remainingAttempts > 0 && state?.canAttempt) {
      this.showErrorMessage(
        `PIN incorrecto. Te quedan ${remainingAttempts} ${remainingAttempts === 1 ? 'intento' : 'intentos'}.`
      );
    } else {
      // Bloqueado - el mensaje se mostrará automáticamente por el lockout
      const seconds = this.lockoutSecondsRemaining();
      this.showErrorMessage(`Demasiados intentos fallidos. Intenta nuevamente en ${seconds} segundos`);
    }

    // Limpiar PIN y animar error
    this.pin.set('');
    this.showError.set(true);
    setTimeout(() => {
      this.showError.set(false);
    }, 500);
  }

  /**
   * Muestra un mensaje de error
   */
  showErrorMessage(message: string) {
    this.errorMessage.set(message);
    this.showError.set(true);
    setTimeout(() => {
      this.showError.set(false);
    }, 3000);
  }

  /**
   * Limpia el mensaje de error
   */
  clearError() {
    this.errorMessage.set(null);
    this.showError.set(false);
  }

  /**
   * Maneja el desbloqueo exitoso
   */
  onUnlockSuccess() {
    // Redirigir a la ruta de retorno o al dashboard por defecto
    const destination = this.returnUrl || '/expenses-dashboard';
    this.router.navigateByUrl(destination);
    // Limpiar PIN visualmente
    this.pin.set('');
    // Limpiar returnUrl después de usarlo
    this.returnUrl = null;
  }

  /**
   * Maneja la presión de teclas (para teclado físico)
   */
  onKeyDown(event: KeyboardEvent) {
    // Permitir solo números y teclas de control
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      this.onNumberClick(event.key);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.onDelete();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.onClear();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.pin().length === this.PIN_LENGTH) {
        this.verifyPin();
      }
    }
  }

  /**
   * Maneja la cancelación (cerrar sesión)
   */
  async onCancel() {
    if (confirm('¿Deseas cerrar sesión?')) {
      try {
        // Limpiar estado de bloqueo y otros datos locales primero
        sessionStorage.clear();
        localStorage.removeItem('has_pin_configured');
        localStorage.removeItem('user_id_for_pin');
        
        // Cerrar sesión en Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Error al cerrar sesión:', error);
        }

        // Esperar un momento para asegurar que el estado se actualice
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Redirigir a login usando window.location para forzar una navegación completa
        window.location.replace('/login');
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Intentar redirigir de todas formas
        try {
          sessionStorage.clear();
          localStorage.removeItem('has_pin_configured');
          localStorage.removeItem('user_id_for_pin');
          window.location.replace('/login');
        } catch (navError) {
          console.error('Error al redirigir:', navError);
          alert('Error al cerrar sesión. Por favor, recarga la página.');
        }
      }
    }
  }

  /**
   * Formatea el tiempo de bloqueo restante
   */
  formatLockoutTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  }

  /**
   * Obtiene un array de la longitud del PIN para mostrar los círculos
   */
  getPinCircles(): boolean[] {
    const currentPin = this.pin();
    return Array(this.PIN_LENGTH).fill(false).map((_, i) => i < currentPin.length);
  }
}
