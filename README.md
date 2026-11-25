# ExamPulse — Student Test Series Mobile App & Admin Portal

A full-stack mobile test-series platform where **Admins** create courses, timed test series (e.g., **100 questions in 100 minutes**), bulk-import questions (CSV/JSON), and manage student enrollments; and **Students** register/login on the mobile app, take timed CBT-style tests with a question palette & negative marking, view their marks and full Q&A solutions, and analyze performance on their dashboard.

---

## Project Structure

- `backend/` — Node.js + Express + SQLite (`node:sqlite`) REST API (`http://localhost:4000`)
- `admin-web/` — React + Vite Web Admin Portal (`http://localhost:5173`)
- `mobile/` — React Native (Expo) Student Mobile App (Android, iOS via Expo Go, & Web)

---

## Demo Accounts (Auto-seeded on first start)

- **Admin Portal (`admin-web`)**: `admin@testseries.app` / `Admin@123`
- **Student Mobile App (`mobile`)**: `student@testseries.app` / `Student@123` (or register any new student in the app)

Pre-seeded courses & tests include:
1. **All-India Aptitude & Reasoning Test Series** (Self-Enroll Open)
   - *Full Mock Test #1 (100 Qs · 100 Min)* (`+4 / -1` marking)
   - *Quick Diagnostic Sprint (5 Qs · 5 Min)* (`+2 / -0.5` marking)
2. **STEM Foundation Batch (Admin Assigned)**
   - *Physics & Chemistry Checkpoint #1* (`+4 / -1` marking)

---

## Running Locally

### 1. Start the Backend API
```powershell
cd backend
npm.cmd start
```
Runs at `http://localhost:4000`. Run tests with:
```powershell
cd backend
npm.cmd test
```

### 2. Start the Web Admin Portal
```powershell
cd admin-web
npm.cmd run dev
```
Open `http://localhost:5173` in your browser.

### 3. Start the Student Mobile App (Expo)
```powershell
cd mobile
npm.cmd start
```
- Press `w` for **Web preview**
- Press `a` for **Android Emulator** (defaults to `http://10.0.2.2:4000`)
- Scan the QR code with **Expo Go** on Android/iOS (and set your PC's LAN IP under *Configure Backend Server URL* on the login screen or Profile tab, e.g., `http://192.168.1.5:4000`).
