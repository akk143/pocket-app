# PocketTrack

**PocketTrack** is a modern personal finance web application for tracking income, expenses, recurring transactions, budgets, and spending patterns in one place.

Built with **React, TypeScript, Firebase, Tailwind CSS, and Recharts**, PocketTrack is designed for everyday personal money tracking with a responsive interface that works across desktop, mobile, and installed PWA environments.

**Live Demo:** https://pocket-app-beige.vercel.app/

## ✨ Features

### 📊 Dashboard

* View today's spending and income
* Track monthly and yearly totals
* Monitor net cash flow
* Track budget and spending goals
* Review recent transactions
* View spending trends and category summaries

### 💸 Income & Expense Tracking

* Add income or expense transactions
* Enter custom transaction names/items
* Choose categories
* Record date and time
* Add optional notes
* Edit and delete transactions
* Validate transaction types against supported income and expense categories

### 🔁 Recurring Transactions

* Create recurring income or expense transactions
* Supports daily, weekly, and monthly schedules
* Automatically processes due transactions daily on the server
* Tracks the next due date

### 📅 History

* Browse transactions by month
* Search transactions
* Filter by income or expense
* Filter by category
* View standardized transaction dates and times

### 📈 Analytics

* Analyze spending patterns
* View category breakdowns
* Compare spending across periods
* Explore category-level details with drill-down views

### 🏷️ Categories

* Organize transactions by category
* View spending totals by category
* Explore category-specific transaction data

### 🗑️ Trash & Restore

* Move deleted transactions to Trash
* Restore deleted transactions
* Permanently remove unwanted records

### 💱 Multi-Currency

Display amounts in multiple currencies, including:

* VND
* MMK
* USD
* EUR
* GBP
* JPY
* AUD
* SGD
* THB
* KRW

Currency rates are fetched from an exchange-rate API and cached locally for 24 hours. MMK uses a configured static conversion rate.

### 🌙 Dark & Light Mode

* Switch between light and dark themes
* Responsive theme behavior across desktop and mobile
* PWA-friendly theme configuration

### 🔐 Authentication

* Firebase Email/Password Authentication
* User-specific financial data
* Protected application routes
* Five-day HttpOnly server session cookies

### 📱 Progressive Web App

PocketTrack can be installed as a PWA for a more app-like experience.

* Standalone display mode
* Installable on supported devices
* PWA icons and manifest
* Automatic service-worker updates

---

## 🛠️ Tech Stack

### Frontend

* React 19
* TypeScript
* Vite

### Styling

* Tailwind CSS v4

### UI & Visualization

* Lucide React
* Recharts

### Routing

* React Router

### Backend & Data

* Firebase Authentication
* Cloud Firestore
* Firebase Admin SDK through Vercel serverless API routes

### PWA

* vite-plugin-pwa

### Deployment

* Vercel

### Currency Data

* ExchangeRate-API (`open.er-api.com`)

---

## 📂 Project Structure

```text
pocket_app/
├── api/
│   ├── auth/
│   ├── cron/
│   ├── recurring/
│   └── transactions/
├── server/
│   ├── auth.ts
│   ├── firebaseAdmin.ts
│   ├── http.ts
│   ├── recurring.ts
│   └── validation.ts
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa_icon.png
│
├── src/
│   ├── assets/
│   ├── components/
│   ├── constants/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
│
├── .env.example
├── firebase.json
├── firestore.rules
├── vercel.json
├── vite.config.ts
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Node.js 20+
* npm
* A Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/akk143/pocket-app.git
cd pocket-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a Firebase project and enable:

* Authentication
* Email/Password sign-in
* Cloud Firestore

Do not add Firebase configuration to Vite or any `VITE_*` variable. Configure these **server-only** variables in Vercel Project Settings → Environment Variables:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_WEB_API_KEY=
CRON_SECRET=
```

Create a Firebase service account with the permissions needed to administer Authentication and Firestore, then set its project ID, client email, and private key in the server variables above. Store the Firebase Web API key in `FIREBASE_WEB_API_KEY`; it is used only by the server for Firebase Authentication REST requests. Generate a long random value for `CRON_SECRET`.

### 4. Start the development server

```bash
npx vercel dev
```

The Vercel development server runs both the frontend and `/api/*` functions. Copy `.env.example` to `.env.local` and fill in server values for local development only; never commit `.env.local`.

---

## 🔥 Firebase Configuration

The browser talks only to same-origin `/api/*` routes. Vercel serverless functions use Firebase Admin for Firestore operations and Firebase Authentication REST calls for email/password sign-in. Authentication is maintained in an HttpOnly, Secure-in-production session cookie; Firebase tokens and credentials are never stored in browser storage.

The API derives the user UID from the verified session cookie and stores data under user-specific Firestore paths. Firestore rules deny all direct client SDK access; the trusted server API is the only intended Firestore entry point. Since Firebase Admin bypasses Firestore rules, the API validates payloads and scopes every document path to the session UID.

Data is stored under:

```text
/users/{userId}/...
```

but direct browser reads and writes to Firestore are denied by default.

Before deploying your own Firebase project, review and test the provided `firestore.rules` against your application's data model.

Deploy Firestore rules with a Firebase account that has permission to manage the project:

```bash
npx firebase-tools deploy --only firestore:rules --project pocket-app-production
```

The Vercel cron at `/api/cron/recurring` runs daily. It uses `CRON_SECRET` and Firestore transactions with deterministic expense IDs to ensure a recurring rule can post no more than once for a given local calendar day.

---

## 💰 Currency Model

PocketTrack uses **VND as the internal base amount** and converts values for display when the user selects another currency.

Exchange-rate data is cached locally to avoid repeatedly requesting the API.

Current exchange-rate behavior:

```text
USD → selected currencies
Cache duration → 24 hours
MMK → configured static conversion rate
```

The displayed currency does not change the underlying transaction value stored by the application.

---

## 📱 PWA

PocketTrack includes Progressive Web App support through `vite-plugin-pwa`.

The PWA configuration provides:

* Installable application experience
* Standalone display mode
* Application icons
* App manifest
* Service worker
* Automatic update registration

Build the production version with:

```bash
npm run build
```

Then preview it locally with:

```bash
npm run preview
```

---

## ☁️ Deployment

PocketTrack is designed to deploy easily to **Vercel**.

### Build

```bash
npm run build
```

### Vercel

Set the required server environment variables from the Firebase setup section in your Vercel project.

For the SPA routing configuration, the repository includes:

```text
vercel.json
```

which rewrites application routes to `index.html`.

After deployment, Vercel serves the application as a client-side React application.

---

## 🧪 Available Scripts

```bash
npm run dev
```

Start the Vite development server.

```bash
npm run build
```

Run TypeScript compilation and create a production build.

```bash
npm run lint
```

Run ESLint.

```bash
npm run preview
```

Preview the production build locally.

---

## 🔐 Security Notes

* Firebase credentials are provided through environment variables.
* Environment files are excluded from Git.
* Direct browser access to Firestore is denied; application data access goes through same-origin `/api/*` routes.
* Firebase API keys are not treated as private server secrets; authorization is enforced by the server session and Firebase Security Rules.
* Review Firebase rules carefully before exposing a production database.

---

## 📌 Current Release

**PocketTrack v1.0.1**

Current application capabilities include:

* Personal income and expense tracking
* Dashboard statistics
* Net cash flow
* Recurring transactions
* Transaction history
* Analytics
* Category breakdowns
* Trash and restore
* Multi-currency display
* Dark/light mode
* Firebase authentication
* Responsive desktop/mobile interface
* Progressive Web App support

---

## 🗺️ Roadmap

Potential future improvements include:

* More advanced budget management
* Notifications and reminders
* Improved recurring transaction automation
* More detailed financial reports
* Export and backup options
* Additional analytics
* Improved offline support
* More configurable categories and account types

---

## 🤝 Contributing

PocketTrack is currently maintained as a personal project.

Suggestions, bug reports, and improvements are welcome through GitHub Issues and Pull Requests.

---

## 📄 License

No open-source license has currently been added to this repository.

Until a license is added, the repository should not be assumed to grant permission to copy, modify, or redistribute the source code.
