import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { Client } from '../../../../services/api/client';
import { WithdrawContractService } from '../../../blockchain/contracts/withdraw-contract.service';
import { Session } from '../../../../services/session';
import { WalletTokenWithdrawLedgerComponent } from './ledger/ledger.component';

@Component({
  moduleId: module.id,
  selector: 'm-wallet-token--withdraw',
  templateUrl: 'withdraw.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletTokenWithdrawComponent {
  inProgress: boolean = false;
  balance: number = 0;
  amount: number = 0;

  error: string = '';

  @ViewChild(WalletTokenWithdrawLedgerComponent)
  protected ledgerComponent: WalletTokenWithdrawLedgerComponent;

  constructor (
    protected client: Client,
    protected cd: ChangeDetectorRef,
    protected session: Session,
    protected contract: WithdrawContractService,
  ) { }

  ngOnInit() {
    this.load();
  }

  async load() {
    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {
      let response: any = await this.client.get(`api/v2/blockchain/wallet/balance`);

      if (response && typeof response.addresses !== 'undefined') {
        this.balance = response.addresses[1].balance / Math.pow(10, 18);
        this.setAmount(this.balance);
      } else {
        this.error = 'Server error';
      }
    } catch (e) {
      console.error(e);
      this.error = (e && e.message) || 'Server error';
    } finally {
      this.inProgress = false;
      this.detectChanges();
    }
  }

  setAmount(amount: number | string) {
    if (!amount) {
      this.amount = 0;
      return;
    }

    if (typeof amount === 'number') {
      this.amount = amount;
      return;
    }

    amount = amount.replace(/,/g, '');
    this.amount = parseFloat(amount);
  }

  canWithdraw() {
    return !this.inProgress && !this.error && this.amount > 0 && this.amount <= this.balance;
  }

  async withdraw() {
    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {

      let result: { address, guid, amount, gas, tx} = await this.contract.request(
        this.session.getLoggedInUser().guid, 
        this.amount * Math.pow(10, 18)
      );
  
      let response: any = await this.client.post(`api/v2/blockchain/transactions/withdraw`, result);
  
      if (response.done) {
        this.refresh();
        this.ledgerComponent.prepend(response.entity);
      } else {
        this.error = 'Server error';
      }

    } catch (e) {
      console.error(e);
      this.error = (e && e.message) || 'Server error';
    } finally {
      this.inProgress = false;
      this.detectChanges();
    }
  }
  
  refresh() {
    this.load();
  }

  detectChanges() {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }
}