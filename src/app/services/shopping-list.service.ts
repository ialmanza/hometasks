import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, PostgrestSingleResponse  } from '@supabase/supabase-js';
import { Observable, from, map, of } from 'rxjs';
import { environment } from '../../environments/environments';
import { ShoppingListItem } from '../models/shoppinglist';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  private mapSingleResponse(response: PostgrestSingleResponse<any>): ShoppingListItem {
    if (response.error) {
      throw response.error;
    }

    // Asegurarse de que la respuesta coincida con ShoppingListItem
    return {
      id: response.data.id,
      name: response.data.name,
      category: response.data.category,
      quantity: response.data.quantity,
      unit: response.data.unit,
      is_purchased: response.data.is_purchased,
      created_at: response.data.created_at,
      user_id: response.data.user_id
    };
  }

  createItem(item: Omit<ShoppingListItem, 'id' | 'created_at' | 'user_id'>): Observable<ShoppingListItem> {
    return from(this.createItemAsync(item));
  }

  private async createItemAsync(item: Omit<ShoppingListItem, 'id' | 'created_at' | 'user_id'>): Promise<ShoppingListItem> {
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user found');
    }

    const response = await this.supabase
      .from('shopping_list')
      .insert({ ...item, user_id: userId })
      .select()
      .single();

    return this.mapSingleResponse(response);
  }

  // Obtener todos los elementos del usuario actual
  getItems(): Observable<ShoppingListItem[]> {
    return from(this.getItemsAsync());
  }

  private async getItemsAsync(): Promise<ShoppingListItem[]> {
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return [];
    }

    const response = await this.supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (response.error) {
      throw response.error;
    }
    return response.data as ShoppingListItem[];
  }

  // Actualizar un elemento
  updateItem(item: ShoppingListItem): Observable<ShoppingListItem> {
    return from(this.updateItemAsync(item));
  }

  private async updateItemAsync(item: ShoppingListItem): Promise<ShoppingListItem> {
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user found');
    }

    // Extraer solo los campos necesarios para la actualización
    const { id, created_at, user_id, ...updateData } = item;

    const response = await this.supabase
      .from('shopping_list')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return this.mapSingleResponse(response);
  }

  // Eliminar un elemento
  deleteItem(id: number): Observable<boolean> {
    return from(this.deleteItemAsync(id));
  }

  private async deleteItemAsync(id: number): Promise<boolean> {
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user found');
    }

    const { error } = await this.supabase
      .from('shopping_list')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
    return true;
  }

}
