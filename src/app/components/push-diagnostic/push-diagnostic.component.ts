import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PushDiagnosticService } from '../../services/push-diagnostic.service';
import { PushCleanupService } from '../../services/push-cleanup.service';

@Component({
  selector: 'app-push-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Diagnóstico de Notificaciones Push</h2>
      
      <!-- Botones de acción -->
      <div class="mb-6 flex flex-wrap gap-4">
        <button 
          (click)="runDiagnostic()" 
          [disabled]="isLoading"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {{ isLoading ? 'Ejecutando...' : 'Ejecutar Diagnóstico' }}
        </button>
        
        <button 
          (click)="cleanupInvalidSubscriptions()" 
          [disabled]="isCleaning"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
          {{ isCleaning ? 'Limpiando...' : 'Limpiar Suscripciones Inválidas' }}
        </button>
        
        <button 
          (click)="verifyIntegrity()" 
          [disabled]="isVerifying"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {{ isVerifying ? 'Verificando...' : 'Verificar Integridad' }}
        </button>
      </div>

      <!-- Resultados de limpieza -->
      <div *ngIf="cleanupResult" class="mb-6 p-4 rounded" [class]="cleanupResult.deleted > 0 ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'">
        <h3 class="font-semibold mb-2">Resultado de Limpieza</h3>
        <p>Eliminadas {{ cleanupResult.deleted }} suscripciones inválidas</p>
        <div *ngIf="cleanupResult.errors.length > 0" class="mt-2">
          <p class="font-semibold">Errores:</p>
          <ul class="list-disc list-inside text-sm">
            <li *ngFor="let error of cleanupResult.errors">{{ error }}</li>
          </ul>
        </div>
      </div>

      <!-- Resultados de verificación -->
      <div *ngIf="integrityResult" class="mb-6 p-4 bg-blue-50 text-blue-800 rounded">
        <h3 class="font-semibold mb-2">Verificación de Integridad</h3>
        <p>Total: {{ integrityResult.total }} | Válidas: {{ integrityResult.valid }} | Inválidas: {{ integrityResult.invalid }}</p>
        <div *ngIf="integrityResult.details.length > 0" class="mt-2">
          <p class="font-semibold">Detalles de suscripciones inválidas:</p>
          <div class="text-sm space-y-1">
            <div *ngFor="let detail of integrityResult.details" class="border-l-2 border-red-400 pl-2">
              ID: {{ detail.id }} | User ID: {{ detail.user_id }} | Tipo: {{ detail.type }}
            </div>
          </div>
        </div>
      </div>

      <!-- Resultados del diagnóstico -->
      <div *ngIf="diagnostic" class="space-y-6">
        
        <!-- Estado general -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Estado General</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center space-x-2">
              <span [class]="diagnostic.browserSupport ? 'text-green-600' : 'text-red-600'">
                {{ diagnostic.browserSupport ? '✅' : '❌' }}
              </span>
              <span>Soporte del navegador</span>
            </div>
            <div class="flex items-center space-x-2">
              <span [class]="diagnostic.serviceWorker ? 'text-green-600' : 'text-red-600'">
                {{ diagnostic.serviceWorker ? '✅' : '❌' }}
              </span>
              <span>Service Worker</span>
            </div>
            <div class="flex items-center space-x-2">
              <span [class]="diagnostic.permissions === 'granted' ? 'text-green-600' : 'text-red-600'">
                {{ diagnostic.permissions === 'granted' ? '✅' : '❌' }}
              </span>
              <span>Permisos: {{ diagnostic.permissions }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span [class]="diagnostic.vapidConfig ? 'text-green-600' : 'text-red-600'">
                {{ diagnostic.vapidConfig ? '✅' : '❌' }}
              </span>
              <span>Configuración VAPID</span>
            </div>
          </div>
        </div>

        <!-- Estado del usuario -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Estado del Usuario</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center space-x-2">
              <span [class]="diagnostic.userAuth ? 'text-green-600' : 'text-red-600'">
                {{ diagnostic.userAuth ? '✅' : '❌' }}
              </span>
              <span>Usuario autenticado</span>
            </div>
            <div class="flex items-center space-x-2">
              <span [class]="diagnostic.userAuthorized ? 'text-green-600' : 'text-red-600'">
                {{ diagnostic.userAuthorized ? '✅' : '❌' }}
              </span>
              <span>Usuario autorizado</span>
            </div>
            <div class="flex items-center space-x-2">
              <span [class]="diagnostic.pushPreferences ? 'text-green-600' : 'text-red-600'">
                {{ diagnostic.pushPreferences ? '✅' : '❌' }}
              </span>
              <span>Preferencias push habilitadas</span>
            </div>
          </div>
        </div>

        <!-- Suscripciones -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Suscripciones Push</h3>
          <div *ngIf="diagnostic.subscriptions.length > 0; else noSubscriptions">
            <p class="text-green-600 mb-2">✅ {{ diagnostic.subscriptions.length }} suscripción(es) encontrada(s)</p>
            <div class="space-y-2">
              <div *ngFor="let sub of diagnostic.subscriptions" class="text-sm text-gray-600">
                <div>Endpoint: {{ sub.endpoint.substring(0, 50) }}...</div>
                <div>Creada: {{ sub.created_at | date:'short' }}</div>
              </div>
            </div>
          </div>
          <ng-template #noSubscriptions>
            <p class="text-red-600">❌ No hay suscripciones push registradas</p>
          </ng-template>
        </div>

        <!-- Usuarios autorizados -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Usuarios Autorizados</h3>
          <div *ngIf="diagnostic.authorizedUsers.length > 0; else noAuthorizedUsers">
            <p class="text-green-600 mb-2">✅ {{ diagnostic.authorizedUsers.length }} usuario(s) autorizado(s)</p>
            <div class="space-y-2">
              <div *ngFor="let user of diagnostic.authorizedUsers" class="text-sm text-gray-600">
                <div>{{ user.name }} ({{ user.email }})</div>
                <div>Push: {{ user.notification_preferences?.push ? '✅' : '❌' }}</div>
              </div>
            </div>
          </div>
          <ng-template #noAuthorizedUsers>
            <p class="text-red-600">❌ No hay usuarios autorizados</p>
          </ng-template>
        </div>

        <!-- Errores -->
        <div *ngIf="diagnostic.errors.length > 0" class="bg-red-50 p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4 text-red-800">Errores Encontrados</h3>
          <div class="space-y-2">
            <div *ngFor="let error of diagnostic.errors" class="text-red-600 text-sm">
              ❌ {{ error }}
            </div>
          </div>
        </div>

        <!-- Prueba de notificación -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Prueba de Notificación</h3>
          <div class="mb-2 text-sm text-gray-600">
            <p *ngIf="diagnostic.userEmail">
              Usuario actual: <strong>{{ diagnostic.userEmail }}</strong>
            </p>
            <p class="text-xs mt-1">La notificación se enviará al usuario autenticado actual</p>
          </div>
          <div class="flex space-x-4">
            <input 
              [(ngModel)]="testEmail" 
              placeholder="Mensaje de prueba (opcional)"
              class="flex-1 px-3 py-2 border border-gray-300 rounded">
            <button 
              (click)="testNotification()" 
              [disabled]="isTesting || !diagnostic.userEmail"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              {{ isTesting ? 'Probando...' : 'Probar Notificación' }}
            </button>
          </div>
          <div *ngIf="testResult" class="mt-4 p-3 rounded" [class]="testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
            {{ testResult.message }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PushDiagnosticComponent implements OnInit {
  diagnostic: any = null;
  isLoading = false;
  isTesting = false;
  isCleaning = false;
  isVerifying = false;
  testEmail = '';
  testResult: any = null;
  cleanupResult: any = null;
  integrityResult: any = null;

  constructor(
    private pushDiagnosticService: PushDiagnosticService,
    private pushCleanupService: PushCleanupService
  ) {}

  ngOnInit() {
    // Ejecutar diagnóstico automáticamente al cargar
    this.runDiagnostic();
  }

  async runDiagnostic() {
    this.isLoading = true;
    try {
      this.diagnostic = await this.pushDiagnosticService.runDiagnostic();
      console.log('Diagnóstico completado:', this.diagnostic);
    } catch (error) {
      console.error('Error ejecutando diagnóstico:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async testNotification() {
    this.isTesting = true;
    try {
      // El método ahora usa automáticamente el usuario autenticado
      // El input es solo para un mensaje personalizado
      const testMessage = this.testEmail?.trim();
      this.testResult = await this.pushDiagnosticService.testPushNotification(testMessage);
    } catch (error) {
      this.testResult = {
        success: false,
        message: `Error en prueba: ${error}`
      };
    } finally {
      this.isTesting = false;
    }
  }

  async cleanupInvalidSubscriptions() {
    this.isCleaning = true;
    try {
      this.cleanupResult = await this.pushCleanupService.cleanupInvalidSubscriptions();
      console.log('Limpieza completada:', this.cleanupResult);
    } catch (error) {
      console.error('Error en limpieza:', error);
      this.cleanupResult = {
        deleted: 0,
        errors: [`Error en limpieza: ${error}`]
      };
    } finally {
      this.isCleaning = false;
    }
  }

  async verifyIntegrity() {
    this.isVerifying = true;
    try {
      this.integrityResult = await this.pushCleanupService.verifySubscriptionsIntegrity();
      console.log('Verificación completada:', this.integrityResult);
    } catch (error) {
      console.error('Error en verificación:', error);
    } finally {
      this.isVerifying = false;
    }
  }
} 