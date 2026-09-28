# Chama Mkononi

A mobile-first digital platform for managing informal chamas in Kenya and other communities that rely on trusted group-based savings and lending practices.

## Problem we are solving

Informal chamas are a powerful financial system used across Kenya, but they are often managed with paper records, cash transactions, and fragmented communication. This creates several problems:

- Records are easy to lose, alter, or misplace
- Members struggle to track contributions and loans
- Balances are not always transparent
- Meetings and approvals happen informally and inconsistently
- It is hard to scale or include members who are not always physically present
- Many users, especially in rural and low-income communities, need a simple app that feels familiar and accessible

Chama Mkononi digitizes this trusted model without removing the social structure that makes chamas work. The goal is to bring transparency, accountability, and convenience to informal group savings while keeping the experience intuitive for everyday members and committee leaders.

## Why this app matters

Traditional chamas are often built on trust, relationships, and accountability within a community. The problem is not a lack of structure — it is the lack of digital tools that respect the way chamas already operate.

This product is designed for:

- Savings groups and chamas
- Local communities with low digital literacy
- Members who prefer Kiswahili-first language
- Users with low-end smartphones and limited connectivity
- Small leadership teams like chairpersons, secretaries, and treasurers

The app is designed to be simple, reliable, and familiar rather than corporate, intimidating, or overly technical.

## Product vision

Chama Mkononi helps chamas move from paper ledgers and WhatsApp coordination to a clear digital system that supports:

- regular contributions
- transparent member records
- group loan tracking
- meeting management
- financial accountability
- trust across the group

It preserves the way chamas already work, while making records easier to maintain and decisions easier to verify.

## Core features

### 1. Contribution tracking

Members can:

- view their contribution obligations
- check whether they have paid
- record payments
- review contribution history
- see outstanding balances

This replaces manual contribution books with a digital record that is easier to inspect and maintain.

### 2. Chama book / ledger

The app provides a digital contribution book for authorized members to record:

- member name
- amount
- date
- contribution type
- payment method

This enables transparency while still preserving group accountability.

### 3. Loan management

Members can:

- request loans
- see loan balances
- track payment schedules
- view repayment status

Committee members can:

- review loan requests
- approve or reject applications
- record repayments
- monitor outstanding loan obligations

### 4. Meetings and attendance

The secretary or chairperson can create meetings with:

- date
- time
- location
- agenda

Members can mark attendance with simple actions such as:

- I am coming
- I cannot come

This supports better planning and stronger community coordination.

### 5. Transparency and accountability

The system gives the group visibility into:

- money received
- money spent
- loans issued
- repayments collected
- current balance

Each transaction can be tied to who recorded it and who approved it, improving trust and reducing disputes.

### 6. User roles and permissions

The app supports different user roles, including:

- chairperson
- treasurer
- secretary
- ordinary member

Role-based access helps protect financial records while allowing members to do what they need in a simple way.

## User experience philosophy

This product is deliberately not designed like a Western fintech app.

Instead, it focuses on:

- large, readable buttons
- simple navigation
- high-contrast interfaces
- familiar local language and terms
- minimal scrolling
- low-friction actions
- mobile-first design for low-end devices
- straightforward financial language

The goal is for a member to understand the main home screen immediately without a tutorial.

## Tech stack

This project is built with a modern frontend stack and a serverless-friendly backend setup.

### Frontend

- React 19
- Vite
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix UI primitives
- shadcn-style component system

### Backend and data

- Supabase for auth and database services
- Drizzle ORM for schema and data access
- PostgreSQL database
- Vite + TanStack Start for app runtime and server integration

### Developer tooling

- ESLint
- Prettier
- TypeScript
- Drizzle Kit

## Project structure

```text
.
├── src/
│   ├── components/
│   ├── hooks/
│   ├── integrations/
│   ├── lib/
│   ├── routes/
│   ├── router.tsx
│   ├── server.ts
│   └── start.ts
├── drizzle/
│   ├── schema.ts
│   └── migrations/
├── public/
├── supabase/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── components.json
├── bunfig.toml
├── README.md
└── roadmap.md
```

## Development workflow

### Prerequisites

- Node.js and npm or bun
- A Supabase project
- A configured PostgreSQL database for Drizzle

### Install dependencies

```bash
npm install
```

or

```bash
bun install
```

### Run the app locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Lint the codebase

```bash
npm run lint
```

## Environment configuration

This project uses environment-backed configuration for server and database access. Make sure the required Supabase variables are configured in your local environment before running the app.

Typical variables may include:

- Supabase URL
- Supabase anonymous key
- Supabase service role key
- Database connection settings

## Why this matters in Kenya

Kenyan chamas are more than savings groups — they are social, economic, and community institutions. They help people build wealth collectively, support one another during hardship, and create financial habits that are grounded in trust.

By digitizing the process in a way that respects local practices, the app can make these groups more efficient, more transparent, and more accessible without losing the trust and familiarity that make them successful.

## Roadmap

The current roadmap focuses on:

- member and chama onboarding
- contribution tracking
- loan request and approval flows
- meeting and attendance management
- role-based permissions
- financial transparency and reporting
- mobile-first onboarding and accessibility improvements

## License

This project is currently intended for internal product development and community use. Update this section if you plan to publish the repository under a specific open-source license.

## Summary

Chama Mkononi is designed to digitize informal chamas in a way that is practical, familiar, and accessible. It helps communities manage savings, loans, meetings, and records using a system that supports trust, transparency, and local realities.

The app does not try to replace the culture of chamas. It gives that culture a better digital foundation.

Create an audit trail so transactions cannot silently disappear.

ELDERLY USER EXPERIENCE

Design specifically for elderly users.

Use:

- Large buttons

- Large text

- Clear confirmation screens

- Voice guidance where possible

- Minimal typing

- Simple language

- Icons plus text

- Confirmation before financial actions

Example:

"UNATAKA KUTUMA KSh 5,000?"

[NDIO — TUMA]

[HAPANA — RUDI]

Never rely on color alone to communicate important information.

VOICE

Design the architecture so voice interaction can be added.

Eventually a user should be able to say:

"Nimelipa mia tano ya chama."

The system should interpret:

Contribution = KSh 500

Then ask for confirmation before recording the transaction.

Support Kiswahili voice interaction where technically possible.

LANGUAGE

Support:

English

Kiswahili

Design the architecture so additional Kenyan languages can be added later.

Do not translate financial terminology literally if a simpler everyday expression is available.

LOW CONNECTIVITY

Design the application to be lightweight and offline-friendly.

Previously downloaded chama information should remain accessible without internet.

Queue appropriate non-sensitive actions for synchronization when connectivity returns.

Do not make the application dependent on high-speed internet.

LOW-END ANDROID

Optimize for inexpensive Android smartphones.

Keep:

- App size small

- Images compressed

- Animations minimal

- Network requests efficient

- Battery usage low

SECURITY

Implement:

Authentication

PIN

Biometric authentication where supported

Role-based permissions

Secure sessions

Transaction confirmation

Audit logs

Encrypted sensitive information

Secure API communication

For sensitive financial operations require additional confirmation.

TRUSTED HELPER

Allow an elderly member to designate a trusted person who can help them use the application.

Permissions must be granular.

A helper may be allowed to:

- View information

- Help navigate

- Assist with recording

But should NOT automatically have permission to:

- Withdraw money

- Approve loans

- Change account ownership

All sensitive actions must require appropriate authorization.

NOTIFICATIONS

Support friendly reminders through the appropriate channels.

Example:

"Habari Mama Wanjiku 👋

Umebakiza kuchangia KSh 500 ya mwezi huu.

Tafadhali lipa kabla ya Jumapili."

Do not use threatening or overly technical language.

FUTURE INTEGRATIONS

Design the architecture so the application can later integrate with:

M-Pesa

SMS

USSD

WhatsApp

Voice services

Banks

Mobile money services

Do not pretend integrations exist if they have not been implemented.

Use clearly marked mock services during development.

FUTURE FEATURES

Design the database and architecture so these can later be added:

- Chama investments

- Group projects

- Group assets

- Savings goals

- Financial reports

- Multiple chamas per user

- Digital receipts

- Fraud/anomaly detection

- AI chama assistant

- More Kenyan languages

- USSD access

- SMS access

TECHNICAL REQUIREMENTS

Create a clean, scalable architecture with:

Frontend

Backend/API

Database

Authentication

Role-based authorization

Audit logging

Notification system

Use reusable components.

Separate UI, business logic, authentication, financial calculations, and data access.

Never hard-code financial balances.

All financial calculations should be performed reliably on the backend.

DEMO DATA

Create realistic Kenyan demo data:

Chama: "Tupendane Women Group"

Members:

- Mama Wanjiku

- Mama Akinyi

- Mama Njeri

- Mama Wambui

- Mama Atieno

Use Kenyan currency:

KSh

Create realistic contribution, loan, meeting, and transaction examples.

MOST IMPORTANT REQUIREMENT

The application must pass this test:

Give the phone to a 60-year-old Kenyan chama member who has never used the application.

If she can understand:

- How much she has contributed

- Whether she owes money

- When the next meeting is

- How to contact/help the chama

- How to make a contribution

without somebody explaining every screen, the design is successful.

Prioritize simplicity, trust, familiarity, accessibility, Kenyan context, and financial transparency over visual complexity.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f14e191c-fcf2-4334-964b-cb230a2d983d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
