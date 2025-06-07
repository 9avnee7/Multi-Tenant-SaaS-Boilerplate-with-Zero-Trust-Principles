Multi-Tenant SaaS Boilerplate
A  zero-trust SaaS starter kit featuring:

Node.js/Express backend

Next.js frontend

Keycloak for authentication and tenant management

PostgreSQL with Row-Level Security (RLS)

Open Policy Agent (OPA) for RBAC and policy enforcement

Tailscale for secure, private networking

High-Level Implementation
Multi-Tenancy: Each tenant is isolated as a Keycloak realm; all user and data access is tenant-scoped.

Authentication & Authorization: Keycloak for SSO, JWT, and RBAC; OPA for fine-grained policy enforcement.

Database Isolation: PostgreSQL with RLS ensures tenant data isolation at the database level.

Zero-Trust Networking: Tailscale secures database access; only authenticated backend nodes can connect.

Dynamic Tenant Creation: Admins can create new realms and admin users via the UI.

Role-Based UI: Admins can manage users and tenants; regular users have read-only access.

Project Structure
root/

backend/ # Node.js API server

frontend/ # Next.js frontend

infrastructure/ # Docker Compose files for OPA, Keycloak, Tailscale+Postgres

Prerequisites
Docker & Docker Compose

Node.js (v18+ recommended)

npm

How to Run Locally
1. Clone the Repository
git clone <your-github-repo-url>
cd <your-repo-folder>

2. Build and Start Infrastructure (Docker Compose)
Open three terminals (or run these in sequence):

a. Keycloak + Keycloak DB
cd infrastructure/keycloak
docker-compose up -d

b. Tailscale + Main PostgreSQL
cd infrastructure/tailScaleDb
docker-compose up -d

c. OPA
cd infrastructure/opa
docker-compose up -d

3. Backend Setup
cd backend
cp .env.example .env # Edit DB/Keycloak secrets as needed
npm install
npm run dev

4. Frontend Setup
cd frontend
npm install
npm run dev

5. Access the Application
Frontend: http://localhost:3000

Keycloak Admin: http://localhost:8080 (admin/admin)

OPA: http://localhost:8181

