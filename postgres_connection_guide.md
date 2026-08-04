# Real-World Standalone PostgreSQL Connection & Setup Guide

This guide walks you through connecting **BloodBridge** to a standalone, real-world SQL PostgreSQL database server without relying on Backend-as-a-Service (BaaS) wrappers. By retaining Firebase for Authentication while running your data structures on pure SQL, you achieve enterprise-grade security and prevent database expiration or crash risks.

---

## Step 1: Obtain Your PostgreSQL Server & Connection String

You can use any standard PostgreSQL hosting provider or self-hosted instance (e.g., AWS RDS, DigitalOcean Managed Postgres, Render Postgres, Vercel Postgres / Neon, or an local Docker instance).

Your provider will give you a standard database connection string (`DATABASE_URL`) that looks like this:
```
postgresql://username:password@hostname.provider.com:5432/databasename?sslmode=require
```

### Recommended Free-Tier Relational SQL Providers:
1. **Neon Postgres (Vercel Integration)**: Go to Vercel Dashboard → Storage → Create → Postgres. Copy the `DATABASE_URL` string.
2. **Render Postgres**: Go to [Render.com](https://render.com) → New → PostgreSQL. Under Connections, copy the **External Database URL**.
3. **AWS RDS / DigitalOcean**: Copy your host, port, username, password, and form the connection string above.

---

## Step 2: Initialize Your Database Schema

Once you have your database server running, execute our pre-compiled DDL schema to create the tables, indexes, and relationships.

You can execute the schema file located at `sql/schema.sql` in three simple ways:

### Option A: Using a GUI Database Client (DBeaver, pgAdmin, TablePlus, or VS Code SQL)
1. Connect to your database using the connection string.
2. Open the file `sql/schema.sql`.
3. Click **Execute / Run Query**.

### Option B: Using Command-Line `psql`
If you have PostgreSQL tools installed on your computer or terminal:
```bash
psql -d "postgresql://user:password@hostname:5432/dbname?sslmode=require" -f sql/schema.sql
```

### Option C: Using Vercel / Neon / Supabase SQL Query Console
Paste the contents of `sql/schema.sql` directly into your provider's browser SQL Query Console and click **Run**.

---

## Step 3: Configure Environment Variables

To ensure Vercel Serverless Functions can connect to your database over pooled connections without exposing credentials to browsers, add the connection string to your environment settings.

### 1. Local Testing (`.env.local`)
Add the following line to the end of your `.env.local` file:
```ini
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?sslmode=require"
VITE_DB_MODE="dual"
```

### 2. Live Vercel Deployment (Vercel Dashboard)
Go to **Vercel Dashboard → BloodBridge → Settings → Environment Variables**:
* Add **`DATABASE_URL`** = your full PostgreSQL connection string (Apply to Production & Preview).
* Add **`VITE_DB_MODE`** = **`dual`** (This enables zero-downtime hybrid mode where data writes simultaneously to Firebase and PostgreSQL!).

---

## Step 4: Zero-Downtime Data Synchronization & Transition

We have built a failover-safe **Database Abstraction Controller (`src/core/db/`)** that prevents application crashes during transition:
1. **`VITE_DB_MODE="dual"` (Safe Transition Mode)**: While set to dual mode, user logins, donation requests, and camps read smoothly from Firebase while simultaneously saving into your PostgreSQL tables in real-time. If PostgreSQL suffers network delay or configuration errors, it silently catches the warning without crashing the frontend!
2. **Automated Batch Migration**: Open your deployed **Admin Dashboard**, navigate to the **Data Migration Console**, and press **"Synchronize Firebase to PostgreSQL"**. The system will batch-transfer all historical users, camps, blood requests, and logs into your new SQL server in seconds.
3. **Final Switchover (`VITE_DB_MODE="postgres"`)**: Once you verify your SQL tables are full and fast, change `VITE_DB_MODE` to `postgres`. Your entire data layer is now officially 100% running on standard PostgreSQL!
