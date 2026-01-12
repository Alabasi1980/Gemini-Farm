import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketService } from '../../services/market.service';

@Component({
  selector: 'app-market-ticker',
  templateUrl: './market-ticker.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketTickerComponent {
    marketService = inject(MarketService);
    activeEvent = this.marketService.activeEvent;
}
