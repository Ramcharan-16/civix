# 🏛️ Civix — Smart Municipal Grievance & SLA Governance Platform

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Express_%2B_TypeScript-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma_%2B_MySQL-2D3748?logo=prisma&logoColor=white)](https://prisma.io/)
[![WhatsApp](https://img.shields.io/badge/Notifications-Live_WhatsApp_%2B_Email-25D366?logo=whatsapp&logoColor=white)](https://whatsapp.com)

**Civix** is a full-stack, AI-powered civic grievance redressal and municipal governance network. It enables citizens to report urban issues with GPS pinpointing and photos, while empowering municipal departments and field staff to track, resolve, and audit civic infrastructure workflows under strict Service Level Agreements (SLA).

---

## 🌟 Key Features

- 📍 **GPS Geo-Tagged Grievances:** Pinpoint complaints on interactive OpenStreetMap with category-based routing.
- 🤖 **AI-Assisted Triage:** Automated severity detection, priority assignment, and department routing.
- 📲 **Real-Time WhatsApp & Email Alerts:** Instant automated dispatch of registration confirmations, field engineer assignments, and resolution progress bars.
- 🛡️ **Civic Rights & SLA Charter:** Automated background breach detection with color-coded countdown timers and priority escalations.
- 🚨 **Rapid SOS Emergency Hazard Mode:** One-tap emergency escalation for live electrical hazards, gas leaks, and road sinkholes.
- 📊 **Multi-Tier Role Dashboards:** Dedicated operational consoles for Citizens, Field Staff, Department Admins, and Super Admins.

---

## 🏗️ Architecture & Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Leaflet, Lucide Icons, Glassmorphism CSS.
- **Backend API:** Node.js, Express, TypeScript, Prisma ORM, JWT authentication.
- **Database:** MySQL relational database.
- **Messaging Gateway:** Local Multi-Device WhatsApp Web Client (`whatsapp-web.js` + Puppeteer) with Green-API / Twilio fallbacks and SMTP email generation.

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- MySQL database

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Setup Environment Variables
Create `.env` files in root and `apps/api/`:
```env
DATABASE_URL="mysql://root:password@localhost:3306/civix"
JWT_SECRET="your-jwt-secret"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

### 4. Database Setup
```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Run Development Servers
```bash
pnpm dev
```
- 🌐 **Web App:** `http://localhost:5173`
- 📲 **WhatsApp Gateway:** `http://localhost:5000/whatsapp/qr`
- ⚙️ **API Health:** `http://localhost:5000/health`

---

## 📜 License
MIT License © 2026 Civix Municipal Governance Platform
