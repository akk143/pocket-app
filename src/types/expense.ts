export type TransactionType = "expense" | "income"
export type RecurringFrequency = "monthly" | "weekly" | "daily"

export interface Expense {
  id: string
  type?: TransactionType
  amount: number
  categoryId: string
  categoryName: string
  item: string
  note: string
  date: string       
  time: string       
  createdAt: number  
}

export interface RecurringTransaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  categoryName: string
  item: string
  note?: string
  frequency: RecurringFrequency
  dayOfMonth?: number 
  dayOfWeek?: number  
  lastRunDate?: string 
  nextDueDate: string  
  active: boolean
  createdAt: number
}
