import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CropsManagementComponent } from '../crops-management/crops-management.component';
import { ItemsManagementComponent } from '../items-management/items-management.component';

type ContentTab = 'crops' | 'items';

@Component({
  selector: 'app-content-management',
  templateUrl: './content-management.component.html',
  imports: [CommonModule, CropsManagementComponent, ItemsManagementComponent],
})
export class ContentManagementComponent {
  activeTab = signal<ContentTab>('crops');

  setTab(tab: ContentTab) {
    this.activeTab.set(tab);
  }
}