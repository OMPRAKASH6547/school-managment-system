# SchoolSaaS – School & Coaching Management

A production-ready **School/Coaching Management SaaS** built with **Next.js 14** (App Router), **Tailwind CSS**, and **Prisma**. All frontend and backend live in the same project.

## Features

- **Subscription-based**: Schools/coaching centers subscribe to plans (Starter, Growth, Enterprise).
- **Super Admin**: Approves or rejects new organizations; assigns subscription plans; manages plans.
- **School Admin** (after approval): Full management of students, staff, classes, fee plans, payments, and attendance.
- **Auth**: Session-based auth with roles (`super_admin`, `school_admin`). Pending orgs see a “Pending approval” screen until approved.

## Tech Stack

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS** for styling
- **Prisma** + **MongoDB** (set `DATABASE_URL` to your MongoDB connection string)
- **bcryptjs** for password hashing, **zod** for validation

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/schoolsaas?retryWrites=true&w=majority`)
- `NEXTAUTH_URL="http://localhost:3000"` (or your app URL)

### 3. Database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Super Admin login (created by seed)

After running `npm run db:seed`, use these credentials to log in as Super Admin:

| Field    | Value                          |
|----------|---------------------------------|
| **Email**    | `superadmin@schoolsaas.com` |
| **Password** | `admin123`                  |

Log in at `/login` → you will be redirected to `/super-admin` to approve organizations and assign plans.

### 6. Teacher & staff login

1. A **School Admin** (or **Admin** role) creates staff in **Teachers & Staff** and sets role (e.g. Teacher, Staff, Accountant).
2. On save, the app shows a **temporary password** once — share it with the user securely.
3. The staff member opens **`/login`**, enters the **same email** as on the staff record and that password.
4. After login, **Teachers** see **Teacher Dashboard**, **Attendance**, **Examinations**, **Books & copy** (roll-number lookup), and **Transport**. **Staff** see **Dashboard**, **Staff attendance**, **Books & copy**, and **Transport**.

## Project Structure

```
src/
├── app/
│   ├── (auth)           # login, register
│   ├── api/             # API routes (auth, super-admin, school)
│   ├── super-admin/     # Super Admin dashboard, organizations, plans
│   ├── school/         # School dashboard, students, staff, classes, fees, attendance
│   └── components/     # Shared forms (Student, Staff, Class, Fee, Attendance)
├── lib/                 # db, auth helpers
└── types/               # Shared types
prisma/
├── schema.prisma       # Data model
└── seed.ts             # Super admin + subscription plans
```

## Production Notes

- **MongoDB**: Use a production MongoDB cluster (e.g. MongoDB Atlas) and set `DATABASE_URL`.
- If you see `ReplicaSetNoPrimary` / `Server selection timeout`, your DB is reachable but has no elected primary.
  - Atlas: confirm cluster health and IP/network access.
  - Local MongoDB: ensure mongod is running and your URI matches your setup:
    - standalone local: `mongodb://localhost:27017/schoolsaa?directConnection=true`
    - replica set local: `mongodb://localhost:27017/schoolsaa?replicaSet=rs0`
- Set a strong `NEXTAUTH_SECRET` (or equivalent secret) for session signing.
- Add **Stripe** (or another provider) for real subscription billing; the schema already has `stripeCustomerId` and `stripeSubscriptionId` on `Subscription`.
- Enforce **plan limits** (e.g. `maxStudents`, `maxStaff`) in school APIs using the current subscription plan.

## Fee receipt download

Fee receipts (PDF) are **only downloadable after the school/coaching admin verifies the payment**. New payments are created with status **Pending**; use **Verify** on the Fee Management page, then the **PDF** link becomes available.

---

## Super Admin credentials (reminder)

| Email    | Password  |
|----------|-----------|
| `superadmin@schoolsaas.com` | `admin123` |

---

## License

MIT
