# 03 - Task Breakdown: LiftOS

> **Phase 03 Output:** แตกงานพัฒนา MVP ออกเป็น Step ย่อยๆ สำหรับทำทีละแชท ตามสถาปัตยกรรมใน `docs/02_DESIGN.md`
> **เป้าหมาย:** แต่ละ Step มีขอบเขตชัดเจน สามารถพัฒนาและทดสอบให้จบได้ใน 1–2 รอบการทำงาน

---

## Phase 1: Setup & Core Data

### Step 1.1: Project Initialization & Tooling
- [ ] Initialize โปรเจกต์ **Expo (TypeScript + Expo Router)** ใน Workspace
- [ ] ตั้งค่า `app.json` / `app.config.ts` (Android package name, Notification permissions, Expo Web config) และสร้าง `eas.json` (profile `preview` สำหรับ build `.apk`)
- [ ] ติดตั้ง Dependencies หลัก: `expo-sqlite`, `expo-notifications`, `zustand`, `@supabase/supabase-js`, `expo-secure-store`, `lucide-react-native` (หรือ `@expo/vector-icons`)
- [ ] สร้างโครงสร้างโฟลเดอร์ตาม `docs/02_DESIGN.md` (`src/types/`, `src/constants/`, `src/lib/`, `src/services/`, `src/stores/`, `src/utils/`, `src/components/`, `supabase/migrations/`)

### Step 1.2: Theme, Design Tokens & Responsive Navigation Shell
- [ ] สร้าง `src/constants/theme.ts` (Dark Mode Default + Light Mode palette, Set Type badge colors: `W`, `N`, `D`, `F`)
- [ ] สร้าง `src/stores/useSettingsStore.ts` (Theme toggle, Default weight unit `kg`/`lbs`, Default rest timer `90s`, Barbell & plates config)
- [ ] สร้าง `app/_layout.tsx` และ `app/(tabs)/_layout.tsx` แบบ Responsive:
  - Mobile (`< 768px`): Bottom Tab Bar 4 แท็บ (`Workout`, `History`, `Exercises`, `Settings`)
  - Desktop Web (`>= 768px`): Left Sidebar Navigation + Sync status badge
- [ ] เตรียม `MiniWorkoutBar` placeholder สำหรับแสดงเหนือ Tab Bar เมื่อย่อหน้าจอ Active Workout

### Step 1.3: Supabase Schema, Auth & Local Offline Storage Layer
- [ ] สร้าง `supabase/migrations/0001_initial_schema.sql` ครบ 9 ตาราง (`user_settings`, `exercises`, `routine_folders`, `routines`, `routine_exercises`, `routine_sets`, `workouts`, `workout_exercises`, `workout_sets`) พร้อม Indexes และ RLS Policies (`auth.uid() = user_id` + System exercises read policy)
- [ ] สร้าง `src/types/database.ts`, `src/types/settings.ts` และ `src/lib/supabase.ts`
- [ ] สร้าง Cross-platform Local DB Abstraction (`src/lib/storage/interface.ts`, `sqlite.native.ts` สำหรับ Android, `web.web.ts` สำหรับ Expo Web, `migrations.ts`)
- [ ] สร้าง `src/stores/useAuthStore.ts` และหน้า `app/(auth)/login.tsx` (Email/Password Sign In & Sign Up + โหมดใช้งาน Local-first ก่อนเชื่อมบัญชี)

### Step 1.4: Seed Exercises & Sync Engine
- [ ] จัดเตรียม `src/constants/seedExercises.json` (คัดจาก `free-exercise-db` พร้อม Deterministic UUIDs) และระบบ Auto-seed ลง Local DB เมื่อเปิดแอปครั้งแรก
- [ ] สร้าง `src/services/syncEngine.ts`:
  - **Push Outbox:** อัปโหลด Record ที่ `sync_status = 'pending'` ขึ้น Supabase ตามลำดับ Dependency
  - **Pull Delta:** ดึงข้อมูลที่ `updated_at > last_synced_at` มาอัปเดตลง Local Cache (Last-Write-Wins + Soft Delete)
- [ ] เชื่อมต่อ Auto-sync เมื่อเปิดแอป/กลับมามีอินเทอร์เน็ต และปุ่ม `Sync Now`

---

## Phase 2: UI & Features (MVP)

### Step 2.1: Exercise Library & Custom Exercises
- [ ] สร้าง `src/services/exerciseService.ts` (ค้นหาตามชื่อ, กรองตาม `primary_muscle` และ `equipment`, สร้าง/แก้ไข/ลบ Custom Exercise, ตั้งค่า `preferred_weight_unit` รายท่า)
- [ ] พัฒนาหน้า `app/(tabs)/exercises.tsx` (Search bar, Filter chips, Responsive list / split-pane)
- [ ] พัฒนาหน้า `app/exercises/[id].tsx` (รายละเอียดท่า, วิธีฝึก/ภาพประกอบ, ตั้งค่าหน่วย `kg`/`lbs` เฉพาะท่า, ประวัติที่เคยเล่นท่านั้น)
- [ ] สร้าง `CustomExerciseModal` และ `ExercisePicker` component สำหรับใช้ซ้ำใน Routine Builder และ Active Workout

### Step 2.2: Routine Folders & Routine Builder
- [ ] สร้าง `src/services/routineService.ts` (CRUD สำหรับ `routine_folders`, `routines`, `routine_exercises`, `routine_sets` และ Duplicate Routine)
- [ ] พัฒนาหน้า `app/(tabs)/index.tsx` (Workouts Hub: ปุ่ม `Start Empty Workout`, จัดการ Folders, Routine Cards พร้อมปุ่ม `Start`, `Edit`, `Duplicate`, `Delete`)
- [ ] พัฒนาหน้า `app/routine/[id].tsx` (Routine Builder):
  - Mobile: แก้ชื่อ, เลือก Folder, จัดลำดับท่า, กำหนด Target Sets/Set Type/Reps/RPE/Rest Timer และเปิด `ExercisePicker` แบบ Modal
  - Desktop Web: Layout แบบ **Split-pane** (ฝั่งซ้ายแก้ไข Routine, ฝั่งขวา `ExercisePicker` คลิกเพิ่มท่าได้ทันที)

### Step 2.3: Active Workout Logger (Core In-Gym UX)
- [ ] สร้าง `src/stores/useActiveWorkoutStore.ts` พร้อม Auto-save ลง `active_workout_draft` ทุกครั้งที่มีการเปลี่ยนแปลง (ป้องกันข้อมูลหายเมื่อสลับแอปหรือปิดหน้าจอ)
- [ ] สร้าง `src/services/workoutService.ts` (ดึงค่า `Previous` จาก Session ล่าสุดของแต่ละท่า, แปลงหน่วยอัตโนมัติถ้าสลับ `kg`/`lbs`, คำนวณ `total_volume_kg` และ `total_sets`)
- [ ] พัฒนาหน้า `app/workout/active.tsx` และ `src/components/workout/` (`ExerciseCard`, `SetRow`, `SetTypeBadge`):
  - แสดง Elapsed Timer, ปุ่ม `Finish`, ปุ่ม Minimize ไปยัง `MiniWorkoutBar`
  - แตะ `Previous` เพื่อกรอกค่าเดิมอัตโนมัติ, แตะ Set number เพื่อเปลี่ยน Type (`W`/`N`/`D`/`F`)
  - ช่องกรอก Weight/Reps/RPE ที่เหมาะกับการกดมือเดียวในยิม (Auto-select text, Numeric keypad, ปุ่มติ๊ก `✓` ขนาด `44×44 dp`+)
  - หน้าต่างสรุปก่อนกดยืนยันบันทึก Workout

### Step 2.4: Automatic Rest Timer & Plate Calculator
- [ ] สร้าง `src/lib/notifications.ts` และระบบ Rest Timer แบบอ้างอิง Timestamp (`restEndTime`):
  - ตั้ง **Scheduled Local Notification** (`expo-notifications` พร้อม Android High-priority Channel) ทันทีเมื่อติ๊ก `✓` จบ Set
  - คำนวณเวลาที่เหลือใหม่เมื่อแอปกลับเข้า Foreground + ยกเลิก/ตั้ง Notification ใหม่เมื่อกด `-15s` / `+15s` / `Skip`
  - รองรับ Web Audio / Browser Notification บน Expo Web
- [ ] สร้าง `RestTimerBar` แบบ Sticky ภายในหน้า Active Workout
- [ ] สร้าง `src/utils/plateCalculator.ts` (คำนวณจำนวนแผ่นต่อข้างทั้งหน่วย `kg` และ `lbs`)
- [ ] สร้าง `PlateCalculatorModal` (เลือกน้ำหนักบาร์เบล, กรอกน้ำหนักเป้าหมาย, แสดงภาพแผ่นสีมาตรฐานและจำนวนแผ่นต่อข้าง)

### Step 2.5: Workout History, Settings & Data Portability (JSON / CSV)
- [ ] พัฒนาหน้า `app/(tabs)/history.tsx` และ `app/history/[id].tsx` (รายการ Workout เรียงตามเวลา, Master-Detail บน Desktop Web, ดู/แก้ไข/ลบประวัติ, ปุ่ม `Save as Routine`)
- [ ] สร้าง `src/services/portabilityService.ts` (Export ข้อมูลทั้งหมดเป็น `JSON`, Export ประวัติเป็น `CSV`, Import `JSON` และ `CSV` รวมถึง Mapping พื้นฐานจาก Hevy CSV)
- [ ] พัฒนาหน้า `app/(tabs)/settings.tsx` (สลับ Theme `Dark`/`Light`, Default Unit `kg`/`lbs`, Default Rest Timer, ตั้งค่าบาร์เบลและแผ่นน้ำหนักที่มี, สถานะ Sync + `Sync Now`, ปุ่ม Import/Export, Log Out)

---

## Phase 3: Testing, Device Verification & Polish

### Step 3.1: Unit Tests & Static Checks
- [ ] เขียน Unit Tests สำหรับ Pure Logic (`plateCalculator`, `unitConversion`, `workoutService` volume/previous calculation, `syncEngine` conflict resolution, `portabilityService` JSON/CSV)
- [ ] รัน `tsc --noEmit` และ Linter ให้ผ่านทั้งหมดโดยไม่มี Type Error

### Step 3.2: Cross-Platform & Real Android Device Verification
- [ ] ทดสอบ **Desktop Web** (`npx expo start --web`): ตรวจสอบ Responsive Sidebar, Split-pane Routine Builder, Master-Detail History และ Sync กับ Supabase
- [ ] ทดสอบ **Android จริงผ่าน Expo Go**:
  - ทดสอบจด Workout แบบ **Offline 100%** (ปิด Wi-Fi/4G) แล้วเปิดเน็ตเพื่อดู Sync กลับขึ้น Supabase
  - ทดสอบ `active_workout_draft` โดยสลับแอป/ปิดแอปแล้วเปิดใหม่ระหว่างซ้อม
  - ทดสอบ **Background Rest Timer & Local Notification** ขณะล็อกหน้าจอ (รวมถึงเช็กการตั้งค่า Battery Optimization ของ Android)

### Step 3.3: EAS Build (`.apk`) & Final Polish
- [ ] Build ไฟล์ `.apk` ด้วย `eas build -p android --profile preview`
- [ ] ติดตั้ง `.apk` บนเครื่อง Android จริงและทดสอบ End-to-End Flow (วางแผน Routine บนคอม → ซิงค์เข้ามือถือ → เล่นในยิม → ซิงค์ประวัติกลับขึ้นคอม → Export สำรองข้อมูล)
- [ ] เก็บรายละเอียด UI/UX และ Bug เล็กน้อยก่อนใช้งานจริง
