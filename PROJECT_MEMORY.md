# PROJECT MEMORY

## 1. Project Overview

**Purpose of the platform:**
Koara is a Multi-Tenant SaaS platform that enables merchants to create digital stores and sell digital products (e.g., gift cards, gaming top-ups, subscriptions).

**Current architecture:**
A monolithic frontend and backend communicating via a REST API, connected to a PostgreSQL database. The platform supports a Super Admin dashboard, merchant dashboards, and dynamic public storefronts via subdomains.

**Technology stack:**
*   **Frontend:** React, Vite, Tailwind CSS v4, React Router
*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL (using `pg` driver)
*   **Deployment/Environment:** Windows-based local development

**Folder structure:**
*   `src/`: Frontend React source code
    *   `src/pages/`: Main views (`Admin.jsx`, `Storefront.jsx`, `Landing.jsx`)
    *   `src/components/`: Reusable UI components
    *   `src/context/`: Global state (`AppContext.jsx`)
*   `backend/`: Node.js server source code
    *   `backend/src/routes/`: Express route handlers (`admin.js`, `auth.js`, `merchant.js`, etc.)
    *   `backend/src/services/`: Business logic services (`providerService.js`, `emailService.js`, `auditService.js`)
    *   `backend/src/config/`: Database config and schema initialization (`initDb.js`)

---

## 2. Database Documentation

| Table | Purpose | Relationships | Important Columns | Known Issues | Future Plans |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | Stores user accounts (admins/merchants) | None | `email`, `password_hash`, `role` | None | N/A |
| `stores` | Stores merchant storefront data | `owner_id` -> `users(id)` | `subdomain`, `balance`, `bank_name` | Balance stored directly (no locking mechanism); lacks `updated_at`. | Add `customization` JSONB column for branding; add `display_currency`. |
| `store_requests` | Stores KYC applications for new merchants | None | `status`, `kyc_document_url` | No FK for `reviewed_by`; missing indexes on `email` and `subdomain`. | Add missing indexes. |
| `email_verifications` | OTP/Email verifications | None | `code`, `expires_at`, `type` | No index on `email+type`; no cleanup job for expired records. | Add cleanup cron job. |
| `email_locks` | Brute force prevention for email codes | None | `email`, `blocked_until` | None | N/A |
| `audit_logs` | Activity logging (e.g., logins) | None | `email`, `action`, `ip_address` | Missing index on `email+action+created_at` (used in rate limiting). | Add composite index. |
| `wallet_transactions` | Ledger for merchant wallet balances | `store_id` -> `stores(id)` | `amount`, `transaction_type` | No `performed_by` column. | Add `performed_by` context. |
| `categories` | Store-level product categories | `store_id` -> `stores(id)` | `name`, `icon_text`, `logo_url` | Missing `description`, `image_url`, and ordering column. | Support category images. |
| `products` | Legacy store-level products | `store_id`, `category_id` | `price`, `sale_price`, `image_url` | Partially superseded by `platform_products`. | Establish clear relationship with platform products or deprecate. |
| `promos` | Discount codes for stores | `store_id` -> `stores(id)` | `code`, `type`, `value` | No usage limit, usage count, or expiry date. | Add usage constraints. |
| `orders` | Customer order history | `store_id`, `product_id` | `amount`, `status`, `customer_name` | Missing `platform_product_id`, `receipt_url`, and `updated_at`. | Fully implement backend order persistence and workflow. |
| `platform_products` | Global product catalog managed by admin | None | `name`, `category`, `is_active` | `category` is a plain string, not a FK to categories. | Normalize categories. |
| `providers` | External product providers (e.g., Reloadly) | None | `name`, `status` | Missing `api_base_url`, `auth_config`, `provider_type`. | Add configuration fields for API integration. |
| `provider_products` | Maps provider products to platform products | `provider_id`, `product_id` | `provider_product_id`, `cost_price` | No unique constraint on `(provider_id, product_id)`. | Add unique constraint. |
| `merchant_products` | Store-specific pricing for platform products | `store_id`, `catalog_product_id` | `selling_price`, `is_enabled` | Missing `currency_code` for multi-currency pricing. | Add `currency_code` for pricing localization. |
| `notification_logs` | Logs all notification attempts | None | `recipient`, `type`, `channel`, `success` | None | Expand to support SMS/WhatsApp logs. |

---

## 3. Backend Architecture

*   **Routes:** Defined in `backend/src/routes/`. Separated by domain (`admin.js`, `merchant.js`, `store.js`, `auth.js`, `catalog.js`, `merchantProducts.js`).
*   **Services:** Contains business logic logic (`emailService.js`, `providerService.js`).
*   **Middleware:** **CRITICAL FLAW:** There is currently NO authentication middleware. All endpoints are public. No rate limiting or strict CORS.
*   **Authentication:** Not properly implemented. Hardcoded credentials exist in seed data. `AppContext.jsx` falls back to mock authentication if the backend fails.
*   **Business logic:** Mixed tightly within route handlers.
*   **Request flow:** Client -> Express Route Handler -> Direct PostgreSQL query -> JSON Response.

---

## 4. Frontend Architecture

*   **Pages:** Main pages include `Landing.jsx`, `Storefront.jsx`, and `Admin.jsx`.
*   **Components:** `Admin.jsx` is a "God Component" (>1300 lines) handling both Super Admin and Merchant dashboards, containing all tabs, modals, and local state.
*   **Contexts:** `AppContext.jsx` is the global state manager.
*   **State management:** Uses a single React Context (`AppContext`) holding 30+ state variables and 20+ functions, causing unnecessary re-renders.
*   **Data flow:** `AppContext.jsx` fetches data on load/role change, sets local state. UI reads from Context.

---

## 5. Provider Architecture

*   **Current provider system:** `providerService.js` filters the `provider_products` table to find active mappings and orders them by `cost_price` to find the cheapest provider.
*   **Product mapping:** Managed via the `provider_products` table.
*   **Provider abstraction:** Non-existent. There are no actual API integrations yet (e.g., Reloadly/DT One adapters).
*   **Future providers:** We need an abstract `BaseProvider` class and a `ProviderRegistry` to cleanly integrate external APIs.

---

## 6. Pricing Architecture

*   **Platform pricing:** Based on `cost_price` from the provider mapping.
*   **Merchant pricing:** Merchants define their markup via `selling_price` in the `merchant_products` table.
*   **Currency handling:** Everything is currently assumed to be USD.
*   **Future exchange-rate strategy:** Each merchant will define their prices in their chosen currency explicitly (no automated background conversion, to prevent price shocks). Add `currency_code` to `merchant_products`.

---

## 7. Order System

*   **Current workflow:** Customer places order -> order is stored *only in memory* in the React frontend (`AppContext.createOrder`) -> merchant "approves" the order -> wallet balance deducted in memory.
*   **Database tables:** The `orders` table exists but is not integrated with the frontend flow.
*   **API flow:** Order API is incomplete/missing.
*   **Merchant flow:** Review receipt and approve/reject.
*   **Known issues:** Orders disappear on page refresh. No backend persistence.
*   **Future improvements:** Implement full backend order persistence: pending -> paid -> fulfilling -> completed.

---

## 8. Known Issues

*   [Open] **Critical Security: No Authentication Middleware:** API routes (including admin/merchant endpoints) lack JWT or session validation.
*   [Open] **Critical Security: Hardcoded Credentials:** `admin@gmil.com` seeded in DB, mock auth in `AppContext.jsx`.
*   [Open] **Architecture: 1300-line God Component:** `Admin.jsx` must be refactored into smaller components.
*   [Open] **Architecture: Context Bloat:** `AppContext.jsx` has too much state; needs to be split.
*   [Open] **Technical Debt: Dual Product Systems:** Both `products` and `platform_products` exist and render simultaneously.
*   [Open] **Technical Debt: Fake Bank Updates:** Bank settings update `setTimeout` fakes a save without calling the API.
*   [Open] **Database: Missing Indexes:** Frequent queries lack indexes (e.g., `audit_logs`, `email_verifications`, `store_requests`).
*   [Fixed] **Technical Debt: Non-functional Orders:** Fully migrated order flow to backend. Orders are persisted in Postgres using an atomic transaction, sequential order numbers (`KOA-00000001`), and historical pricing snapshots. Order updates use `multer` for receipt uploads.

---

## 9. Change Log

*   **2026-06-27:**
    *   Task completed: Initialized `PROJECT_MEMORY.md`.
    *   Files modified: `PROJECT_MEMORY.md`
    *   Database changes: None yet.
    *   API changes: None yet.
    *   Reason for change: Establish a permanent knowledge base to guide all future AI and architectural changes.
*   **2026-06-27:**
    *   Task completed: Implement Real Order System.
    *   Files modified: `backend/src/config/initDb.js`, `backend/src/services/orderService.js`, `backend/src/routes/store.js`, `backend/src/routes/merchant.js`, `src/context/AppContext.jsx`, `src/pages/Storefront.jsx`, `src/pages/Admin.jsx`.
    *   Database changes: `ALTER TABLE orders` added `order_number` (unique), `platform_product_id`, `merchant_product_id`, `receipt_url`, `product_name`, `selling_price`, `currency_code`, `quantity`, `total_amount`, and provider integration fields. Created sequence `order_number_seq`.
    *   API changes: Added `POST /api/store/:storeId/orders` with `multer` receipt upload. Added `GET /api/merchant/orders` and `PUT /api/merchant/orders/:id/status`.
    *   Reason for change: Transition from frontend mock state to PostgreSQL-backed orders with receipt uploads, atomic transactions, and sequential numbering.

*   **2026-06-27:**
    *   Task completed: Implement Email Notification System.
    *   Files modified: `backend/src/services/emailService.js`, `backend/src/services/notificationService.js`, `backend/src/routes/admin.js`, `backend/src/services/orderService.js`, and HTML templates.
    *   Database changes: Created `notification_logs` table.
    *   API changes: Notifications fire seamlessly on `/kyc/approve`, `/kyc/reject`, and order creations.
    *   Reason for change: To deliver production-ready emails asynchronously without breaking backend workflows, allowing for future expansion to SMS/WhatsApp.

*   **2026-06-27:**
    *   Task completed: Merchant Product Customization.
    *   Files modified: `backend/src/config/initDb.js`, `backend/src/routes/merchantProducts.js`, `backend/src/routes/store.js`, `src/pages/Admin.jsx`.
    *   Database changes: Added `custom_title`, `custom_description`, `custom_image_url` to `merchant_products`.
    *   API changes: Updated `PUT /api/merchant/products/:productId` to save customizations. Added `POST /api/merchant/products/upload-image` for custom image uploads.
    *   Reason for change: Allow merchants to white-label individual product presentations directly on their storefronts without duplicating the platform catalog data.

*   **2026-06-27:**
    *   Task completed: Google Authentication Flow (Phase 1) Redux.
    *   Files modified: `backend/src/routes/auth.js`, `src/context/AppContext.jsx`, `src/components/LoginModal.jsx`.
    *   Database changes: None beyond previous schema updates.
    *   API changes: Updated `POST /api/auth/google-login` to handle new users by generating/sending OTPs (`status: requires_otp`). Added `POST /api/auth/google-register` to verify OTP and auto-create the user account.
    *   Reason for change: Fixed an infinite loading bug caused by missing context exports, and completely redesigned the Google Auth flow to allow new users to bypass manual registration fields by using an integrated OTP verification step.

*   **2026-06-28:**
    *   Task completed: Redesign Google Authentication Flow & Unify Onboarding.
    *   Files modified: `backend/src/routes/auth.js`, `src/components/LoginModal.jsx`, `src/pages/Landing.jsx`, `src/components/OnboardingModal.jsx`.
    *   Database changes: None.
    *   API changes: Deleted `POST /google-register`. Updated `POST /google-login` to check `store_requests` (handling pending/rejected merchants) and trigger a unified `requires_onboarding` flow for new users. Updated `POST /login` to return "Invalid credentials." for generic security.
    *   Reason for change: The previous Google Auth flow was bypassing the merchant registration process, leaving new Google users with an empty dashboard because no store was created. The flow has been refactored so that brand new Google users are routed seamlessly into the existing `OnboardingModal` (skipping the password step by randomly generating it under the hood), thus perfectly reusing the existing `store_requests` approval pipeline and ensuring no user reaches the dashboard without a fully onboarded store.

---

## 10. Architecture Decisions

*   **Decision:** Direct `pg` queries over ORM (Prisma/Sequelize).
    *   **Reason:** The existing codebase relies entirely on raw parameterized SQL strings in `initDb.js` and routes.
    *   **Alternatives considered:** Prisma, Sequelize.
    *   **Why selected:** Adhering to the existing pattern to avoid massive rewrites and preserve the current data flow. All database migrations should be handled via `ALTER TABLE` in `initDb.js` rather than destructive recreates, to protect production data.
*   **Decision:** Atomic transaction & historical snapshot for orders.
    *   **Reason:** Ensure data consistency across validations, sequential ID generation, and order insertion. Historical fields protect orders from future product pricing changes.
    *   **Alternatives considered:** Relying on relation joins for order history.
    *   **Why selected:** Storing duplicate columns (e.g. `selling_price`, `product_name`) directly on `orders` ensures the historical snapshot remains intact even if merchant products are modified or deleted.
*   **Decision:** Notification Service Wrapper (`notificationService.js`).
    *   **Reason:** Encapsulates notification logic (`emailService.js` and future `smsService`) so business logic in routes/services (like `orderService.js`) remains clean.
    *   **Resiliency:** Error catching inside the wrapper ensures email failures *never* roll back successful database transactions.
*   **Decision:** Smart Product Data Fallback via COALESCE.
    *   **Reason:** Storefronts need to display a merchant's custom product title/image/description if it exists, otherwise fall back to the global platform values.
    *   **Implementation:** Used PostgreSQL `COALESCE` directly in the database join (`backend/src/routes/store.js`), rather than doing fallback logic on the frontend. This prevents Storefront React code from requiring any architectural redesign and ensures a single source of truth from the API response.

    ## 11. Engineering Rules

These rules are mandatory for every future AI agent.

### General Rules

* Never rewrite working code.
* Never redesign the architecture unless explicitly requested.
* Always preserve backward compatibility.
* Prefer extending existing modules over creating duplicate ones.
* Fix the root cause instead of masking symptoms.
* Keep changes minimal and focused.

---

### Database Rules

* Never drop production tables.
* Never recreate existing tables.
* Always use ALTER TABLE for schema evolution.
* Inspect the existing schema before creating new columns.
* Reuse existing tables whenever possible.
* Avoid duplicate columns representing the same concept.
* Always use transactions for multi-step database operations.

---

### Backend Rules

* Keep business logic out of route handlers whenever practical.
* Reuse existing services before creating new ones.
* Do not duplicate endpoints.
* Maintain consistent API response formats.
* Validate all incoming requests.
* Never trust frontend data.

---

### Frontend Rules

* The backend is always the source of truth.
* Do not simulate backend behavior in React.
* Avoid mock data in production code.
* Preserve the existing design language.
* Improve the UI without changing the overall brand identity.

---

### Provider Rules

Platform products must remain provider-independent.

A provider should only supply:

* Provider Product ID
* Cost
* Availability
* API integration

Never couple platform products directly to a specific provider.

Changing providers should require updating provider mappings only, not business logic.

---

### Pricing Rules

Platform cost is managed only by Super Admin.

Merchant selling prices are completely independent.

Each merchant may choose a display currency.

Merchant prices must never change automatically because exchange rates change.

---

### Order Rules

Orders must always be persisted in PostgreSQL.

React state is never the source of truth.

Every order must belong to exactly one store.

Every merchant must only access their own orders.

Order status must be enforced by the backend.

---

### Notification Rules

Notifications must *never* break the main business workflow.

Emails and other notifications must only be sent *after* successful database transactions (`COMMIT`).

If a notification fails to send, the error must be caught and logged (e.g. to `notification_logs`), and the business transaction must proceed normally.

Architecture must remain extensible for future channels (SMS, WhatsApp, Push) via the NotificationService wrapper.

---

### AI Workflow

Before making any changes:

1. Read PROJECT_MEMORY.md.
2. Review the relevant files only.
3. Identify the root cause.
4. Explain the implementation plan.
5. Wait if architectural clarification is required.
6. Implement only the approved scope.
7. Update PROJECT_MEMORY.md after the task is completed.

Never perform unrelated refactoring while fixing a bug.

---

### Documentation Rules

Every completed task must update:

* Change Log
* Known Issues
* Architecture Decisions

Every resolved bug must be moved from "Open" to "Fixed" with a brief explanation.

PROJECT_MEMORY.md must always remain synchronized with the actual codebase.

---

## 12. Google Login Architecture (Phase 1)

**Authentication Flow:**
* **Trigger:** Merchant clicks "Continue with Google" in the Login Modal.
* **Frontend:** Google's identity services (via `@react-oauth/google`) securely authenticate the user and return an `idToken`.
* **Backend (`POST /api/auth/google-login`):** Validates the `idToken` using Google's official Node.js `google-auth-library`.
* **Resolution:** If the extracted email matches an existing merchant/admin account, the login succeeds and returns identical session context as email/password logins. If not, the login is rejected (`401`).
* **Account Linking:** If the account exists but has never used Google, it is seamlessly linked in the background (`auth_provider = 'google'`, `google_id` saved).

**Database Changes:**
* Added non-destructive `ALTER TABLE users` columns: `google_id` (UNIQUE), `auth_provider` (DEFAULT 'email'), and `avatar_url`.

**Security Decisions:**
* **Zero Trust:** Frontend Google payloads are strictly treated as untrusted. Only the `idToken` is sent, and all user claims (email, name) are decoded directly from Google's verified ticket on the backend.
* **Automatic Registration via OTP:** Google Login integrates natively with the email verification process. If a Google account is unknown, the backend automatically issues an OTP to that email. Upon verification, the merchant account is automatically provisioned, bypassing the manual registration and KYC waitlist queue.

**Future Compatibility:**
* This implementation deliberately uses standard OpenID connect properties (`idToken`, `google_id`, `auth_provider`) so it can easily extend to:
  * Customer Google Login (when a unified customer identity provider is built)
  * Apple/Facebook login (by simply adding `apple_id`/`facebook_id` and expanding `auth_provider`)

---

## 13. End-to-End Automated Gift Card Order Fulfillment (Amazon Egypt via FazerCards)

**Architecture & Database Schema:**
* **`provider_categories` Table:** Maps Koara local categories to external provider category IDs (`provider`, `local_category_name`, `provider_category_id`). Allows admin management of category mappings independently of product logic.
* **`provider_products` Table Extensions:** Added `provider_category_id` (VARCHAR(100)) to allow category overrides per provider mapping.
* **`orders` Table Extensions:** Added tracking and security columns: `provider_id` (INT), `provider_order_id` (VARCHAR(255)), `provider_status` (VARCHAR(50)), `cost_price` (DECIMAL(10,2)), and `encrypted_card_code` (TEXT).
* **Catalog Mapping Separation:** Never create parallel product tables. All automated gift card products use existing `platform_products`, linked to provider APIs via `provider_products`.

**Security & Encryption Architecture:**
* **At-Rest Encryption (`backend/src/utils/encryption.js`):** Gift card codes/PINs received from provider APIs or webhooks are immediately encrypted before persistence using `AES-256-GCM` (`crypto` module).
* **Storage Format:** Stored strictly as `iv:authTag:ciphertext` in `orders.encrypted_card_code`.
* **Zero Merchant Exposure:** The `encrypted_card_code` column is strictly excluded from all queries returning orders to merchants (`orderService.getStoreOrders`). The merchant dashboard (`GET /api/merchant/orders`) displays status and tracking details but never exposes the gift card codes or PINs.

**Fulfillment Workflow:**
1. **Order Creation (`orderService.createOrder`):** Customer places an order for a gift card product. Order starts in `pending` status.
2. **Merchant Approval (`orderService.approveGiftCardOrder` / `PUT|POST /orders/:id/status|approve`):**
   * Locks the `orders` and `stores` rows (`FOR UPDATE`).
   * Resolves active provider mapping in `provider_products` sorted by lowest `cost_price`.
   * Verifies store wallet balance and deducts `cost_price` atomically, logging a `debit` transaction in `wallet_transactions`.
   * Dispatches order asynchronously to `fazerCardsProvider.placeGiftCardOrder(...)`.
   * If successful, sets `orders.status = 'processing'`, `provider_order_id = <ID>`, and commits.
   * If provider dispatch fails synchronously, runs a clean rollback transaction (refunds wallet, logs `credit`, marks order `rejected`).
3. **Webhook Processing & Email Delivery (`POST /api/webhooks/fazercards`):**
   * Verifies HMAC SHA-256 signature using `WEBHOOK_SECRET` (`X-Webhook-Signature` / `X-FazerCards-Signature`).
   * Checks `topup_orders` and `orders` tables by `provider_order_id`.
   * On `order.status_changed` (`completed`):
     * Fetches gift card details via `fazerCardsProvider.getOrder(provider_order_id)`.
     * Encrypts the code (`AES-256-GCM`) and stores in `orders.encrypted_card_code`.
     * Updates `orders.status = 'completed'` and `completed_at = CURRENT_TIMESTAMP`.
     * Renders `giftcard-completed-customer.html` (bilingual RTL template matching Koara aesthetics) and sends the decrypted PIN directly to the customer via `emailService.sendEmail`.
   * On `failed` / `rejected`:
     * Automatically refunds store wallet if `cost_price > 0` and logs `credit` transaction with reason.
     * Updates `orders.status = 'rejected'` and records outcome in `webhook_logs`.

**Frontend UI Architecture (Super Admin & Merchant Dashboard):**
* **Dead Code Avoidance (`AdminPage.jsx` Trap):** `src/pages/Admin/AdminPage.jsx` and `src/pages/Admin/tabs/*` are dead legacy code. All dashboard features and tabs must be implemented directly inside `src/pages/Admin.jsx` or clean external components imported directly.
* **Service Layer (`catalogService.js` & `AppContext.jsx`):**
  * `fetchProviderCategories(providerId)`, `createProviderCategory(...)`, and `deleteProviderCategory(id)` connect to `/api/admin/catalog/provider-categories` and `/api/catalog/provider-categories`.
  * `addProviderMapping(...)` accepts `provider_category_id` alongside `provider_id`, `provider_product_id`, and `cost_price`.
* **Super Admin Provider Categories Management (`Admin.jsx` - Catalog Tab):**
  * Features a dedicated management table and creation modal (`Register Provider Category`) allowing Super Admins to map local categories to external codes (`category_id`, e.g. `amazon_eg`).
  * `catalogProviderModal` (`Manage Providers`) displays Category ID for mapped products and allows selecting a Provider Category dynamically during product-to-provider mapping.
* **Merchant Controls & Pricing (`Admin.jsx` - Gift Cards / Products Tab):**
  * Merchants view gift card platform products (`merchantPlatformProducts`), enable/disable store offerings (`Toggle`), and set custom retail selling prices (`selling_price`) via `updateMerchantProduct`.
  * The frontend strictly enforces the zero-code exposure rule: no card PINs or codes are ever fetched by or displayed on the merchant dashboard.
