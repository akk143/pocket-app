import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Expense } from "../types/expense"
import { TRANSACTION_CATEGORIES } from "../constants/categories"

// Firestore path: users/{userId}/expenses/{expenseId}

export function subscribeToExpenses(
  userId: string,
  onData: (expenses: Expense[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, "users", userId, "expenses"),
    orderBy("createdAt", "desc"),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const expenses: Expense[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<Expense, "id">

        // Audit Check
        const catDef = TRANSACTION_CATEGORIES.find(c => c.id === data.categoryId);
        if (catDef && catDef.type !== (data.type || "expense")) {
          console.warn(`[AUDIT] Invalid Transaction Found: ID ${d.id} is type '${data.type || "expense"}' but uses category '${data.categoryId}' which is for '${catDef.type}'. Manual review required.`);
        }

        return {
          ...data,
          id: d.id,
          type: data.type ?? "expense",
        }
      })
      onData(expenses.filter((expense) => !expense.deletedAt))
    },
    (err) => onError(err),
  )
}

export function subscribeToDeletedExpenses(
  userId: string,
  onData: (expenses: Expense[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, "users", userId, "expenses"),
    orderBy("createdAt", "desc"),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const expenses: Expense[] = snapshot.docs
        .map((d) => {
          const data = d.data() as Omit<Expense, "id">
          return {
            ...data,
            id: d.id,
            type: data.type ?? "expense",
          }
        })
        .filter((expense) => !!expense.deletedAt)
      onData(expenses)
    },
    (err) => onError(err),
  )
}

function validateTransactionCategory(type: string, categoryId: string) {
  if (!categoryId) return;
  const cat = TRANSACTION_CATEGORIES.find(c => c.id === categoryId);
  if (cat && cat.type !== type) {
    throw new Error(`Category ${categoryId} is not allowed for transaction type ${type}`);
  }
}

export async function addExpense(
  userId: string,
  expense: Omit<Expense, "id">,
): Promise<string> {
  validateTransactionCategory(expense.type || "expense", expense.categoryId);
  const ref = await addDoc(
    collection(db, "users", userId, "expenses"),
    {
      ...expense,
      type: expense.type || "expense",
    },
  )
  return ref.id
}

export async function updateExpense(
  userId: string,
  expenseId: string,
  data: Partial<Omit<Expense, "id">>,
): Promise<void> {
  if (data.type || data.categoryId) {
    // If either type or category is being updated, we should ideally validate the final state.
    // Since we only have partial data here, we validate the data being sent if both are present.
    if (data.type && data.categoryId) {
      validateTransactionCategory(data.type, data.categoryId);
    }
  }
  await updateDoc(doc(db, "users", userId, "expenses", expenseId), data)
}

export async function deleteExpense(
  userId: string,
  expenseId: string,
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "expenses", expenseId), {
    deletedAt: Date.now(),
  })
}

export async function restoreExpense(
  userId: string,
  expenseId: string,
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "expenses", expenseId), {
    deletedAt: null,
  })
}

export async function permanentlyDeleteExpense(
  userId: string,
  expenseId: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "expenses", expenseId))
}
