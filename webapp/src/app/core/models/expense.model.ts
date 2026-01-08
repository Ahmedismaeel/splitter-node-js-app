export interface ExpenseSplit {
  userId: string;
  amount: number;
  userName?: string;
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  paidByName?: string;
  title: string;
  amount: number;
  splitType: 'equal' | 'exact' | 'percentage';
  splits: ExpenseSplit[];
  createdAt: string;
}

export interface Balance {
  userId: string;
  userName: string;
  balance: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  amount: number;
  createdAt: string;
}

export interface CreateExpenseRequest {
  groupId: string;
  title: string;
  amount: number;
  splitType: 'equal' | 'exact' | 'percentage';
  splits: ExpenseSplit[];
}

export interface CreateSettlementRequest {
  groupId: string;
  toUserId: string;
  amount: number;
}
