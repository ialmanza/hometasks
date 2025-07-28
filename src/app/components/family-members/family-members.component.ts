import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faEdit, faTrash, faArrowLeft, faX } from '@fortawesome/free-solid-svg-icons';
import { FamilyMember } from '../../models/family-member.model';
import { MembersService } from '../../services/members.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";

@Component({
  selector: 'app-family-members',
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, AppNavigationComponent],
  templateUrl: './family-members.component.html',
  styleUrl: './family-members.component.css'
})
export class FamilyMembersComponent implements OnInit {
  members: FamilyMember[] = [];
  editingMember: FamilyMember | null = null;
  showAddForm = false;
  memberForm: FormGroup;
  loading = false;

  // Icons
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faArrowLeft = faArrowLeft;
  faX = faX;

  constructor(
    private membersService: MembersService,
    private fb: FormBuilder
  ) {
    this.memberForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.loading = true;
    this.membersService.getAllMembers().subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading members:', error);
        this.loading = false;
      }
    });
  }

  showAddMemberForm() {
    this.showAddForm = true;
    this.editingMember = null;
    this.memberForm.reset();
  }

  hideAddForm() {
    this.showAddForm = false;
    this.editingMember = null;
    this.memberForm.reset();
  }

  startEditing(member: FamilyMember) {
    this.editingMember = { ...member };
    this.memberForm.patchValue({
      name: member.name
    });
    this.showAddForm = true;
  }

  onSubmit() {
    if (this.memberForm.valid) {
      const memberData = {
        name: this.memberForm.get('name')?.value
      };

      if (this.editingMember) {
        // Actualizar miembro existente
        const updatedMember: FamilyMember = {
          ...this.editingMember,
          ...memberData
        };

        this.membersService.updateMember(updatedMember).subscribe({
          next: () => {
            this.loadMembers();
            this.hideAddForm();
          },
          error: (error) => {
            console.error('Error updating member:', error);
          }
        });
      } else {
        // Crear nuevo miembro
        this.membersService.addMember(memberData).subscribe({
          next: () => {
            this.loadMembers();
            this.hideAddForm();
          },
          error: (error) => {
            console.error('Error adding member:', error);
          }
        });
      }
    }
  }

  deleteMember(memberId: string) {
    const confirmed = window.confirm('¿Estás seguro de eliminar este miembro?');
    if (confirmed) {
      this.membersService.deleteMember(memberId).subscribe({
        next: () => {
          this.loadMembers();
        },
        error: (error) => {
          console.error('Error deleting member:', error);
        }
      });
    }
  }

  getMemberInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRandomAvatarColor(): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500',
      'bg-red-500', 'bg-teal-500', 'bg-orange-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
} 