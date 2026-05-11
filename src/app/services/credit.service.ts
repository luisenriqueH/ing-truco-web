import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CreditService {
  private readonly COINS_KEY = 'truco_coins';
  private readonly LAST_GRANT_KEY = 'truco_last_grant';
  private readonly DAILY_GRANT_AMOUNT = 10;
  private readonly GRANT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in ms

  private coins: number = 0;

  constructor() {
    this.loadState();
    this.processDailyGrant();
  }

  private loadState() {
    const stored = localStorage.getItem(this.COINS_KEY);
    this.coins = stored ? parseInt(stored, 10) : 100; // Initial 100 coins
  }

  private saveState() {
    localStorage.setItem(this.COINS_KEY, this.coins.toString());
  }

  getCoins(): number {
    return this.coins;
  }

  processDailyGrant() {
    const startTime = performance.now();
    const lastGrant = localStorage.getItem(this.LAST_GRANT_KEY);
    const now = Date.now();

    if (!lastGrant || (now - parseInt(lastGrant, 10)) >= this.GRANT_COOLDOWN) {
      this.coins += this.DAILY_GRANT_AMOUNT;
      localStorage.setItem(this.LAST_GRANT_KEY, now.toString());
      this.saveState();
      
      const endTime = performance.now();
      console.log(`[CreditService] Daily grant awarded in ${(endTime - startTime).toFixed(4)}ms`);
      return true;
    }
    return false;
  }

  buyCoins(pkg: 'pack_1' | 'pack_2' | 'pack_3') {
    const config = {
      'pack_1': { amt: 10, prc: '1.00', name: 'Pack de Iniciación' },
      'pack_2': { amt: 100, prc: '5.00', name: 'Pack Guerrero' },
      'pack_3': { amt: 1000, prc: '20.00', name: 'Pack Legendario' }
    };

    const selected = config[pkg];
    const txid = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Redirect to Koningo Gateway
    const baseUrl = 'https://koningo.com/beta/gravedad/pay/paypal.php';
    const params = new URLSearchParams({
      gid: 'truco_ve',
      pkg: pkg,
      amt: selected.amt.toString(),
      prc: selected.prc,
      txid: txid,
      ret: window.location.href // Return to current page
    });

    window.location.href = `${baseUrl}?${params.toString()}`;
  }
}
