import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PinService {
  private iterations = 100_000;
  private digest = 'SHA-256';
  private keyLength = 32; // bytes

  async generateSalt(bytes = 16): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(bytes));
    return this.arrayBufferToB64Url(salt.buffer);
  }

  async hashPin(pin: string, saltB64: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const salt = this.b64UrlToArrayBuffer(saltB64);
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.iterations,
        hash: this.digest,
      },
      keyMaterial,
      this.keyLength * 8
    );

    return this.arrayBufferToB64Url(derived);
  }

  async verifyPin(pin: string, saltB64: string, expectedHash: string): Promise<boolean> {
    const hash = await this.hashPin(pin, saltB64);
    return hash === expectedHash;
  }

  getPinValidationError(pin: string): string | null {
    if (!pin || pin.length !== 6) {
      return 'El PIN debe tener exactamente 6 dígitos';
    }

    // Validar que no sean todos iguales (ej: 111111)
    if (/^(\d)\1{5}$/.test(pin)) {
      return 'El PIN no puede tener todos los dígitos iguales';
    }

    // Validar que no sea secuencial ascendente (ej: 123456)
    let isSequential = true;
    for (let i = 1; i < pin.length; i++) {
      if (parseInt(pin[i]) !== parseInt(pin[i - 1]) + 1) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) {
      return 'El PIN no puede ser una secuencia ascendente';
    }

    // Validar que no sea secuencial descendente (ej: 654321)
    let isDescending = true;
    for (let i = 1; i < pin.length; i++) {
      if (parseInt(pin[i]) !== parseInt(pin[i - 1]) - 1) {
        isDescending = false;
        break;
      }
    }
    if (isDescending) {
      return 'El PIN no puede ser una secuencia descendente';
    }

    return null;
  }

  private arrayBufferToB64Url(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private b64UrlToArrayBuffer(b64url: string): ArrayBuffer {
    const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

