import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { ContentService } from '../../../../shared/services/content.service';
import { ContentAdminService } from '../../services/content-admin.service';
import { Crop, CropGrowthStage } from '../../../../shared/types/game.types';

@Component({
  selector: 'app-crops-management',
  standalone: true,
  templateUrl: './crops-management.component.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class CropsManagementComponent {
  private fb: FormBuilder = inject(FormBuilder);
  contentService = inject(ContentService);
  contentAdminService = inject(ContentAdminService);

  crops = this.contentService.crops;
  isFormOpen = signal(false);
  editingCrop = signal<Crop | null>(null);
  
  isDeleteModalOpen = signal(false);
  cropToDelete = signal<Crop | null>(null);

  cropForm: FormGroup = this.buildCropForm();

  get growthStages() {
    return this.cropForm.get('growthStages') as FormArray;
  }

  openForm(crop: Crop | null = null) {
    this.editingCrop.set(crop);
    if (crop) {
      this.cropForm.patchValue({
        ...crop,
        growthTime: crop.growthTime / 1000, // ms to seconds
        balanceTags: crop.balanceTags.join(', '),
      });
      this.growthStages.clear();
      
      let cumulativePercent = 0;
      crop.growthStages.forEach(stage => {
        const percentOfTotal = stage.duration > 0 ? (stage.duration / crop.growthTime) * 100 : 0;
        cumulativePercent += percentOfTotal;
        const endAtPercent = stage.duration > 0 ? cumulativePercent : 100;

        this.growthStages.push(this.fb.group({
          asset: [stage.asset, Validators.required],
          endAtPercent: [endAtPercent, [Validators.required, Validators.min(0), Validators.max(100)]]
        }));
      });
    } else {
      this.cropForm.reset({
        plantCost: 0,
        sellPrice: 0,
        growthTime: 10,
        unlockLevel: 1,
        seasonModifiers: { Spring: 1.0, Summer: 1.0, Autumn: 1.0, Winter: 1.0 }
      });
      this.growthStages.clear();
      this.addGrowthStage();
    }
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
  }

  addGrowthStage() {
    this.growthStages.push(this.fb.group({
      asset: ['', Validators.required],
      endAtPercent: [100, [Validators.required, Validators.min(0), Validators.max(100)]]
    }));
  }

  removeGrowthStage(index: number) {
    this.growthStages.removeAt(index);
  }

  async onSubmit() {
    if (this.cropForm.invalid) return;

    const formValue = this.cropForm.getRawValue();
    const totalGrowthTimeMs = formValue.growthTime * 1000;

    let lastPercent = 0;
    const sortedStages = [...formValue.growthStages].sort((a,b) => a.endAtPercent - b.endAtPercent);
    const newGrowthStages: CropGrowthStage[] = sortedStages.map((stageForm: any, index: number) => {
        const currentPercent = stageForm.endAtPercent;
        const durationPercent = currentPercent - lastPercent;
        lastPercent = currentPercent;
        
        const duration = index === sortedStages.length - 1 
            ? 0 
            : Math.round(totalGrowthTimeMs * (durationPercent / 100));

        return {
            stage: index,
            duration: duration,
            asset: stageForm.asset,
        };
    });
    
    const cropData: Crop = {
      id: formValue.id,
      name: formValue.name,
      description: formValue.description,
      plantCost: formValue.plantCost,
      sellPrice: formValue.sellPrice,
      growthTime: totalGrowthTimeMs,
      unlockLevel: formValue.unlockLevel,
      balanceTags: formValue.balanceTags.split(',').map((t: string) => t.trim()).filter(Boolean),
      seasonModifiers: formValue.seasonModifiers,
      growthStages: newGrowthStages,
    };

    await this.contentAdminService.saveCrop(cropData);
    this.closeForm();
  }

  requestDelete(crop: Crop) {
    this.cropToDelete.set(crop);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.cropToDelete.set(null);
  }

  async confirmDelete() {
    const crop = this.cropToDelete();
    if (crop) {
      await this.contentAdminService.deleteCrop(crop.id);
      this.closeDeleteModal();
    }
  }

  private buildCropForm(): FormGroup {
    return this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-z_]+$/)]],
      name: ['', Validators.required],
      description: [''],
      plantCost: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      growthTime: [0, [Validators.required, Validators.min(1)]],
      unlockLevel: [1, [Validators.required, Validators.min(1)]],
      balanceTags: [''],
      seasonModifiers: this.fb.group({
        Spring: [1.0, Validators.required],
        Summer: [1.0, Validators.required],
        Autumn: [1.0, Validators.required],
        Winter: [1.0, Validators.required],
      }),
      growthStages: this.fb.array([], Validators.required),
    });
  }
}
