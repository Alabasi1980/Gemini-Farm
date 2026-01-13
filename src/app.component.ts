import { ChangeDetectionStrategy, Component, signal, Pipe, PipeTransform, inject, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { FarmPageComponent } from './systems/farm/components/farm-page/farm-page.component';
import { ShopPageComponent } from './systems/shop/components/shop-page/shop-page.component';
import { InventoryPageComponent } from './systems/inventory/components/inventory-page/inventory-page.component';
import { ProductionPageComponent } from './systems/production/components/production-page/production-page.component';
import { TasksPageComponent } from './systems/tasks/components/tasks-page/tasks-page.component';
import { CommunityPageComponent } from './systems/community/components/community-page/community-page.component';
import { ManagementPageComponent } from './systems/management/components/management-page/management-page.component';
import { MarketTickerComponent } from './systems/market/components/market-ticker/market-ticker.component';
import { GameStateService } from './systems/player/services/game-state.service';
import { AuthenticationService } from './systems/player/services/authentication.service';
import { AuthPageComponent } from './systems/auth/components/auth-page/auth-page.component';
import { ContentSeedingService } from './systems/management/services/content-seeding.service';
import { ObservabilityService } from './shared/services/observability.service';
import { TutorialService } from './systems/tutorial/services/tutorial.service';
import { TutorialGuideComponent } from './systems/tutorial/components/tutorial-guide/tutorial-guide.component';

type Tab = 'Farm' | 'Shop' | 'Inventory' | 'Production' | 'Tasks' | 'Community' | 'Admin Panel';

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FarmPageComponent,
    ShopPageComponent,
    InventoryPageComponent,
    ProductionPageComponent,
    TasksPageComponent,
    CommunityPageComponent,
    ManagementPageComponent,
    MarketTickerComponent,
    SafeHtmlPipe,
    AuthPageComponent,
    TutorialGuideComponent,
  ],
})
export class AppComponent implements OnInit {
  gameStateService = inject(GameStateService);
  authService = inject(AuthenticationService);
  contentSeedingService = inject(ContentSeedingService);
  observabilityService = inject(ObservabilityService);
  tutorialService = inject(TutorialService);

  isTutorialCompleted = this.tutorialService.isTutorialCompleted;
  activeTab = signal<Tab>('Farm');
  authStatus = this.authService.authState;
  userRole = this.authService.userRole;
  isInitializing = signal(true);
  saveStatus = this.gameStateService.saveStatus;
  conflictDetected = this.gameStateService.conflictDetected;

  baseNavItems: NavItem[] = [
    { id: 'Farm', label: 'Farm', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>' },
    { id: 'Shop', label: 'Shop', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>' },
    { id: 'Inventory', label: 'Inventory', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>' },
    { id: 'Production', label: 'Production', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>' },
    { id: 'Tasks', label: 'Tasks', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>' },
    { id: 'Community', label: 'Community', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>' },
    { id: 'Admin Panel', label: 'Admin Panel', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>', adminOnly: true },
  ];

  navItems = computed(() => {
    const role = this.userRole();
    if (role === 'admin') {
      return this.baseNavItems;
    }
    return this.baseNavItems.filter(item => !item.adminOnly);
  });

  constructor() {
    let sessionStarted = false;
    effect(() => {
      const user = this.authService.user();
      if (user && !sessionStarted) {
        sessionStarted = true;
        this.observabilityService.logEvent('session_start', { email: user.email });
      } else if (!user) {
        sessionStarted = false;
      }
    });
  }

  async ngOnInit() {
    await this.initializeApp();
  }

  async initializeApp() {
    this.isInitializing.set(true);
    // Ensure database has content before loading game state
    await this.contentSeedingService.seedInitialContentIfNeeded();
    await this.gameStateService.initialize();
    this.isInitializing.set(false);
  }

  changeTab(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'Inventory') {
        this.tutorialService.triggerAction('tutorial-inventory-tab');
    } else if (tab === 'Shop') {
        this.tutorialService.triggerAction('tutorial-shop-tab');
    }
  }

  logout() {
    this.authService.logout();
  }

  reloadPage() {
    window.location.reload();
  }
}