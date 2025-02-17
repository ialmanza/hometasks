import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ShoppingListItem } from '../../models/shoppinglist';
import { ShoppingListService } from '../../services/shopping-list.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

interface QuickAddProduct {
  name: string;
  category: 'fruits' | 'vegetables' | 'other';
  quantity: number;
  unit: string;
}

@Component({
  selector: 'app-shopping-list',
  imports: [CommonModule, ReactiveFormsModule, AppNavigationComponent],
  providers: [ShoppingListService],
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.css'
})
export class ShoppingListComponent {
  shoppingItems: ShoppingListItem[] = [];
  itemForm: FormGroup;
  editingItem: ShoppingListItem | null = null;

  // Valores por defecto definidos como constantes
  private DEFAULT_VALUES = {
    category: 'other',
    quantity: 1,
    unit: 'unidad'
  };

  quickAddProducts: QuickAddProduct[] = [
    {
      name: 'Arroz',
      category: 'other',
      quantity: 1,
      unit: 'kg'
    },
    {
      name: 'Tomate',
      category: 'vegetables',
      quantity: 1,
      unit: 'kg'
    },
    {
      name: 'Lechuga',
      category: 'vegetables',
      quantity: 1,
      unit: 'unidad'
    },
    {
      name: 'Morrón',
      category: 'vegetables',
      quantity: 1,
      unit: 'unidad'
    },
    {
      name: 'Cebolla',
      category: 'vegetables',
      quantity: 1,
      unit: 'unidad'
    },
    {
      name: 'Manzana',
      category: 'fruits',
      quantity: 1,
      unit: 'kg'
    },
    {
      name: 'Banana',
      category: 'fruits',
      quantity: 1,
      unit: 'kg'
    },
    {
      name: 'Leche',
      category: 'other',
      quantity: 1,
      unit: 'litro'
    },
    {
      name: 'Huevos',
      category: 'other',
      quantity: 1,
      unit: 'litro'
    }
  ];


  constructor(
    private shoppingListService: ShoppingListService,
    private fb: FormBuilder
  ) {
    // this.itemForm = this.fb.group({
    //   name: ['', Validators.required],
    //   category: ['other', Validators.required],
    //   quantity: [1, [Validators.required, Validators.min(1)]],
    //   unit: ['', Validators.required]
    // });
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      category: [this.DEFAULT_VALUES.category],
      quantity: [this.DEFAULT_VALUES.quantity],
      unit: [this.DEFAULT_VALUES.unit]
    });
  }

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.shoppingListService.getItems().subscribe({
      next: (items) => {
        this.shoppingItems = items;
      },
      error: (err) => {
        console.error('Error loading items', err);
      }
    });
  }

  // onSubmit() {
  //   if (this.itemForm.valid) {
  //     const itemData: ShoppingListItem = {
  //       ...this.itemForm.value,
  //       is_purchased: false
  //     };

  //     if (this.editingItem) {
  //       // Update existing item
  //       itemData.id = this.editingItem.id;
  //       this.shoppingListService.updateItem(itemData).subscribe({
  //         next: () => {
  //           this.loadItems();
  //           this.resetForm();
  //         },
  //         error: (err) => console.error('Error updating item', err)
  //       });
  //     } else {
  //       // Create new item
  //       this.shoppingListService.createItem(itemData).subscribe({
  //         next: () => {
  //           this.loadItems();
  //           this.resetForm();
  //         },
  //         error: (err) => console.error('Error creating item', err)
  //       });
  //     }
  //   }
  // }

  onSubmit() {
    if (this.itemForm.valid) {
      const formValues = this.itemForm.value;
      const itemData: ShoppingListItem = {
        name: formValues.name,
        category: formValues.category || this.DEFAULT_VALUES.category,
        quantity: formValues.quantity || this.DEFAULT_VALUES.quantity,
        unit: formValues.unit || this.DEFAULT_VALUES.unit,
        is_purchased: false
      };

      if (this.editingItem) {
        itemData.id = this.editingItem.id;
        this.shoppingListService.updateItem(itemData).subscribe({
          next: () => {
            this.loadItems();
            this.resetForm();
          },
          error: (err) => console.error('Error updating item', err)
        });
      } else {
        this.shoppingListService.createItem(itemData).subscribe({
          next: () => {
            this.loadItems();
            this.resetForm();
          },
          error: (err) => console.error('Error creating item', err)
        });
      }
    }
  }

  editItem(item: ShoppingListItem) {
    this.editingItem = item;
    this.itemForm.patchValue({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit
    });
  }

  deleteItem(id: number) {
    this.shoppingListService.deleteItem(id).subscribe({
      next: () => {
        this.loadItems();
      },
      error: (err) => console.error('Error deleting item', err)
    });
  }

  togglePurchased(item: ShoppingListItem) {
    const updatedItem = { ...item, is_purchased: !item.is_purchased };
    this.shoppingListService.updateItem(updatedItem).subscribe({
      next: () => {
        this.loadItems();
      },
      error: (err) => console.error('Error toggling item', err)
    });
  }

  // resetForm() {
  //   this.itemForm.reset({
  //     name: '',
  //     category: 'other',
  //     quantity: 1,
  //     unit: ''
  //   });
  //   this.editingItem = null;
  // }

  resetForm() {
    this.itemForm.reset({
      name: '',
      category: this.DEFAULT_VALUES.category,
      quantity: this.DEFAULT_VALUES.quantity,
      unit: this.DEFAULT_VALUES.unit
    });
    this.editingItem = null;
  }

    // Método para añadir producto rápido
    quickAddProduct(product: QuickAddProduct) {
      const itemData: ShoppingListItem = {
        ...product,
        is_purchased: false
      };

      this.shoppingListService.createItem(itemData).subscribe({
        next: () => {
          this.loadItems();
        },
        error: (err) => console.error('Error adding quick product', err)
      });
    }

    cancelEdit() {
      this.resetForm();
    }
}
