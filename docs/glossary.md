# Glossary — Domain Dictionary

| Term | Definition | Model / File |
|------|------------|--------------|
| **PickupRequest** | Resident `POST /user/pickups {waste_type, quantity_kg, location, lat/lng}` `pending → assigned (collector) → en_route → collected` | `models:78` `PickupStatus` `schemas:124` |
| **WasteBatch** | `Collector COLLECTED` creates `AVAILABLE` (`pickup_request_id unique`) `recycler claim REQUESTED → ACCEPTED → proof COMPLETED` | `models:102` `BatchStatus` |
| **PublicBin** | Admin `POST /management/bins {name, lat/lng, accepted_waste_types[], capacity_kg}` `6` demo `Marina...Guindy` | `models:145` `seed_public_bins:116` |
| **Collector** | `user_id unique` `service_area Chennai` `is_available` `GET /collector/pickups/available` where `status==PENDING and collector_id is None` | `models:53` |
| **Recycler** | `accepted_waste_types ["organic","plastic","e-waste"]` `capacity_kg 500` `rating 4.8` `GET /recycler/batches` | `models:65` |
| **RewardLedger** | `user_id, pickup_id unique, batch_id, waste_type, weight_kg, points = floor(kg×rate)` idempotent | `services/rewards.py:35` `REWARD_RATES: organic5 plastic10 e-waste15 metal10` |
| **RewardBalance** | `user_id PK, balance, lifetime_earned` | `models:174` |
| **Voucher** | `title, cost_points>0, active, valid_until future` `seed 5: ₹100 Off 100pts` | `models:183` `seed_rewards:116` |
| **Redemption** | `user redeem voucher → PENDING → admin PATCH {issued,cancelled} (cancel refunds)` | `models:203` `vouchers.py:102` |
| **Report** | `POST /management/reports/{users|pickups|batches|bins|rewards|vouchers|redemptions} → /uploads/reports/*.csv utf-8-sig` | `management.py:528` |
| **Pinpoint** | `BinMap pickupPinIcon` red `PIN` `36px` draggable `onPickupDrag` replaces cursor crosshair | `BinMap.tsx:28` |
| **AUTO_SEED** | `1` (default) `main.py:80` `seed_all()` when `COUNT==0` → survives `down -v` | `config.py:20` `UPLOAD_DIR` |
| **Mass Recycled** | `SUM(quantity_kg) JOIN WasteBatch WHERE recycler_id==me AND status==COMPLETED` `25kg` demo | `recycler.py:331` |
| **SPA Fallback** | `GET /{full_path:path}` `404 handler` serves `dist/index.html no-cache` for `history.pushState` routes, `assets immutable` | `main.py:138` |
