import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Balance, Settlement, CreateSettlementRequest } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {
  constructor(private api: ApiService) {}

  getGroupBalances(groupId: string): Observable<Balance[]> {
    return this.api.get(`/balances/group/${groupId}`);
  }

  createSettlement(data: CreateSettlementRequest): Observable<Settlement> {
    return this.api.post('/balances/settlements', data);
  }

  getSettlementHistory(groupId: string): Observable<Settlement[]> {
    return this.api.get(`/balances/settlements/group/${groupId}`);
  }
}
