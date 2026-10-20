# Re:Mind Performance Benchmarks

> **Disclaimer**: All timings reported below are **SQL query timings in Node on a laptop, not on-device**. Real on-device timings must be verified using the in-app dev perf tracker (`[PERF DEV]`) and are marked `needs device test` until physically measured.

---

## 5,000-Item Laptop SQL Query Measurements
Measured via `node scripts/benchmark-seed.js` using Node native SQLite on macOS:

| Benchmark Scenario | Query / Operation | Measured Laptop Timing | Target | Status |
|---|---|---|---|---|
| **Cold-Start DB Init** | `openDatabaseAsync` + `initSchema` + Indexes | **14.06 ms** | < 50 ms | ✅ Pass |
| **Batched Insert** | Insert 5,000 items across 90-day distribution | **118.42 ms** (0.024 ms/item) | N/A | ✅ Pass |
| **Resurface Pick (5m)** | Status + chip minutes + times_surfaced sort | **2.628 ms** | < 50 ms | ✅ Pass |
| **Resurface Pick (15m)** | Status + chip minutes + times_surfaced sort | **2.037 ms** | < 50 ms | ✅ Pass |
| **Resurface Pick (30m)** | Status + chip minutes + times_surfaced sort | **2.151 ms** | < 50 ms | ✅ Pass |
| **Saved List Pagination (P1)**| `LIMIT 20 OFFSET 0` ordered by `created_at` | **1.841 ms** | < 50 ms | ✅ Pass |
| **Saved List Pagination (P2)**| `LIMIT 20 OFFSET 20` ordered by `created_at` | **1.892 ms** | < 50 ms | ✅ Pass |
| **All Saved Text Search** | `LIKE` query across `title`, `note`, `url` | **5.716 ms** | < 300 ms | ✅ Pass |

---

## Proposed Text Search Optimization Options
While laptop `LIKE` query execution is 5.7 ms, real mobile devices with slower flash storage could encounter delays as the database grows. If needed, the following options are proposed for user approval:
1. **FTS5 Virtual Table (Recommended)**: SQLite full-text search index (`CREATE VIRTUAL TABLE items_fts USING fts5(title, note, url, content=items)`). Provides sub-millisecond prefix search (`MATCH 'query*'`) and handles tokenization and ranking out-of-the-box.
2. **Lowercase Pre-computed Search Column**: Adding a `search_text` column (`LOWER(title || ' ' || COALESCE(note, '') || ' ' || COALESCE(url, ''))`) with an index.

---

## On-Device Real Measurements (Fill-in)
*Instrumented via `src/utils/perfTracker.ts` in `__DEV__` mode.*

| Metric | Target | iOS Device (Actual) | Android Device (Actual) | Notes |
|---|---|---|---|---|
| **Cold start to Today screen interactive** | < 500 ms | *needs device test* | *needs device test* | Logs `[PERF DEV] cold_start_to_today: XX ms` |
| **Today tab switch / chip change latency** | < 50 ms | *needs device test* | *needs device test* | Logs `[PERF DEV] chip_change: XX ms` |
| **All Saved search input-to-render latency**| < 300 ms | *needs device test* | *needs device test* | Logs `[PERF DEV] saved_search: XX ms` |
