# PocketTrack

A clean, modern personal revenue and expense tracking application built with React + TypeScript + Firebase.

## Features

- 📊 **Dashboard** — Today's spending, monthly & yearly totals, budget goal progress
- 💸 **Expense & Income Tracking** — Log transactions with categories, notes, date & time
- 🔁 **Recurring Transactions** — Auto-post scheduled income/expenses (daily, weekly, monthly)
- 📅 **History** — Browse and filter transactions by month, type, and category
- 📈 **Analytics** — Spending charts and category breakdowns
- 🏷️ **Categories** — Spending breakdown by category with drill-down view
- 💱 **Multi-Currency** — Switch display currency (VND, MMK, USD, EUR, GBP, JPY, AUD, SGD, THB, KRW) with live exchange rates
- 🌙 **Dark Mode** — Toggle between light and dark themes
- 🔐 **Authentication** — Email/password login with Firebase Auth

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Firebase (Auth + Firestore)
- **Exchange Rates**: open.er-api.com (cached 24h)

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Authentication and Firestore enabled

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/pocket_app.git
cd pocket_app

# Install dependencies
npm install

# Copy the env template and fill in your Firebase credentials
cp .env.example .env.local

# Start the dev server
npm run dev
```

### Environment Variables

Create a `.env.local` file in the root with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # TypeScript check + production build
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── components/        # Shared components (AddExpenseSheet, etc.)
├── constants/         # Category definitions
├── contexts/          # CurrencyContext
├── lib/               # Firebase, currency utils, expense/recurring helpers
├── pages/             # Page components (Home, History, Analytics, etc.)
├── types/             # TypeScript interfaces
├── App.tsx            # Root layout, routing, auth
└── main.tsx           # Entry point
```

## Version

**v1.0.0** — Initial public release

## License

MIT
