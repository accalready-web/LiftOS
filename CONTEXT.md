# LiftOS — Project Context

> สรุปบริบทโปรเจกต์สำหรับตั้งต้นแชทถัดไป
> **อัปเดตล่าสุด:** 2026-11-25 | **Phase:** `Implementation — Step 1.3 Ready`

---

## 1. โครงสร้างโปรเจกต์

```text
LiftOS/
├── app/                          # Expo Router (File-based Routing)
│   ├── _layout.tsx               # Root layout (Stack, dark background)
│   └── index.tsx                 # Placeholder (จะแทนที่ด้วย Tabs ใน Step 1.2)
├── src/
│   ├── types/                    # TypeScript interfaces (ว่าง)
│   ├── constants/                # Design tokens, plates, seed data (ว่าง)
│   ├── lib/storage/              # Cross-platform Local DB abstraction (ว่าง)
│   ├── services/                 # Business Logic (ว่าง)
│   ├── stores/                   # Zustand state management (ว่าง)
│   ├── utils/                    # Pure helpers (ว่าง)
│   └── components/{ui,layout,workout,routine,exercise}/
├── supabase/migrations/          # SQL DDL + RLS (ว่าง, Step 1.3)
├── assets/                       # Images, icons
├── docs/                         # 01_BRIEF, 02_DESIGN, 03_TASKS (เสร็จหมด)
├── app.json                      # Expo config (LiftOS, com.liftos.app, Dark, plugins)
├── eas.json                      # EAS Build (preview: .apk)
├── package.json                  # Expo SDK 58, RN 0.88, React 19.3, TS 6.0
└── tsconfig.json                 # strict + @/* path alias
```

### Installed Dependencies
`expo-sqlite` · `expo-notifications` · `expo-secure-store` · `zustand` · `@supabase/supabase-js` · `lucide-react-native` · `react-native-svg` · `@react-native-async-storage/async-storage`

---

## 2. สิ่งที่เสร็จแล้ว (1 บรรทัด)

- ✅ **Phase 01** — Project Brief (`docs/01_BRIEF.md`)
- ✅ **Phase 02** — Design & Architecture (`docs/02_DESIGN.md`)
- ✅ **Phase 03** — Task Breakdown: 12 Steps (`docs/03_TASKS.md`)
- ✅ **Step 1.1** — Project Init: Expo SDK 58 + Expo Router + dependencies + `src/` structure + `tsc` pass
- ✅ **Step 1.2** — Theme, Design Tokens & Responsive Navigation Shell: `theme.ts`, `useSettingsStore.ts`, `(tabs)/_layout.tsx` (Bottom Tabs / Sidebar), `MiniWorkoutBar.tsx`, placeholder tab screens + `tsc` pass

---

## 3. งานถัดไป: Step 1.3 — Supabase Schema, Auth & Local Offline Storage Layer

อ้างอิง: `docs/02_DESIGN.md` (Sections 1, 4) และ `docs/03_TASKS.md` (Step 1.3)

- [ ] `supabase/migrations/0001_initial_schema.sql` — 9 ตาราง + Indexes + RLS Policies
- [ ] `src/types/database.ts` + `src/types/settings.ts` — TypeScript interfaces ตรงตาม Data Model
- [ ] `src/lib/supabase.ts` — Supabase client + Auth storage adapter
- [ ] `src/lib/storage/interface.ts` — Cross-platform Local DB abstraction interface
- [ ] `src/lib/storage/sqlite.native.ts` — SQLite implementation (Android)
- [ ] `src/lib/storage/web.web.ts` — IndexedDB/Web Storage implementation (Expo Web)
- [ ] `src/lib/storage/migrations.ts` — Schema creation & seed loader
- [ ] `src/stores/useAuthStore.ts` — User session & sync status
- [ ] `app/(auth)/login.tsx` — Email/Password Sign In & Sign Up + Local-first mode

### Backlog (Steps 1.3 → 3.3)
| Step | หัวข้อ |
|------|--------|
| 1.3 | Supabase Schema, Auth & Local Offline Storage Layer |
| 1.4 | Seed Exercises & Sync Engine |
| 2.1 | Exercise Library & Custom Exercises |
| 2.2 | Routine Folders & Routine Builder |
| 2.3 | Active Workout Logger |
| 2.4 | Rest Timer & Plate Calculator |
| 2.5 | Workout History, Settings & Import/Export |
| 3.1 | Unit Tests & Static Checks |
| 3.2 | Cross-Platform & Android Device Verification |
| 3.3 | EAS Build (.apk) & Final Polish |

---

## 4. กฎการทำงาน (ย่อ)

1. อ่าน `STATUS.md` ก่อนเริ่มทุกงาน — อ่าน `docs/` เฉพาะที่เกี่ยวข้อง
2. ทำงานทีละ Step — ไม่กระโดดข้าม
3. อัปเดต `STATUS.md` ก่อนจบแชทเสมอ
4. สื่อสารภาษาไทย / โค้ดภาษาอังกฤษ
5. Cross-platform single codebase (Android-first + Expo Web)
6. Offline-First & Data Safety
7. Clean & Modular (TS strict, single-responsibility)
