# 💰 Budget Tracker App

A sleek, intuitive, and modern personal finance and budget tracking mobile application built with **React Native**, **Expo (v57)**, and **Supabase**. Designed to help students and young professionals manage expenses, track savings goals, monitor recurring items, and visualize their monthly financial health with automated PDF reports.

---

## ✨ Features

- 📊 **Real-Time Financial Dashboard**: Instant overview of income, fixed expenses, buffer status, and what is actually being saved this month.
- 🔁 **Recurring Items**: Keep a library of the things you buy every week or month — milk, fruits, medicines, subscriptions — with their usual amounts.
- 🛒 **Sunday Batch Logging**: Log the whole week's shop in one tap from pre-filled amounts. Items already logged this week are marked, so nothing gets counted twice.
- 🍦 **Buffer Wallet**: Set aside a monthly amount for ice cream, Maggi and other unplanned treats, with a running balance kept separate from fixed expenses.
- 🔔 **Low-Buffer Alerts**: The buffer turns amber with a fifth left and red once overspent, and the spend that crosses either line raises a local notification.
- 💸 **Income Tracking**: Pocket money, internship and freelance income logged separately, with irregular internship/freelance earnings averaged over recent whole months — the figure worth planning around.
- 📈 **Six-Month Trend**: Money in against money out per month, so a creeping month is visible next to the ones before it.
- 🎯 **Savings Goals**: Set financial targets with custom deadlines, add contributions, and visualize progress bars.
- 📄 **Monthly PDF Reports**: Export and share clean, one-page monthly spending summaries as PDF documents directly from the app.
- 🔒 **Secure Authentication**: Built-in Email & Password authentication powered by Supabase with Row Level Security (RLS) ensuring strict user data isolation.
- 📱 **Built for Phones**: Targets iOS and Android. It runs in a browser via Expo's web support, which is handy while developing, but the web build is not a supported target — secure storage, alert dialogs, notifications and the share sheet all behave differently or not at all there.
- 🇮🇳 **Rupees**: Amounts are in INR throughout.

---

## 🛠️ Tech Stack

- **Framework:** React Native (v0.86) with Expo (SDK 57)
- **Routing:** Expo Router (File-based navigation)
- **Backend & Database:** Supabase (PostgreSQL & Auth)
- **State & Storage:** Expo SecureStore for secure token management
- **PDF & Sharing:** Expo Print & Expo Sharing
- **Notifications:** Expo Notifications (local only — no push server needed, and works in Expo Go)
- **Animations & UI:** React Native Reanimated, Expo Symbols, Ionicons via `@expo/vector-icons`
- **Language:** TypeScript

---

## 📁 Project Structure

```text
├── assets/                  # Icons, splash screens, and images
├── src/
│   ├── app/                 # Expo Router screens
│   │   ├── (auth)/          # Authentication flow (Login, Sign Up)
│   │   ├── (app)/           # Main application screens
│   │   │   ├── index.tsx    # Dashboard, six-month trend, PDF share
│   │   │   ├── income.tsx   # Income history & irregular-income average
│   │   │   ├── items.tsx    # Recurring item library
│   │   │   ├── log.tsx      # Weekly batch logging & buffer spending
│   │   │   ├── goals.tsx    # Savings Goals manager
│   │   │   └── settings.tsx # Profile & sign out (reached from Home, not the tab bar)
│   │   └── _layout.tsx      # Root application layout & providers
│   ├── components/          # Reusable UI components
│   ├── constants/           # Colors, themes, and configuration
│   ├── contexts/            # React context providers (AuthContext, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Supabase client, PDF generator, and helpers
│   └── types/               # TypeScript type definitions
├── supabase/
│   └── migrations/          # SQL database migrations and schema definitions
├── app.json                 # Expo configuration
├── package.json             # Project dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) app on your mobile device (iOS / Android) or an emulator/simulator.
- A free [Supabase](https://supabase.com/) account.

---

### 1. Clone the Repository

```bash
git clone https://github.com/Priyal-2005/budget-tracker-app.git
cd budget-tracker-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase

1. Create a new project in your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** in Supabase and run the migration script found at:
   - `supabase/migrations/0001_init.sql`
   *(Optional: If applying category changes, also run `0002_drop_hostel_and_mess_categories.sql`)*
3. Copy your project URL and public anon key from **Project Settings -> API**.

### 4. Set Up Environment Variables

Create a `.env` file in the root directory (you can copy `.env.example`):

```bash
cp .env.example .env
```

Add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📱 Running the App

Start the Expo development server:

```bash
npx expo start
```

The dev server runs on port **3000**.

### Options to test:
- **Physical Device:** Open the camera (iOS) or **Expo Go** app (Android) and scan the QR code displayed in the terminal.
- **iOS Simulator:** Press `i` in the terminal (macOS with Xcode required).
- **Android Emulator:** Press `a` in the terminal (Android Studio required).
- **Web Browser:** Press `w` in the terminal. Useful for quickly checking layout and wiring, but see the note on web support above — it is not a shipping target.

---

## 📦 Sharing It With People

No paid developer account is needed to get this onto a few phones:

- **Android:** `eas build -p android --profile preview` produces an installable `.apk` you can send directly. It installs like any normal app.
- **iOS:** publish with `eas update` and have people open it in the free **Expo Go** app. A standalone iPhone app with its own home-screen icon requires an Apple Developer account ($99/year); Expo Go is the free route.

Build profiles live in `eas.json`.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run start` | Starts the Expo development server |
| `npm run ios` | Starts the app on the iOS Simulator |
| `npm run android` | Starts the app on the Android Emulator |
| `npm run web` | Launches the app in the web browser |
| `npm run lint` | Runs ESLint to check for code quality issues |

---

## 🔒 Security & Privacy

- **Row Level Security (RLS):** All Supabase tables use strict policies ensuring users can only read, write, and modify their own financial records.
- **Secure Token Storage:** User sessions and credentials are saved using native keychain/keystore encryption via `expo-secure-store`. On web (development only) this falls back to `localStorage`, which is one of several reasons the web build is not a shipping target.
- **Email Confirmation:** Supabase's "Confirm email" setting is worth leaving on before sharing the app, so nobody can sign up with an address that isn't theirs.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
