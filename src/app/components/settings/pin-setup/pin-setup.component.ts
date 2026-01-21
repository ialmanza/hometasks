import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PinService } from '../../../services/pin.service';

@Component({
  selector: 'app-pin-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pin-setup.component.html',
  styleUrl: './pin-setup.component.css'
})
export class PinSetupComponent {
  @Input() isProcessing = false;
  @Output() pinConfigured = new EventEmitter<{ pin: string; confirmPin: string }>();
  @Output() cancel = new EventEmitter<void>();

  pin = signal<string>('');
  confirmPin = signal<string>('');
  errorMessage = signal<string | null>(null);
  showError = signal<boolean>(false);
  
  readonly PIN_LENGTH = 6;

  constructor(
    private pinService: PinService
  ) {}

  onPinInput(event: Event, isConfirm: boolean = false) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > this.PIN_LENGTH) {
      value = value.substring(0, this.PIN_LENGTH);
    }
    
    if (isConfirm) {
      this.confirmPin.set(value);
    } else {
      this.pin.set(value);
    }
    
    this.clearError();
  }

  onNumberClick(number: string) {
    // Primero llenar el PIN, luego la confirmación
    const currentPin = this.pin();
    if (currentPin.length < this.PIN_LENGTH) {
      // Añadir al PIN si no está completo
      this.pin.set(currentPin + number);
    } else {
      // Si el PIN está completo, añadir a la confirmación
      const currentConfirm = this.confirmPin();
      if (currentConfirm.length < this.PIN_LENGTH) {
        this.confirmPin.set(currentConfirm + number);
      }
    }
    this.clearError();
  }

  onDelete() {
    // Primero borrar de la confirmación, luego del PIN
    const currentConfirm = this.confirmPin();
    if (currentConfirm.length > 0) {
      this.confirmPin.set(currentConfirm.slice(0, -1));
    } else {
      const currentPin = this.pin();
      if (currentPin.length > 0) {
        this.pin.set(currentPin.slice(0, -1));
      }
    }
    this.clearError();
  }

  onClear() {
    // Limpiar ambos campos
    this.pin.set('');
    this.confirmPin.set('');
    this.clearError();
  }

  onSubmit() {
    const pin = this.pin();
    const confirmPin = this.confirmPin();

    // Validar longitud
    if (pin.length !== this.PIN_LENGTH) {
      this.showErrorMessage('El PIN debe tener 6 dígitos');
      return;
    }

    if (confirmPin.length !== this.PIN_LENGTH) {
      this.showErrorMessage('La confirmación del PIN debe tener 6 dígitos');
      return;
    }

    // Validar que coincidan
    if (pin !== confirmPin) {
      this.showErrorMessage('Los PINs no coinciden');
      return;
    }

    // Validar formato
    const validationError = this.pinService.getPinValidationError(pin);
    if (validationError) {
      this.showErrorMessage(validationError);
      return;
    }

    // Emitir evento
    this.pinConfigured.emit({ pin, confirmPin });
  }

  onCancel() {
    this.pin.set('');
    this.confirmPin.set('');
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

