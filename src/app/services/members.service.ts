import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../environments/environments';
import { FamilyMember } from '../models/family-member.model';

@Injectable({
  providedIn: 'root'
})
export class MembersService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Obtener todos los miembros
  getAllMembers(): Observable<FamilyMember[]> {
    return from(
      this.supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyMember[];
      })
    );
  }

  // Crear nuevo miembro
  addMember(member: Omit<FamilyMember, 'id' | 'created_at'>): Observable<FamilyMember> {
    return from(
      this.supabase
        .from('family_members')
        .insert(member)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyMember;
      })
    );
  }

  // Actualizar miembro
  updateMember(member: FamilyMember): Observable<FamilyMember> {
    const { id, created_at, ...updateData } = member;
    
    return from(
      this.supabase
        .from('family_members')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyMember;
      })
    );
  }

  // Eliminar miembro
  deleteMember(id: string): Observable<boolean> {
    return from(
      this.supabase
        .from('family_members')
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