import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pin-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pin-verify.component.html',
  styleUrl: './pin-verify.component.css'
})
export class PinVerifyComponent {
  @Input() isProcessing = false;
  @Input() label = 'Ingresa tu PIN';
  @Output() pinVerified = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  pin = signal<string>('');
  errorMessage = signal<string | null>(null);
  showError = signal<boolean>(false);
  
  readonly PIN_LENGTH = 6;

  constructor() {}

  onPinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > this.PIN_LENGTH) {
      value = value.substring(0, this.PIN_LENGTH);
    }
    
    this.pin.set(value);
    this.clearError();

    // Auto-submit cuando se completa
    if (value.length === this.PIN_LENGTH) {
      setTimeout(() => this.onSubmit(), 100);
    }
  }

  onNumberClick(number: string) {
    const current = this.pin();
    if (current.length < this.PIN_LENGTH) {
      this.pin.set(current + number);
      if ((current + number).length === this.PIN_LENGTH) {
        setTimeout(() => this.onSubmit(), 100);
      }
    }
    this.clearError();
  }

  onDelete() {
    const current = this.pin();
    if (current.length > 0) {
      this.pin.set(current.slice(0, -1));
    }
    this.clearError();
  }

  onClear() {
    this.pin.set('');
    this.clearError();
  }

  onSubmit() {
    const pin = this.pin();

    if (pin.length !== this.PIN_LENGTH) {
      this.showErrorMessage('El PIN debe tener 6 dígitos');
      return;
    }

    this.pinVerified.emit(pin);
  }

  onCancel() {
    this.pin.set('');
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

  getPinCircles(): boolean[] {
    const currentPin = this.pin();
    return Array(this.PIN_LENGTH).fill(false).map((_, i) => i < currentPin.length);
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

