# Database — Models, Seed, Persistence

> `SQLModel` `SQLite aiosqlite` dev `Postgres asyncpg` prod `Alembic` `AUTO_SEED`

## URL

`Settings.DATABASE_URL: str` `config.py:11` `env_file=.env` `podman-compose.yml:10 sqlite+aiosqlite:////app/data/waste.db` `start.sh:153 sqlite+aiosqlite:///./test.db` `166 postgresql+asyncpg://waste_user:waste_pass@localhost:5432/waste_management`.

## Models `backend/app/models/__init__.py`

| Table | Key Fields |
|-------|------------|
| `users` `32` | `id, username unique, email unique, role Enum(management/user/collector/recycler), password_hash, is_active` |
| `collectors` `53` | `user_id unique FK, service_area Chennai, is_available` |
| `recyclers` `65` | `user_id unique, accepted_waste_types JSON default [], capacity_kg 500, rating 4.8` |
| `pickup_requests` `78` | `user_id, collector_id FK, waste_type, quantity_kg>0, location, lat/lng, status Enum(pending,assigned,en_route,collected), requested_at, collected_at` |
| `waste_batches` `102` | `pickup_request_id unique FK, recycler_id FK, status AVAILABLE/REQUESTED/ACCEPTED/PROCESSING/COMPLETED, handed_over_at, processed_at, proof_url` |
| `public_bins` `145` | `name, lat/lng, accepted_waste_types JSON, capacity_kg, created_by FK` |
| `reward_ledger` `160` | `user_id, pickup_id unique, batch_id, waste_type, weight_kg, points` |
| `reward_balances` `174` | `user_id PK, balance, lifetime_earned` |
| `vouchers` `183` | `title, description, cost_points>0, active, valid_until, created_by` |
| `redemptions` `203` | `user_id, voucher_id, points_spent, status pending/issued/cancelled` |
| `reports` `133` | `generated_by, report_type, file_url /uploads/reports/*.csv` |

## Migrations

`backend/alembic/env.py:13` `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)` `backend/alembic.ini:6` placeholder. `versions/0001_initial_schema:113` `reports` + `public_bins` `versions/0002_rewards:20` `reward_ledger` `voucher` etc.

## Seed `backend/app/db/seed_demo.py`

`upsert_user:11` `seed_demo_batches:53` 4 pickups (`metal 15→COMPLETED`, `plastic 10→COMPLETED`, `organic 8→AVAILABLE`, `e-waste 12→AVAILABLE`) `25kg` `seed_public_bins:116` 6 bins `Marina...Guindy` `seed_rewards_and_vouchers:116` 5 vouchers `₹100 Off` `balance 250` `ledger 2`. `seed_all:183` `create_all` + 5 users. `main.py:78` `if AUTO_SEED!="0": await seed_all()` (idempotent `COUNT==0`).

## Persistence

| Scenario | `test.db` | `sqlite_data:/app/data/waste.db` |
|----------|-----------|----------------------------------|
| `podman-compose restart` | untouched | retained |
| `down` | untouched | retained |
| `down -v` | untouched | **wiped → next up auto-seeds 25kg + 6 bins** |
| `Render` | N/A | ephemeral → `AUTO_SEED` re-seeds each deploy |

## Backfill

`main.py:69` `UPDATE public_bins SET accepted_waste_types='[]' WHERE IS NULL` `recyclers` similar.
