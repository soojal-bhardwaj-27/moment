# Moment 📸

Moment is a premium, private photo-sharing mobile application (inspired by Locket) that lets you share real, unfiltered moments directly with your closest friends' home screens via private widgets.

This repository is split into a **React Native (Expo) mobile client** and a **TypeScript Node.js (Express + Prisma + Postgres) backend web service**.

---

## 🚀 Key Features

* **Private Circles**: Create custom, private groups (e.g., "Best Friends", "Family") to control who sees which moments.
* **Instant Camera Share**: Capture moments directly within the app and upload them immediately to selected circles.
* **Home Screen Widgets**: Supports integrating live moments as home screen widgets so you see updates as they happen.
* **Viral Pairing & Invitation System**: Generate custom invitation links (`https://moment-x8we.onrender.com/invite/CODE`) that land invitees on a styled web page with a copyable code and direct APK download link, auto-pairing you as friends upon registration.
* **Robust Authentication**: Secure, passwordless OTP authentication with username, email, and phone lookup.
* **Clean Session Persistence**: Seamless startup that restores active sessions from `AsyncStorage` instantly without showing flashes of login screens.
* **Robust Input Sanitization**: Automatic trimming of whitespaces and case-insensitive database lookups for registrations, logins, and friend additions.

---

## 📂 Repository Structure

```
SB MOMENTS/
├── backend/                   # Express TypeScript Server & Database
│   ├── prisma/                # Prisma ORM Schema & Migrations
│   ├── src/                   # Source files (index.ts, controllers)
│   ├── package.json
│   └── tsconfig.json
├── locket-clone/              # Expo React Native App Client
│   ├── src/
│   │   ├── app/               # Expo Router file-based screens
│   │   ├── components/        # UI & Native components (Camera, etc.)
│   │   ├── context/           # AppState Context Provider (AppContext.tsx)
│   │   └── constants/
│   ├── app.json               # Expo config (Bundle ID, updates)
│   ├── eas.json               # EAS build profiles (APK configs)
│   └── package.json
└── README.md                  # This file
```

---

## 🛠️ Tech Stack

### Frontend Mobile App
* **Framework**: React Native with **Expo (SDK 56)**
* **Navigation**: Expo Router (File-based Routing)
* **Animation**: React Native Reanimated
* **Storage**: `@react-native-async-storage/async-storage` for local session persistence
* **Native Capabilities**: Expo Camera & Contacts synchronization

### Backend Web Service
* **Runtime**: Node.js with **TypeScript**
* **Framework**: Express.js
* **Database ORM**: Prisma v7
* **Database**: Serverless PostgreSQL (Neon Cloud Database)
* **Hosting**: Render Cloud Web Service

---

## 💻 Local Development Setup

### Prerequisite
Ensure you have [Node.js](https://nodejs.org/) (v18+) and [Git](https://git-scm.com/) installed.

### 1. Database Setup
1. Create a free PostgreSQL database instance at [Neon.tech](https://neon.tech).
2. Copy your connection URL: `postgresql://<user>:<password>@<host>/neondb?sslmode=require`.

### 2. Backend Local Setup
Navigate to the `backend` directory:
```bash
cd backend
```

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL="YOUR_NEON_POSTGRESQL_CONNECTION_STRING"
   PORT=3000
   ```

3. Sync the database schema and generate the Prisma client:
   ```bash
   npx prisma db push
   ```

4. Build and start the development server:
   ```bash
   npm run build
   ```
   To run in development watch mode:
   ```bash
   npm run dev
   ```

---

### 3. Mobile Client Local Setup
Navigate to the `locket-clone` directory:
```bash
cd ../locket-clone
```

1. Install dependencies:
   ```bash
   npm install
   ```

2. Check API configuration in `src/context/AppContext.tsx`:
   * The app defaults to the production backend (`https://moment-x8we.onrender.com`).
   * If testing against your local backend, replace the return string of `getApiUrl()` with your local development IP (e.g., `http://192.168.1.XX:3000`).

3. Start the Expo development server:
   ```bash
   npx expo start
   ```
   * Press **a** to run on an Android emulator or device.
   * Press **i** to run on an iOS simulator.

---

## 🌐 Cloud Deployment & EAS Builds

### Backend Hosting (Render)
1. Commit your repository and push to GitHub.
2. Sign up on [Render](https://render.com) and create a new **Web Service** connected to your repository.
3. Use the following configuration:
   * **Root Directory**: `backend`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npx prisma db push && npm start`
   * **Environment Variables**: Add `DATABASE_URL` pointing to your Neon database string.

### Compiling Client Android APK (EAS Build)
To compile a standalone APK that can be installed on Android devices:
1. Ensure the EAS CLI is installed: `npm install -g eas-cli`
2. Run the build command inside the `locket-clone` folder:
   ```bash
   eas build --profile preview --platform android
   ```
3. Once completed, EAS will output a QR code and a direct `.apk` download link. Copy this link to update the invitation download button in `backend/src/index.ts`.
