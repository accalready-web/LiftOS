# LiftOS — Project Context

> สรุปบริบทโปรเจกต์สำหรับตั้งต้นแชทถัดไป
> **อัปเดตล่าสุด:** 2026-11-26 | **Phase:** `Implementation — Step 2.3 Ready`

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
- ✅ **Step 1.3** — Supabase Schema, Auth & Local Offline Storage Layer: `0001_initial_schema.sql` (9 tables + RLS), `types/`, `supabase.ts`, cross-platform `storage/` (`sqlite.native.ts` + `web.web.ts`), `useAuthStore.ts`, `(auth)/login.tsx`
- ✅ **Step 1.4** — Seed Exercises & Sync Engine: `seedExercises.json` (85 exercises), `seedService.ts`, `syncEngine.ts` (Push Outbox → Pull Delta + LWW), auto-sync on launch/foreground/reconnect, `Sync Now` UI + `tsc` pass
- ✅ **Step 2.1** — Exercise Library & Custom Exercises: `uuid.ts`, `constants/exercises.ts`, `exerciseService.ts`, `ExercisePicker`, `CustomExerciseModal`, `ExerciseDetailView`, `(tabs)/exercises.tsx` (responsive split-pane), `exercises/[id].tsx` + `tsc` pass
- ✅ **Step 2.2** — Routine Folders & Routine Builder: `routineService.ts`, `FolderModal`, `RoutineCard`, `(tabs)/index.tsx` (Workouts Hub), `routine/[id].tsx` (Mobile Modal / Desktop Split-pane Routine Builder) + `tsc` pass

---

## 3. งานถัดไป: Step 2.3 — Active Workout Logger (Core In-Gym UX)

อ้างอิง: `docs/02_DESIGN.md` (Sections 2.2, 3.2 #4, 4.2 #7–9) และ `docs/03_TASKS.md` (Step 2.3)

- [ ] `src/stores/useActiveWorkoutStore.ts` — Auto-save ลง `active_workout_draft` ทุกครั้งที่แก้ไข
- [ ] `src/services/workoutService.ts` — ดึงค่า `Previous` จาก Session ล่าสุด, แปลงหน่วย `kg`/`lbs`, คำนวณ `total_volume_kg` และ `total_sets`
- [ ] `app/workout/active.tsx` & `src/components/workout/` (`ExerciseCard`, `SetRow`, `SetTypeBadge`) — Elapsed Timer, Fill Previous, Set Type (`W`/`N`/`D`/`F`), ปุ่ม `✓` 44×44+ dp, หน้าต่างสรุปก่อน Finish
- [ ] เชื่อมต่อ `MiniWorkoutBar` และปุ่ม `Start Empty Workout` / `Start Routine`

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
