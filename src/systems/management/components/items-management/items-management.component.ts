import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ContentService } from '../../../../shared/services/content.service';
import { ContentAdminService } from '../../services/content-admin.service';
import { PlaceableItem, ObjectType } from '../../../../shared/types/game.types';

@Component({
  selector: 'app-items-management',
  standalone: true,
  templateUrl: './items-management.component.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class ItemsManagementComponent implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  contentService = inject(ContentService);
  contentAdminService = inject(ContentAdminService);

  items = this.contentService.placeableItems;
  isFormOpen = signal(false);
  editingItem = signal<PlaceableItem | null>(null);

  isDeleteModalOpen = signal(false);
  itemToDelete = signal<PlaceableItem | null>(null);

  itemTypes: ObjectType[] = ['decoration', 'building', 'animal_housing', 'factory'];
  itemForm: FormGroup = this.buildItemForm();

  ngOnInit(): void {
    this.itemForm.get('type')?.valueChanges.subscribe(type => this.onTypeChange(type));
  }

  private onTypeChange(type: ObjectType) {
    const fields = {
      producesProductId: this.itemForm.get('producesProductId'),
      productionTime: this.itemForm.get('productionTime'),
      recipeIds: this.itemForm.get('recipeIds'),
      baseQueueSize: this.itemForm.get('baseQueueSize'),
      upgradeCost: this.itemForm.get('upgradeCost'),
      speedPerLevel: this.itemForm.get('speedPerLevel'),
    };

    // Reset all conditional fields
    Object.values(fields).forEach(control => {
      control?.clearValidators();
      control?.setValue(null);
    });
    
    // Set new validators based on type
    if (type === 'animal_housing') {
      fields.producesProductId?.setValidators(Validators.required);
      fields.productionTime?.setValidators([Validators.required, Validators.min(1)]);
    } else if (type === 'factory') {
      fields.recipeIds?.setValidators(Validators.required);
      fields.baseQueueSize?.setValidators([Validators.required, Validators.min(1)]);
      fields.upgradeCost?.setValidators([Validators.required, Validators.min(0)]);
      fields.speedPerLevel?.setValidators([Validators.required, Validators.min(0.01)]);
    }

    // Update validity for all
    Object.values(fields).forEach(control => control?.updateValueAndValidity());
  }
  
  openForm(item: PlaceableItem | null = null) {
    this.editingItem.set(item);
    if (item) {
      this.itemForm.patchValue({
        ...item,
        productionTime: item.productionTime ? item.productionTime / 1000 : null,
        recipeIds: item.recipeIds ? item.recipeIds.join(', ') : null,
      });
    } else {
      this.itemForm.reset({
        type: 'decoration',
        cost: 100,
        width: 1,
        height: 1,
        unlockLevel: 1,
      });
    }
    this.onTypeChange(this.itemForm.get('type')?.value);
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
  }

  async onSubmit() {
    if (this.itemForm.invalid) return;

    const formValue = this.itemForm.getRawValue();

    // Base item data
    const itemData: PlaceableItem = {
      id: formValue.id,
      name: formValue.name,
      description: formValue.description,
      type: formValue.type,
      cost: formValue.cost,
      width: formValue.width,
      height: formValue.height,
      asset: formValue.asset,
      unlockLevel: formValue.unlockLevel,
    };

    // Add conditional properties
    if (formValue.type === 'animal_housing') {
      itemData.producesProductId = formValue.producesProductId;
      itemData.productionTime = formValue.productionTime * 1000;
    } else if (formValue.type === 'factory') {
      itemData.recipeIds = formValue.recipeIds.split(',').map((t: string) => t.trim()).filter(Boolean);
      itemData.baseQueueSize = formValue.baseQueueSize;
      itemData.upgradeCost = formValue.upgradeCost;
      itemData.speedPerLevel = formValue.speedPerLevel;
    }

    await this.contentAdminService.savePlaceableItem(itemData);
    this.closeForm();
  }

  requestDelete(item: PlaceableItem) {
    this.itemToDelete.set(item);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.itemToDelete.set(null);
  }

  async confirmDelete() {
    const item = this.itemToDelete();
    if (item) {
      await this.contentAdminService.deletePlaceableItem(item.id);
      this.closeDeleteModal();
    }
  }

  private buildItemForm(): FormGroup {
    return this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-z_]+$/)]],
      name: ['', Validators.required],
      description: [''],
      type: ['decoration' as ObjectType, Validators.required],
      cost: [0, [Validators.required, Validators.min(0)]],
      width: [1, [Validators.required, Validators.min(1)]],
      height: [1, [Validators.required, Validators.min(1)]],
      asset: ['', Validators.required],
      unlockLevel: [1, [Validators.required, Validators.min(1)]],
      // Conditional fields initialized as null
      producesProductId: [null as string | null],
      productionTime: [null as number | null],
      recipeIds: [null as string | null],
      baseQueueSize: [null as number | null],
      upgradeCost: [null as number | null],
      speedPerLevel: [null as number | null],
    });
  }
}
