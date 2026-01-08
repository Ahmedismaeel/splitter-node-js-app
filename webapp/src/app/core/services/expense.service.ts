import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Expense, CreateExpenseRequest } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  constructor(private api: ApiService) {}

  createExpense(data: CreateExpenseRequest): Observable<Expense> {
    return this.api.post('/expenses', data);
  }

  getGroupExpenses(groupId: string): Observable<Expense[]> {
    return this.api.get(`/expenses/group/${groupId}`);
  }

  getExpenseDetails(expenseId: string): Observable<Expense> {
    return this.api.get(`/expenses/${expenseId}`);
  }
}
