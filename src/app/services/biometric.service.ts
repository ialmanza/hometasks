import { Injectable } from '@angular/core';
import { SecuritySettingsService } from './security-settings.service';

@Injectable({
  providedIn: 'root'
})
export class BiometricService {
  constructor(private settingsService: SecuritySettingsService) {}

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!(window as any).PublicKeyCredential;
  }

  async isAvailable(): Promise<boolean> {
    // Verificar soporte del navegador primero
    if (!this.isSupported()) {
      return false;
    }

    // Verificar si hay una configuración de seguridad activa
    // (si hay user_id significa que hay una sesión activa)
    const settings = await this.settingsService.getSettings();
    if (!settings?.user_id) {
      return false;
    }

    // La disponibilidad real se verifica al intentar usar la API
    // Si está soportado y hay sesión, está disponible
    return true;
  }

  private b64Url(bytes: ArrayBuffer): string {
    const arr = new Uint8Array(bytes);
    let binary = '';
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private decodeB64Url(b64url: string): ArrayBuffer {
    const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  async registerPasskey(): Promise<{ ok: boolean; credentialId?: string; message?: string }> {
    if (!this.isSupported()) return { ok: false, message: 'Biometría no soportada' };
    const settings = await this.settingsService.getSettings();
    if (!settings?.user_id) return { ok: false, message: 'Sin sesión' };

    try {
      const publicKey: PublicKeyCredentialCreationOptions = {
        rp: { name: 'Hometasks', id: location.hostname },
        user: {
          id: new TextEncoder().encode(settings.user_id),
          name: settings.user_id,
          displayName: settings.user_id
        },
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          userVerification: 'required',
          authenticatorAttachment: 'platform',
          residentKey: 'preferred'
        },
        timeout: 60_000,
        attestation: 'none'
      };

      const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
      const credId = this.b64Url(cred.rawId);
      await this.settingsService.updateSettings({
        biometric_key_id: credId,
        lock_enabled: true
      });
      return { ok: true, credentialId: credId };
    } catch (err) {
      console.error('registerPasskey error', err);
      return { ok: false, message: 'No se pudo registrar la biometría' };
    }
  }

  async authenticatePasskey(): Promise<{ ok: boolean; message?: string }> {
    if (!this.isSupported()) return { ok: false, message: 'Biometría no soportada' };
    const settings = await this.settingsService.getSettings();
    if (!settings?.biometric_key_id) return { ok: false, message: 'No hay biometría registrada' };

    try {
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            id: this.decodeB64Url(settings.biometric_key_id),
            type: 'public-key',
            transports: ['internal']
          }
        ],
        userVerification: 'required',
        timeout: 60_000
      };

      await navigator.credentials.get({ publicKey });
      return { ok: true };
    } catch (err) {
      console.error('authenticatePasskey error', err);
      return { ok: false, message: 'No se pudo usar la biometría' };
    }
  }
}

