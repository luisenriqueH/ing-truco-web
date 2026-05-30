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
    this.checkPaymentCallback();
  }

  private checkPaymentCallback() {
    // We check both window.location.search and the search parameters within the hash
    const searchParams = new URLSearchParams(window.location.search);

    // Check if the hash contains query parameters
    let hashSearch = '';
    const hashIndex = window.location.href.indexOf('#');
    if (hashIndex !== -1) {
      const hashPart = window.location.href.substring(hashIndex);
      const questionMarkIndex = hashPart.indexOf('?');
      if (questionMarkIndex !== -1) {
        hashSearch = hashPart.substring(questionMarkIndex);
      }
    }
    const hashParams = new URLSearchParams(hashSearch);

    // Get parameters from either search or hash
    const status = searchParams.get('status') || hashParams.get('status');
    const payment = searchParams.get('payment') || hashParams.get('payment');
    const txid = searchParams.get('txid') || hashParams.get('txid');
    const pkg = searchParams.get('pkg') || hashParams.get('pkg');
    const amtStr = searchParams.get('amt') || hashParams.get('amt');

    const isSuccess = status === 'success' || status === 'completed' || payment === 'success' || payment === 'completed';

    if (txid && isSuccess) {
      const processedTxs = this.getProcessedTxs();
      if (!processedTxs.includes(txid)) {
        let amount = 0;
        if (amtStr) {
          amount = parseInt(amtStr, 10);
        } else if (pkg) {
          const config: Record<string, number> = {
            '10CR': 10,
            '100CR': 100,
            '1000CR': 1000
          };
          amount = config[pkg] || 0;
        }

        if (amount > 0) {
          this.addCoins(amount);
          this.markTxAsProcessed(txid);
          console.log(`[CreditService] Payment verified successfully! Added ${amount} coins for TXID: ${txid}`);
          alert(`¡Pago procesado con éxito! Se han cargado ${amount} monedas a tu monedero.`);
        }
      } else {
        console.log(`[CreditService] Transaction ${txid} was already processed.`);
      }

      // Clean up URL parameters to keep it clean and avoid reprocessing on reload
      this.clearUrlParams();
    }
  }

  private getProcessedTxs(): string[] {
    const stored = localStorage.getItem('truco_processed_txs');
    return stored ? JSON.parse(stored) : [];
  }

  private markTxAsProcessed(txid: string) {
    const txs = this.getProcessedTxs();
    txs.push(txid);
    localStorage.setItem('truco_processed_txs', JSON.stringify(txs));
  }

  private clearUrlParams() {
    try {
      const url = new URL(window.location.href);
      // Clear query params in main search
      url.search = '';

      // Clear query params in hash if present
      if (url.hash.includes('?')) {
        url.hash = url.hash.split('?')[0];
      }

      window.history.replaceState({}, document.title, url.toString());
    } catch (e) {
      console.error('Error clearing URL params:', e);
    }
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

  addCoins(amount: number) {
    this.coins += amount;
    this.saveState();
    console.log(`[CreditService] Added ${amount} coins. New balance: ${this.coins}`);
  }

  deductCoins(amount: number): boolean {
    if (this.coins >= amount) {
      this.coins -= amount;
      this.saveState();
      console.log(`[CreditService] Deducted ${amount} coins. New balance: ${this.coins}`);
      return true;
    }
    console.warn(`[CreditService] Insufficient coins to deduct ${amount}. Balance: ${this.coins}`);
    return false;
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

  buyCoins(pkg: '10CR' | '100CR' | '1000CR') {
    const config = {
      '10CR': { amt: 10, prc: '1.00', name: 'Pack de Iniciación' },
      '100CR': { amt: 100, prc: '5.00', name: 'Pack Guerrero' },
      '1000CR': { amt: 1000, prc: '20.00', name: 'Pack Legendario' }
    };

    const selected = config[pkg];
    const txid = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Redirect to Koningo Gateway
    const baseUrl = 'https://koningo.com/tools/pay/paypal.php';
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
