import { Component, OnInit } from '@angular/core';
import { CreditService } from './services/credit.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }
  `]
})
export class AppComponent implements OnInit {
  constructor(private creditService: CreditService) {}

  ngOnInit() {
    // Check for daily grant on startup
    this.creditService.processDailyGrant();
    
    // Hide loading splash
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }
}
