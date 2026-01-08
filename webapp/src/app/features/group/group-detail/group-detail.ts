import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupService } from '../../../core/services/group.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { BalanceService } from '../../../core/services/balance.service';
import { Expense, Balance, Settlement } from '../../../core/models/expense.model';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.css',
})
export class GroupDetailComponent implements OnInit {
  group: any;
  expenses: Expense[] = [];
  balances: Balance[] = [];
  settlements: Settlement[] = [];
  
  loading = true;
  loadingExpenses = false;
  loadingBalances = false;
  loadingSettlements = false;
  
  error: string | null = null;
  groupId: string | null = null;

  showExpenseForm = false;
  showSettlementForm = false;
  
  expenseForm: FormGroup;
  settlementForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private groupService: GroupService,
    private expenseService: ExpenseService,
    private balanceService: BalanceService,
    private fb: FormBuilder
  ) {
    this.expenseForm = this.fb.group({
      title: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      splitType: ['equal', Validators.required],
      splits: this.fb.array([])
    });

    this.settlementForm = this.fb.group({
      toUserId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('id');
    if (this.groupId) {
      this.loadGroup(this.groupId);
      this.loadExpenses(this.groupId);
      this.loadBalances(this.groupId);
      this.loadSettlements(this.groupId);
    } else {
      this.error = 'Group ID not found';
      this.loading = false;
    }
  }

  loadGroup(id: string) {
    this.groupService.getGroup(id).subscribe({
      next: (data) => {
        this.group = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load group details';
        this.loading = false;
      }
    });
  }

  loadExpenses(groupId: string) {
    this.loadingExpenses = true;
    this.expenseService.getGroupExpenses(groupId).subscribe({
      next: (data) => {
        this.expenses = data;
        this.loadingExpenses = false;
      },
      error: (err) => {
        console.error('Failed to load expenses', err);
        this.loadingExpenses = false;
      }
    });
  }

  loadBalances(groupId: string) {
    this.loadingBalances = true;
    this.balanceService.getGroupBalances(groupId).subscribe({
      next: (data) => {
        this.balances = data;
        this.loadingBalances = false;
      },
      error: (err) => {
        console.error('Failed to load balances', err);
        this.loadingBalances = false;
      }
    });
  }

  loadSettlements(groupId: string) {
    this.loadingSettlements = true;
    this.balanceService.getSettlementHistory(groupId).subscribe({
      next: (data) => {
        this.settlements = data;
        this.loadingSettlements = false;
      },
      error: (err) => {
        console.error('Failed to load settlements', err);
        this.loadingSettlements = false;
      }
    });
  }

  toggleExpenseForm() {
    this.showExpenseForm = !this.showExpenseForm;
    this.showSettlementForm = false;
    if (this.showExpenseForm) {
      this.initializeSplits();
    }
  }

  toggleSettlementForm() {
    this.showSettlementForm = !this.showSettlementForm;
    this.showExpenseForm = false;
  }

  get splits(): FormArray {
    return this.expenseForm.get('splits') as FormArray;
  }

  initializeSplits() {
    this.splits.clear();
    if (this.group?.members) {
      this.group.members.forEach((member: any) => {
        this.splits.push(this.fb.group({
          userId: [member.userId],
          userName: [member.userName || member.name],
          amount: [0, [Validators.required, Validators.min(0)]]
        }));
      });
    }
  }

  onSplitTypeChange() {
    const splitType = this.expenseForm.get('splitType')?.value;
    const amount = parseFloat(this.expenseForm.get('amount')?.value || 0);
    
    if (splitType === 'equal' && amount > 0) {
      const perPerson = amount / this.splits.length;
      this.splits.controls.forEach(control => {
        control.patchValue({ amount: perPerson.toFixed(2) });
      });
    }
  }

  onExpenseSubmit() {
    if (this.expenseForm.invalid || !this.groupId) return;

    const formValue = this.expenseForm.value;
    const expenseData = {
      groupId: this.groupId,
      title: formValue.title,
      amount: parseFloat(formValue.amount),
      splitType: formValue.splitType,
      splits: formValue.splits.map((s: any) => ({
        userId: s.userId,
        amount: parseFloat(s.amount)
      }))
    };

    this.expenseService.createExpense(expenseData).subscribe({
      next: (expense) => {
        this.expenses.unshift(expense);
        this.showExpenseForm = false;
        this.expenseForm.reset({ splitType: 'equal' });
        this.loadBalances(this.groupId!);
      },
      error: (err) => {
        this.error = err.message || 'Failed to create expense';
      }
    });
  }

  onSettlementSubmit() {
    if (this.settlementForm.invalid || !this.groupId) return;

    const formValue = this.settlementForm.value;
    const settlementData = {
      groupId: this.groupId,
      toUserId: formValue.toUserId,
      amount: parseFloat(formValue.amount)
    };

    this.balanceService.createSettlement(settlementData).subscribe({
      next: (settlement) => {
        this.settlements.unshift(settlement);
        this.showSettlementForm = false;
        this.settlementForm.reset();
        this.loadBalances(this.groupId!);
      },
      error: (err) => {
        this.error = err.message || 'Failed to create settlement';
      }
    });
  }

  getBalanceClass(balance: number): string {
    if (balance > 0) return 'balance-positive';
    if (balance < 0) return 'balance-negative';
    return 'balance-neutral';
  }
}
