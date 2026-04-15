# Clearbook

Persönliche Buchhaltungs-App für deutsche Einzelunternehmer + Angestellte.
Kein Steuerberater-Ersatz — ein Finanz-Begleiter, der mitdenkt.

## Tech Stack

- **Next.js 14** (App Router, React Server Components)
- **Supabase** (Postgres + Auth + RLS)
- **Tailwind CSS** + Manrope/Inter
- **Claude API** (`claude-sonnet-4-20250514`) — Freitext → strukturierte Buchung
- **Recharts** — Dashboard Diagramme
- **DiceBear Bottts** — dein persönlicher Buchhalter-Avatar

## Setup

```bash
npm install
cp .env.example .env.local
# .env.local: Supabase Keys + CLAUDE_API_KEY eintragen
npm run dev
```

### Supabase Schema

Das komplette Schema liegt in `supabase/schema.sql`. In Supabase SQL Editor einfügen & ausführen. Legt an:

- `profiles` (erweitert `auth.users`)
- `transactions` (Kernentität)
- `categories` (pro User)
- `learned_merchants` (Auto-Learning)
- `recurring_templates`, `trips`, `refunds_maa`, `ustva_exports`
- RLS Policies (User sieht nur eigene Daten)
- Trigger: Auto-Learning gelernter Händler
- RPC: `insert_default_categories(user_id, profil_type)`

### Admin-User setzen

Nach Registrierung manuell im Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'deine@email.de';
```

## Status (MVP)

**Fertig:**
- Auth + Multi-Step Onboarding (Anrede, Profil, Bottt, Kategorien)
- Dashboard mit KPIs (USt-Zahllast, Gewinn YTD, Liquidität, offene M&A) + 2 Charts
- Schnelleingabe (FAB → Claude API → Transaktion)
- Review Screen (bestätigen / editieren / bulk confirm)
- Explorer (Filter: Scope, Monat, Kategorie, Typ)
- Export Screen (UStVA Vorschau, PDF/CSV kommen später)
- Settings (Profil, Bottt wechseln, Logout)

**Nächste Durchgänge:**
- PDF/CSV Export
- Trips Screen
- Admin Panel (`/admin`)
- i18n (DE/EN Toggle)
- Wiederkehrende Buchungen UI
- Auto-Book Logik (nach 5x gleicher Händler)
- Bestätigungs-Email Template (Supabase Auth Customization)

## Deployment

1. GitHub Repo mit Vercel verbinden
2. ENV Variablen in Vercel setzen (siehe `.env.example`)
3. Supabase Auth Redirect URL: `https://<deine-domain>/auth/callback`

## Architektur

```
app/
  (app)/           # protected routes (middleware check)
    dashboard/
    explorer/
    review/
    export/
    settings/
  auth/            # public: welcome, login, register, callback
  api/
    parse-transaction/   # Claude API proxy
components/        # BotttAvatar, Nav, QuickInput, AppShell
lib/
  supabase/        # client, server, middleware
  claude.ts        # parseTransaction()
  dicebear.ts      # Bottt helper
  utils.ts         # fmtEUR, calcVat, monthRange
  messages.ts      # Bottt Nachrichten
middleware.ts      # Auth redirect für protected routes
supabase/
  schema.sql       # kompletter DB-Aufbau
```
