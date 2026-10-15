# PocketTrack

**PocketTrack** is a modern personal finance web application for tracking income, expenses, recurring transactions, budgets, and spending patterns in one place.

Built with **React, TypeScript, Firebase, Tailwind CSS, and Recharts**, PocketTrack is designed for everyday personal money tracking with a responsive interface that works across desktop, mobile, and installed PWA environments.

**Live Demo:** https://pocket-app-beige.vercel.app/

---

## 🚀 What's New in v1.1.0

The **v1.1.0** update introduces instant QR code expense scanning, a redesigned bulk-management History selection toolbar, hardened Trash reliability, and mobile interaction polish:

* **📷 QR Code & Receipt Scanner:** Scan QR codes and receipts directly from your phone camera or upload receipt images. Automatically extracts amounts, items, timestamps, categories, and itemized line-item notes, complete with duplicate expense detection.
* **📋 Redesigned History Selection Toolbar:** Brand-new responsive two-row toolbar for bulk operations, featuring dynamic selected counts, one-tap Select All / Deselect All, and a safe Move to Trash workflow.
* **🛡️ Hardened Trash & Concurrency Architecture:** Idempotent soft-delete API preventing 404 race conditions, in-flight mutation locks across client and server, and animated loading spinners (`Saving…`, `Moving to Trash…`, `Restoring…`, `Deleting…`, `Emptying Trash…`).
* **🔔 Action-Specific Notification Audit:** Completely revamped toast notifications providing truthful, accurate messaging for every create, update, trash, restore, and permanent deletion action.
* **📱 Mobile Layout Polish:** Seamless `+ Add Expense` primary action with an integrated compact `Scan QR` trigger; metrics badges aligned side-by-side with zero wasted whitespace.

---

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

### 📷 QR Code Scanner & Receipt Parser

* Scan QR codes in real time using device camera with rear-camera preference and flashlight toggle
* Upload receipt images and QR screenshots with automated file scanning
* Decode VietQR banking codes and merchant payment standards
* Parse supermarket bills and retail receipts (e.g. WinMart, convenience stores, and standard POS)
* Automatically extracts total amount, item name, suggested category, date, and time
* Itemized line-items extraction formatted into transaction notes with a dedicated review drawer
* Smart duplicate detection warning against already-recorded expenses

### 🔁 Recurring Transactions

* Create recurring income or expense transactions
* Supports daily, weekly, and monthly schedules
* Automatically processes due transactions daily on the server
* Tracks the next due date

### 📅 History & Bulk Management

* Browse transactions grouped chronologically by date and month
* Fast search across transaction titles and categories
* Filter by All / Expense / Income and granular category chips
* Dedicated multi-select mode with responsive two-row action toolbar
* Dynamic selected count and one-tap Select All / Deselect All
* Safe bulk Move to Trash with confirmation dialog and quick Undo toast

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

* Soft-delete data model preserving deleted items by month
* Single-item and batch restore with instant dashboard synchronization
* Single-item and batch permanent deletion with confirmation protection
* Empty entire Trash with safety confirmation and loading spinner
* Truthful notifications reflecting specific actions ("Transaction moved to Trash", "Trash emptied", etc.)

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

### UI, Scanning & Visualization

* Lucide React
* Recharts
* qr-scanner (camera & receipt image QR decoding)

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
│   ├── auth.ts
│   ├── cron.ts
│   ├── recurring.ts
│   └── transactions.ts
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
│   │   ├── AddExpenseSheet.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── QRScannerModal.tsx
│   │   ├── QRLineItemsReview.tsx
│   │   ├── TransactionDetailsSheet.tsx
│   │   └── TransactionActionsMenu.tsx
│   ├── constants/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── currency.ts
│   │   ├── expenses.ts
│   │   ├── qrParser.ts
│   │   └── recurring.ts
│   ├── pages/
│   │   ├── Analytics.tsx
│   │   ├── History.tsx
│   │   ├── Home.tsx
│   │   ├── Recurring.tsx
│   │   ├── Settings.tsx
│   │   └── Trash.tsx
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

**PocketTrack v1.1.0**

Current application capabilities include:

* Instant QR code and supermarket receipt scanning with auto-fill
* VietQR, WinMart, and standard retail bill parser
* Receipt line-items extraction and duplicate transaction prevention
* Personal income and expense tracking
* Redesigned History selection toolbar with batch Move to Trash
* Hardened Trash architecture with idempotent soft-delete and concurrency locks
* Action-specific, accurate toast notifications
* In-flight loading spinners and disabled state protections across all forms
* Dashboard statistics, spending trends, and net cash flow
* Recurring transactions with automated daily server execution
* Analytics and interactive category breakdowns
* Multi-currency display with live cached exchange rates
* Dark and light theme support
* Secure Firebase Authentication with HttpOnly session cookies
* Responsive desktop and mobile interface
* Progressive Web App (PWA) installation and offline asset caching

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
