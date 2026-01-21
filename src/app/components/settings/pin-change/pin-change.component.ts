import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PinService } from '../../../services/pin.service';
import { SecuritySettingsService } from '../../../services/security-settings.service';

@Component({
  selector: 'app-pin-change',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pin-change.component.html',
  styleUrl: './pin-change.component.css'
})
export class PinChangeComponent {
  @Input() isProcessing = false;
  @Output() pinChanged = new EventEmitter<{ currentPin: string; newPin: string; confirmPin: string }>();
  @Output() cancel = new EventEmitter<void>();

  currentPin = signal<string>('');
  newPin = signal<string>('');
  confirmPin = signal<string>('');
  errorMessage = signal<string | null>(null);
  showError = signal<boolean>(false);
  currentStep = signal<'current' | 'new'>('current');
  isVerifyingCurrentPin = signal<boolean>(false);
  
  readonly PIN_LENGTH = 6;

  constructor(
    private pinService: PinService,
    private securitySettingsService: SecuritySettingsService
  ) {}

  async onPinInput(event: Event, type: 'current' | 'new' | 'confirm') {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > this.PIN_LENGTH) {
      value = value.substring(0, this.PIN_LENGTH);
    }
    
    if (type === 'current') {
      this.currentPin.set(value);
      // Si se completa el PIN actual, verificarlo
      if (value.length === this.PIN_LENGTH) {
        await this.verifyCurrentPin();
      }
    } else if (type === 'new') {
      this.newPin.set(value);
    } else {
      this.confirmPin.set(value);
    }
    
    this.clearError();
  }

  async onNumberClick(number: string) {
    if (this.currentStep() === 'current') {
      const current = this.currentPin();
      if (current.length < this.PIN_LENGTH) {
        this.currentPin.set(current + number);
        if ((current + number).length === this.PIN_LENGTH) {
          // Verificar PIN actual antes de avanzar
          await this.verifyCurrentPin();
        }
      }
    } else {
      const newPin = this.newPin();
      const confirmPin = this.confirmPin();
      
      if (newPin.length < this.PIN_LENGTH) {
        this.newPin.set(newPin + number);
      } else if (confirmPin.length < this.PIN_LENGTH) {
        this.confirmPin.set(confirmPin + number);
      }
    }
    this.clearError();
  }

  /**
   * Verifica el PIN actual contra la BD antes de permitir cambiar a nuevo PIN
   */
  async verifyCurrentPin() {
    const currentPin = this.currentPin();
    if (currentPin.length !== this.PIN_LENGTH) {
      return;
    }

    this.isVerifyingCurrentPin.set(true);
    this.clearError();

    try {
      const settings = await this.securitySettingsService.getSettings();
      if (!settings || !settings.pin_hash || !settings.pin_salt) {
        this.showErrorMessage('PIN no configurado');
        this.currentPin.set('');
        return;
      }

      const isValid = await this.pinService.verifyPin(
        currentPin,
        settings.pin_salt,
        settings.pin_hash
      );

      if (isValid) {
        // PIN correcto - avanzar al paso 2
        setTimeout(() => this.currentStep.set('new'), 300);
      } else {
        // PIN incorrecto - mostrar error y limpiar
        this.showErrorMessage('PIN actual incorrecto');
        this.currentPin.set('');
      }
    } catch (error) {
      console.error('Error al verificar PIN actual:', error);
      this.showErrorMessage('Error al verificar el PIN. Por favor, intenta nuevamente.');
      this.currentPin.set('');
    } finally {
      this.isVerifyingCurrentPin.set(false);
    }
  }

  onDelete() {
    if (this.currentStep() === 'current') {
      const current = this.currentPin();
      if (current.length > 0) {
        this.currentPin.set(current.slice(0, -1));
      }
    } else {
      const confirmPin = this.confirmPin();
      const newPin = this.newPin();
      
      if (confirmPin.length > 0) {
        this.confirmPin.set(confirmPin.slice(0, -1));
      } else if (newPin.length > 0) {
        this.newPin.set(newPin.slice(0, -1));
      }
    }
    this.clearError();
  }

  onClear() {
    if (this.currentStep() === 'current') {
      this.currentPin.set('');
    } else {
      this.newPin.set('');
      this.confirmPin.set('');
    }
    this.clearError();
  }

  onSubmit() {
    const currentPin = this.currentPin();
    const newPin = this.newPin();
    const confirmPin = this.confirmPin();

    // Validar longitudes
    if (currentPin.length !== this.PIN_LENGTH) {
      this.showErrorMessage('El PIN actual debe tener 6 dígitos');
      this.currentStep.set('current');
      return;
    }

    if (newPin.length !== this.PIN_LENGTH) {
      this.showErrorMessage('El nuevo PIN debe tener 6 dígitos');
      this.currentStep.set('new');
      return;
    }

    if (confirmPin.length !== this.PIN_LENGTH) {
      this.showErrorMessage('La confirmación del PIN debe tener 6 dígitos');
      return;
    }

    // Validar que los nuevos PINs coincidan
    if (newPin !== confirmPin) {
      this.showErrorMessage('Los nuevos PINs no coinciden');
      return;
    }

    // Validar formato del nuevo PIN
    const validationError = this.pinService.getPinValidationError(newPin);
    if (validationError) {
      this.showErrorMessage(validationError);
      return;
    }

    // Emitir evento
    this.pinChanged.emit({ currentPin, newPin, confirmPin });
  }

  onCancel() {
    this.currentPin.set('');
    this.newPin.set('');
    this.confirmPin.set('');
    this.currentStep.set('current');
    this.clearError();
    this.cancel.emit();
  }

  showErrorMessage(message: string) {
    this.errorMessage.set(message);
    this.showError.set(true);
    setTimeout(() => {
      this.showError.set(false);
    }, 3000);
  }

  clearError() {
    this.errorMessage.set(null);
    this.showError.set(false);
  }

  getPinCircles(pin: string): boolean[] {
    return Array(this.PIN_LENGTH).fill(false).map((_, i) => i < pin.length);
  }

  getTheme(): 'light' | 'dark' {
    // Obtener tema del DOM
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    }
    return 'light';
  }
}

