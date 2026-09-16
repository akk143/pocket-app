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
        return {
          id: d.id,
          type: data.type || "expense",
          ...data,
        }
      })
      onData(expenses)
    },
    (err) => onError(err),
  )
}

export async function addExpense(
  userId: string,
  expense: Omit<Expense, "id">,
): Promise<string> {
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
  await updateDoc(doc(db, "users", userId, "expenses", expenseId), data)
}

export async function deleteExpense(
  userId: string,
  expenseId: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "expenses", expenseId))
}
