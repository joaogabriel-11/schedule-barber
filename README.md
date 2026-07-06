<div align="center">

# 💈 Barbershop — Appointment Scheduling System

### Complete barbershop management system built with **Next.js**, **Prisma**, **PostgreSQL** and **TypeScript**

<br/>

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

<br/>

<p align="center">
  <a href="https://barbearia.joaogabriels.com">
    <img src="https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white"/>
  </a>
  <a href="https://github.com/joaogabriel-11/schedule-barber">
    <img src="https://img.shields.io/badge/Code-181717?style=for-the-badge&logo=github&logoColor=white"/>
  </a>
</p>

<br/>

<img width="1890" height="916" alt="barbearia" src="https://github.com/user-attachments/assets/e4edb720-d45f-4905-9d87-2a9eb87eb914" />

_A real-world appointment scheduling system built to solve a real problem: replacing a paper appointment book in a barbershop, eliminating forgotten clients and scheduling conflicts._

</div>

---

# 📖 About the Project

**Barbershop** was born from a real problem: a barber who managed appointments manually using a paper appointment book, leading to forgotten clients and, occasionally, two clients being scheduled for the same time slot.

The system was built to solve this problem end-to-end—with a visual calendar, automatic scheduling conflict validation, secure authentication, revenue reports, and a complete administrative dashboard.

The project was developed with a focus on:

- Well-defined business rules (appointment conflict validation is the core of the system)
- Defense-in-depth security (email verification, rate limiting, password recovery)
- Responsive user experience (real-world usage at the barbershop counter via mobile devices)
- Scalable architecture using Next.js App Router

---

# ✨ Features

## 📅 Appointment Management

- Interactive calendar (monthly, weekly, and daily views)
- Automatic scheduling conflict validation during creation and editing
- Appointment statuses: `SCHEDULED`, `COMPLETED`, `CANCELED`, `NO_SHOW`
- Fixed 10-minute time slots respecting configured business hours
- Mobile-optimized list view

## 👥 Clients and Services

- Complete client registration (name, phone, email)
- Service management (name, price, duration)
- Soft-delete support, preserving appointment history

## 🔐 Authentication and Security

- Authentication with **NextAuth** (JWT)
- Email verification during registration using a 6-digit code
- Password recovery via email with expiring tokens
- Rate limiting against spam and brute-force attacks (login, registration, and password recovery)
- Passwords securely hashed with **bcrypt**
- Role-based access control (`BARBER`, `ADMIN`)

## 🛠 Administrative Dashboard

- List all system users
- Edit any user's name, email, and password
- Delete user accounts
- Backend-enforced access restricted exclusively to `ADMIN` users

## 📊 Reports and Analytics

- Total revenue for a selected period
- Number of completed appointments
- No-show / cancellation rate
- Revenue chart for the last 6 months
- Top 5 clients by completed appointments
- Most popular services ranking

## 🔔 Notifications

- Automatic alerts for appointments whose scheduled time has passed without a status update
- Quick status updates directly from the notification

---

# 🛠 Technology Stack

### Frontend

| Technology              | Description          |
| ----------------------- | -------------------- |
| Next.js 16 (App Router) | React Framework      |
| React 19                | UI Library           |
| TypeScript              | Static Typing        |
| Tailwind CSS 4          | Styling              |
| FullCalendar            | Interactive Calendar |
| Recharts                | Reporting Charts     |
| Lucide React            | Icons                |

### Backend

| Technology            | Description                   |
| --------------------- | ----------------------------- |
| Next.js API Routes    | Serverless API Routes         |
| Prisma ORM            | Database Access Layer         |
| PostgreSQL (Supabase) | Relational Database           |
| NextAuth (Auth.js)    | Authentication & JWT Sessions |
| bcryptjs              | Password Hashing              |
| Resend                | Transactional Email Delivery  |

### Quality & Infrastructure

| Technology | Description          |
| ---------- | -------------------- |
| Vitest     | Unit Testing         |
| ESLint     | Code Standardization |
| Vercel     | Deployment & Hosting |
| Cloudflare | DNS & Custom Domain  |

---

# 📊 Database Modeling

### Main Models

**User** — id, email, name, password (hash), role (`BARBER` / `ADMIN`)
**Client** — id, name, phone, email, active
**Service** — id, name, description, price, duration (min), active
**Appointment** — id, dateTime, status, notes — related to User, Client, and Service
**Configuration** — business opening and closing hours, per user

### Security Models

**PasswordRecoveryToken** — password recovery token with expiration and source IP
**VerificationCode** — registration verification code with attempt tracking
**LoginAttempt** — login rate-limiting control

---

# 🔐 Security Details

### Registration Flow with Email Verification

1. User enters their name, email, and password
2. The system validates whether the email is already in use
3. A 6-digit code is generated and sent via email (Resend)
4. The user confirms the code in the application
5. The account is created only after successful verification

### Rate Limiting

- **Login**: up to 5 attempts, 15-minute lockout after exceeding the limit
- **Registration / code resend**: 1 request every 60 seconds, maximum of 5 per hour per email
- **Password recovery**: rate limited by email and IP, always returning a generic response (prevents account enumeration)

### Core Business Rule: Appointment Conflict Detection

Two appointments conflict if `startA < endB` **and** `endA > startB`. This logic is isolated in a pure function and covered by unit tests, being validated during both appointment creation and editing.

---

# 🗂️ Project Structure

```text
schedule-barber/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (app)/              # Layout with sidebar
│   │   │   ├── admin/
│   │   │   ├── appointments/
│   │   │   ├── clients/
│   │   │   ├── settings/
│   │   │   ├── reports/
│   │   │   └── services/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── register/
│   │   │   ├── password-recovery/
│   │   │   ├── cleanup/
│   │   │   └── admin/
│   │   ├── register/
│   │   ├── login/
│   │   └── layout.tsx
│   └── lib/
│       ├── auth.ts
│       ├── auth-helper.ts
│       ├── login-rate-limit.ts
│       ├── validateConflict.ts
│       └── prisma.ts
└── public/
```

---

# 🚀 Running Locally

### Prerequisites

- Node.js 20+
- PostgreSQL (local or Supabase)
- A [Resend](https://resend.com) account for email delivery

### Installation

```bash
git clone https://github.com/joaogabriel-11/schedule-barber.git
cd schedule-barber
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
CRON_SECRET="your-cron-secret"
```

### Database

```bash
npx prisma db push
npx prisma generate
```

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Tests

```bash
npm test
```

---

# 🧹 Data Maintenance

The system includes cleanup routines to prevent temporary data accumulation:

- Removal of expired verification codes
- Removal of old login attempts (older than 1 week)

```bash
curl -X POST https://barbearia.joaogabriels.com/api/cleanup/codigos-verificacao \
  -H "Authorization: Bearer $CRON_SECRET"
```

It is recommended to schedule these routines using a cron job (e.g., every hour).

---

# 📱 Responsiveness

The system was built mobile-first, considering real-world usage at the barber's counter:

- **Desktop**: fixed sidebar with full calendar
- **Tablet**: adaptive sidebar
- **Mobile**: bottom navigation with list-based appointment view

---

# 🎨 Visual Identity

| Color     | Usage                          |
| --------- | ------------------------------ |
| `#1a1a1a` | Primary color (black/graphite) |
| `#c9a227` | Accent color (gold)            |
| `#f5f0e6` | Background (light beige)       |

Typography: Geist Sans · Icons: Lucide React

---

# 🎯 Project Goals

This project was developed to strengthen practical knowledge in:

- Relational database modeling with real-world business rules
- Web application authentication and security (rate limiting, identity verification, access control)
- Full-stack architecture with Next.js App Router
- Validation of critical business rules through automated testing
- Deployment and infrastructure configuration (DNS, custom domain, transactional email)

---

# 👨‍💻 Author

**João Gabriel dos Santos**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/joaogabriel-11)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/joaogabriel11)

---

<div align="center">

### ⭐ If you liked this project, consider giving the repository a star!

</div>
