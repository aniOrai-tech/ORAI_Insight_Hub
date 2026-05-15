# ORAI Insight Hub

A production-grade, multi-department SaaS dashboard for managing meetings, bot details, clients, upsell tracking, and new requirements — with role-based access control, voice-enabled note taking, voice search, and an admin panel. 

Designed with the **ORAI Robotics Signature Theme**.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🔐 Auth & Admin | Admin panel to register users, JWT-based login, role-based access |
| 🎙️ Voice Search | Microphone node in the top bar to perform voice-based navigation |
| 📝 Voice Note Taker | Web Speech API integration to transcribe meetings directly into notes |
| 📊 Dashboard | Real-time analytics with Chart.js graphs |
| 📅 Meetings | Full CRUD with 60-day expiry + email reminders and voice transcription |
| 🤖 Bot Details | Credential management with smart links |
| 👥 Clients | SPOC contact management |
| 📈 Upsell | Deal pipeline with payment tracking |
| 📋 Requirements | Feature/requirement tracking with recordings |

---

## ⚙️ Setup & Run Instructions

Follow these instructions to run the project locally.

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster)

### 2. Environment Variables
Navigate to the `backend` folder and copy the example environment file:
```bash
cd backend
cp .env.example .env
```
Update the `.env` file with your specific values:
- `MONGODB_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A secure random string for JWT.

### 3. Install Dependencies
Install all required Node.js packages for the backend:
```bash
npm install
```

### 4. Seed the Database (Initial Setup)
To create the initial users (including the `admin` user), run the seed script:
```bash
node seed.js
```
## 👥 User Access & Roles
The application uses department-based access control:
- **Admin/CS Team:** `admin` / `admin123`
- **CS User:** `cs_user` / `orai123`
- **Impl Team:** `impl_user` / `orai123`
- **Dev Team:** `dev_user` / `orai123`
- **New Dev Access:** `dev_team_access` / `devteam123` (New)
- **Sales Team:** `sales_user` / `orai123`

### 5. Start the Application
Run the server (this serves both the backend API and the frontend UI on port 5000):
```bash
npm start
# or for development with hot-reloading:
npm run dev
```

### 6. Access the Dashboard
Open your browser and navigate to:
**http://localhost:5000**

Log in with `admin` / `admin123`.

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (CSS Variables for Theming)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **APIs**: Web Speech API (for Voice Search & Transcripts)
