import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthorizedUsersService, AuthorizedUser } from '../../services/authorized-users.service';

@Component({
  selector: 'app-authorized-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4">
      <h2 class="text-2xl font-bold mb-6">Gestión de Usuarios Autorizados</h2>
      
      <!-- Formulario para agregar usuario -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Agregar Usuario Autorizado</h3>
        
        <form (ngSubmit)="addUser()" #userForm="ngForm" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="newUser.email"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="usuario@ejemplo.com"
            >
          </div>
          
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="newUser.name"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Nombre del usuario"
            >
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Preferencias de Notificación</label>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                id="push"
                name="push"
                [(ngModel)]="newUser.preferences.push"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="push" class="ml-2 block text-sm text-gray-900">
                Notificaciones Push
              </label>
            </div>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                id="email"
                name="email"
                [(ngModel)]="newUser.preferences.email"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="email" class="ml-2 block text-sm text-gray-900">
                Notificaciones por Email
              </label>
            </div>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                id="urgent"
                name="urgent"
                [(ngModel)]="newUser.preferences.urgent_only"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="urgent" class="ml-2 block text-sm text-gray-900">
                Solo notificaciones urgentes
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            [disabled]="!userForm.form.valid || isAdding"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isAdding ? 'Agregando...' : 'Agregar Usuario' }}
          </button>
        </form>
      </div>
      
      <!-- Lista de usuarios autorizados -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold mb-4">Usuarios Autorizados</h3>
        
        <div *ngIf="isLoading" class="text-center py-4">
          <p class="text-gray-500">Cargando usuarios...</p>
        </div>
        
        <div *ngIf="!isLoading && authorizedUsers.length === 0" class="text-center py-4">
          <p class="text-gray-500">No hay usuarios autorizados</p>
        </div>
        
        <div *ngIf="!isLoading && authorizedUsers.length > 0" class="space-y-4">
          <div
            *ngFor="let user of authorizedUsers"
            class="border rounded-lg p-4 hover:bg-gray-50"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{{ user.name }}</h4>
                <p class="text-sm text-gray-600">{{ user.email }}</p>
                <div class="mt-2 space-y-1">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs font-medium text-gray-500">Preferencias:</span>
                    <span *ngIf="user.notification_preferences?.push" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Push
                    </span>
                    <span *ngIf="user.notification_preferences?.email" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Email
                    </span>
                    <span *ngIf="user.notification_preferences?.urgent_only" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Solo Urgentes
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex space-x-2">
                <button
                  (click)="updateUserPreferences(user)"
                  class="text-sm text-blue-600 hover:text-blue-800"
                >
                  Editar
                </button>
                <button
                  (click)="deactivateUser(user.email)"
                  class="text-sm text-red-600 hover:text-red-800"
                >
                  Desactivar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AuthorizedUsersComponent implements OnInit {
  authorizedUsers: AuthorizedUser[] = [];
  isLoading = false;
  isAdding = false;
  
  newUser = {
    email: '',
    name: '',
    preferences: {
      push: true,
      email: false,
      urgent_only: false
    }
  };

  constructor(private authorizedUsersService: AuthorizedUsersService) {}

  ngOnInit() {
    this.loadAuthorizedUsers();
  }

  async loadAuthorizedUsers() {
    this.isLoading = true;
    try {
      this.authorizedUsers = await this.authorizedUsersService.getAuthorizedUsers();
    } catch (error) {
      console.error('Error cargando usuarios autorizados:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async addUser() {
    if (!this.newUser.email || !this.newUser.name) {
      return;
    }

    this.isAdding = true;
    try {
      const success = await this.authorizedUsersService.addAuthorizedUser({
        email: this.newUser.email,
        name: this.newUser.name,
        notification_preferences: this.newUser.preferences
      });

      if (success) {
        // Limpiar formulario
        this.newUser = {
          email: '',
          name: '',
          preferences: {
            push: true,
            email: false,
            urgent_only: false
          }
        };
        
        // Recargar lista
        await this.loadAuthorizedUsers();
      }
    } catch (error) {
      console.error('Error agregando usuario:', error);
    } finally {
      this.isAdding = false;
    }
  }

  async updateUserPreferences(user: AuthorizedUser) {
    // Aquí podrías implementar un modal o formulario para editar preferencias
    console.log('Editar preferencias de:', user);
  }

  async deactivateUser(email: string) {
    if (confirm('¿Estás seguro de que quieres desactivar este usuario?')) {
      try {
        const success = await this.authorizedUsersService.deactivateUser(email);
        if (success) {
          await this.loadAuthorizedUsers();
        }
      } catch (error) {
        console.error('Error desactivando usuario:', error);
      }
    }
  }
} 