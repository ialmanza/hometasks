import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, PostgrestSingleResponse  } from '@supabase/supabase-js';
import { Observable, from, map, of } from 'rxjs';
import { environment } from '../../environments/environments';
import { ShoppingListItem } from '../models/shoppinglist';


@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private supabase: SupabaseClient;

  constructor() {
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
      created_at: response.data.created_at
    };
  }

createItem(item: Omit<ShoppingListItem, 'id' | 'created_at'>): Observable<ShoppingListItem> {
    return from(
      this.supabase
        .from('shopping_list')
        .insert(item)
        .select()
        .single()
    ).pipe(
      map(response => this.mapSingleResponse(response))
    );
  }

  // Obtener todos los elementos
  getItems(): Observable<ShoppingListItem[]> {
    return from(
      this.supabase
        .from('shopping_list')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as ShoppingListItem[];
      })
    );
  }

  // Actualizar un elemento
  updateItem(item: ShoppingListItem): Observable<ShoppingListItem> {
    // Extraer solo los campos necesarios para la actualización
    const { id, created_at, ...updateData } = item;

    return from(
      this.supabase
        .from('shopping_list')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => this.mapSingleResponse(response))
    );
  }

  // Eliminar un elemento
  deleteItem(id: number): Observable<boolean> {
    return from(
      this.supabase
        .from('shopping_list')
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return true;
      })
    );
  }

}
