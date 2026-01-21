import { Injectable } from '@angular/core';
import { supabase } from './Supabase-Client/supabase-client';
import { PinLockService } from './pin-lock.service';

type PublicKeyCreationOptionsJSON = PublicKeyCredentialCreationOptions & {
  challenge: string;
  user: PublicKeyCredentialUserEntity & { id: string };
  excludeCredentials?: Array<PublicKeyCredentialDescriptor & { id: string }>;
};

type PublicKeyRequestOptionsJSON = PublicKeyCredentialRequestOptions & {
  challenge: string;
  allowCredentials?: Array<PublicKeyCredentialDescriptor & { id: string }>;
};

@Injectable({
  providedIn: 'root'
})
export class PasskeyService {
  private readonly functionName = 'passkeys';

  constructor(private lockService: PinLockService) {}

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!(window as any).PublicKeyCredential;
  }

  private b64UrlToArrayBuffer(b64url: string): ArrayBuffer {
    const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  private arrayBufferToB64Url(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private normalizeCreationOptions(opts: PublicKeyCreationOptionsJSON): PublicKeyCredentialCreationOptions {
    return {
      ...opts,
      challenge: this.b64UrlToArrayBuffer(opts.challenge),
      user: {
        ...opts.user,
        id: this.b64UrlToArrayBuffer(opts.user.id)
      },
      excludeCredentials: opts.excludeCredentials?.map((cred) => ({
        ...cred,
        id: this.b64UrlToArrayBuffer(cred.id)
      }))
    };
  }

  private normalizeRequestOptions(opts: PublicKeyRequestOptionsJSON): PublicKeyCredentialRequestOptions {
    return {
      ...opts,
      challenge: this.b64UrlToArrayBuffer(opts.challenge),
      allowCredentials: opts.allowCredentials?.map((cred) => ({
        ...cred,
        id: this.b64UrlToArrayBuffer(cred.id)
      }))
    };
  }

  async registerPasskey(nickname?: string): Promise<{ ok: boolean; message?: string }> {
    if (!this.isSupported()) return { ok: false, message: 'Biometría no soportada en este dispositivo' };

    const { data, error } = await supabase.functions.invoke(this.functionName, {
      body: { action: 'start-registration', nickname }
    });
    if (error || !data?.options) {
      return { ok: false, message: error?.message || 'No se pudo iniciar registro' };
    }

    const creationOptions = this.normalizeCreationOptions(data.options as PublicKeyCreationOptionsJSON);

    let credential: PublicKeyCredential;
    try {
      credential = (await navigator.credentials.create({ publicKey: creationOptions })) as PublicKeyCredential;
    } catch (err) {
      console.error('navigator.credentials.create error', err);
      return { ok: false, message: 'El usuario canceló o no se pudo crear la passkey' };
    }

    const attestationResponse = credential.response as AuthenticatorAttestationResponse;
    const { data: finishData, error: finishError } = await supabase.functions.invoke(this.functionName, {
      body: {
        action: 'finish-registration',
        credential: {
          id: credential.id,
          rawId: this.arrayBufferToB64Url(credential.rawId),
          type: credential.type,
          response: {
            attestationObject: this.arrayBufferToB64Url(attestationResponse.attestationObject),
            clientDataJSON: this.arrayBufferToB64Url(attestationResponse.clientDataJSON)
          },
          clientExtensionResults: credential.getClientExtensionResults?.()
        }
      }
    });

    if (finishError || !finishData?.success) {
      return { ok: false, message: finishError?.message || finishData?.message || 'No se pudo guardar la passkey' };
    }

    return { ok: true };
  }

  async authenticateWithPasskey(): Promise<{ ok: boolean; message?: string }> {
    if (!this.isSupported()) return { ok: false, message: 'Biometría no soportada en este dispositivo' };

    const { data, error } = await supabase.functions.invoke(this.functionName, {
      body: { action: 'start-auth' }
    });
    if (error || !data?.options) {
      return { ok: false, message: error?.message || 'No se pudo iniciar autenticación' };
    }

    const requestOptions = this.normalizeRequestOptions(data.options as PublicKeyRequestOptionsJSON);

    let assertion: PublicKeyCredential;
    try {
      assertion = (await navigator.credentials.get({ publicKey: requestOptions })) as PublicKeyCredential;
    } catch (err) {
      console.error('navigator.credentials.get error', err);
      return { ok: false, message: 'El usuario canceló o no se pudo usar la passkey' };
    }

    const authResponse = assertion.response as AuthenticatorAssertionResponse;
    const { data: finishData, error: finishError } = await supabase.functions.invoke(this.functionName, {
      body: {
        action: 'finish-auth',
        credential: {
          id: assertion.id,
          rawId: this.arrayBufferToB64Url(assertion.rawId),
          type: assertion.type,
          response: {
            authenticatorData: this.arrayBufferToB64Url(authResponse.authenticatorData),
            clientDataJSON: this.arrayBufferToB64Url(authResponse.clientDataJSON),
            signature: this.arrayBufferToB64Url(authResponse.signature),
            userHandle: authResponse.userHandle ? this.arrayBufferToB64Url(authResponse.userHandle) : null
          },
          clientExtensionResults: assertion.getClientExtensionResults?.()
        }
      }
    });

    if (finishError || !finishData?.success) {
      return { ok: false, message: finishError?.message || finishData?.message || 'No se pudo validar la passkey' };
    }

    // Marcar desbloqueo local
    this.lockService.markUnlocked();
    return { ok: true };
  }
}

