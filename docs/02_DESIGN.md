# 02 - Design & Architecture: LiftOS

> **Phase 02 Output:** ออกแบบสถาปัตยกรรมระบบ, User Flow, หน้าจอ (Android Mobile & Desktop Web), Data Model/Schema และโครงสร้างโค้ด
> **Confirmed Decisions:**
> - **Sync Architecture:** Option A — **Supabase (Free Tier) + Offline-First Local Cache**
> - **Theme:** **Dark Mode Default** + Light Mode Toggle
> - **Weight Units:** **kg Default** + ตั้งค่าสลับ `kg` / `lbs` ได้ทั้งระดับแอปและรายท่า (รวม Plate Calculator ทั้ง 2 หน่วย)

---

## 1. System Architecture & Sync Strategy

### 1.1 ภาพรวมสถาปัตยกรรม (Offline-First + Cloud Sync)
LiftOS ใช้แนวคิด **Local-First / Offline-First** เพื่อให้การใช้งานในยิมบน Android ทำงานได้ทันทีโดยไม่ต้องรออินเทอร์เน็ต และใช้ **Supabase** เป็นตัวกลางซิงค์ข้อมูลระหว่าง Desktop Web กับ Android:

```text
┌─────────────────────────────┐         ┌─────────────────────────────┐
│   Android App (Expo Native) │         │   Desktop Web (Expo Web)    │
│  - Active Workout Logger    │         │  - Routine Builder (Wide)   │
│  - Local SQLite Cache       │         │  - Local IndexedDB/Storage  │
│  - Rest Timer Notifications │         │  - History & CSV/JSON       │
└──────────────┬──────────────┘         └──────────────┬──────────────┘
               │  Background Sync / Manual Sync        │
               │   (Push Outbox → Pull Delta)          │
               └───────────────────┬───────────────────┘
                                   ▼
               ┌───────────────────────────────────────┐
               │        Supabase (Free Tier)           │
               │  - Auth (Email/Password Single-User)  │
               │  - PostgreSQL + Row Level Security    │
               └───────────────────────────────────────┘
```

### 1.2 แนวทางการทำงานแบบ Offline-First & Sync Engine
1. **UI อ่าน/เขียนจาก Local Database เสมอ:** หน้าจอทุกหน้าจะอ่านข้อมูลจาก Local Storage/SQLite เป็นหลัก ทำให้เปิดแอปเร็ว ไม่มีหน้าจอรอโหลดนานในยิม และบันทึก Set ได้แม้ไม่มีสัญญาณ
2. **Active Workout Draft Persistence:** ขณะกำลังเล่น (`Active Workout`) สถานะทั้งหมด (เวลาเริ่ม, ท่าที่เพิ่ม, ค่าที่กรอกในแต่ละ Set, เวลาพักที่เหลือ) จะถูกบันทึกลง Local Draft (`active_workout_draft`) แบบอัตโนมัติทุกครั้งที่มีการแก้ไข ป้องกันข้อมูลหายเมื่อสลับแอปหรือ Android เคลียร์ Memory
3. **Sync Outbox & Delta Pull:**
   - ทุก Record ที่ผู้ใช้สร้าง/แก้ไข/ลบ จะมี `id` (UUID v4 สร้างจากฝั่ง Client), `updated_at` (ISO UTC), `deleted_at` (Soft Delete), และ flag ฝั่ง Local (`sync_status`: `'pending' | 'synced'`)
   - **Push:** เมื่อมีอินเทอร์เน็ต ระบบจะส่ง Record ที่ `sync_status = 'pending'` ขึ้น Supabase แบบ Upsert (เรียงตาม Dependency: `routine_folders` → `exercises` → `routines` → `routine_exercises` → `routine_sets` → `workouts` → `workout_exercises` → `workout_sets` → `user_settings`)
   - **Pull:** ดึงข้อมูลจาก Supabase เฉพาะแถวที่ `updated_at > last_synced_at` ของอุปกรณ์นั้นมาอัปเดตลง Local Cache
   - **Conflict Resolution:** ใช้แบบ **Last-Write-Wins (LWW)** เปรียบเทียบ `updated_at` (เพียงพอและปลอดภัยมากสำหรับแอป Single-user ที่ใช้งานทีละเครื่อง)
4. **Security (Single-User RLS):** ใช้ Supabase Auth (Email + Password) เปิด **Row Level Security (RLS)** ทุกตารางโดยกำหนด Policy `auth.uid() = user_id` เพื่อป้องกันข้อมูลส่วนบุคคล (ยกเว้น System Exercises ที่ `user_id IS NULL` ให้ทุกคนอ่านได้)

---

## 2. User Flow

### 2.1 Desktop Web Flow — วางแผนตาราง & จัดการข้อมูล
1. **เข้าสู่ระบบ / Sync:** Login ด้วย Supabase Account → ระบบดึง Routines, Custom Exercises และ History ล่าสุดมาแสดง
2. **จัดการคลังท่า (Exercise Library):**
   - ค้นหาท่าตามชื่อ, กลุ่มกล้ามเนื้อ (`Chest`, `Back`, `Legs`, `Shoulders`, `Arms`, `Core`), หรืออุปกรณ์ (`Barbell`, `Dumbbell`, `Cable`, `Machine`, `Bodyweight`)
   - กดสร้าง **Custom Exercise** หากไม่มีท่าที่ต้องการ พร้อมกำหนดหน่วยน้ำหนักเฉพาะท่าได้ (`Default` / `kg` / `lbs`)
3. **สร้าง/แก้ไข Routine (Routine Builder):**
   - เลือก/สร้าง Folder (เช่น `PPL`, `Upper / Lower`) → กด `+ New Routine`
   - ใช้หน้าจอแบบ Split-pane: ฝั่งซ้ายจัดเรียงท่า, กำหนด Target Sets, Set Types, Target Reps/RPE, Default Rest Timer และ Notes; ฝั่งขวาค้นหาและคลิกเพิ่มท่าจาก Exercise Library ได้ทันที
   - กด `Save Routine` → บันทึกลง Local & Sync ขึ้น Supabase อัตโนมัติ พร้อมใช้งานบนมือถือทันที
4. **ดูประวัติ & สำรองข้อมูล:** เปิดดูประวัติการฝึกย้อนหลังในรูปแบบ Master-Detail และ Export/Import ข้อมูลเป็น `JSON` หรือ `CSV`

### 2.2 Android Mobile Flow — บันทึกการฝึกในยิม (In-Gym UX)
1. **เปิดแอป & เลือกการฝึก:** เปิดแอป (โหลดจาก Local SQLite ทันทีแม้ Offline) → ไปที่แท็บ `Workout` → เลือก Routine ที่วางแผนไว้ หรือกด `Start Empty Workout`
2. **บันทึก Set แบบรวดเร็ว (Fast Logging):**
   - ข้างช่องกรอกแสดงคอลัมน์ `Previous` (`น้ำหนัก × ครั้ง` ของ Session ล่าสุด) → แตะที่ค่า Previous หรือกดปุ่ม Fill เพื่อดึงค่าเก่ามาแก้ได้ทันที
   - แตะป้ายหมายเลข Set เพื่อเปลี่ยน **Set Type** (`W` Warm-up / `1,2,3` Normal / `D` Drop Set / `F` Failure)
   - กดไอคอน **Plate Calculator** ข้างช่องกรอกน้ำหนัก (สำหรับท่า Barbell) เพื่อดูจำนวนแผ่นน้ำหนักที่ต้องใส่แต่ละข้าง
   - กดปุ่มติ๊กถูก (`✓`) เพื่อจบ Set
3. **Rest Timer อัตโนมัติ & Local Notification:**
   - ทันทีที่ติ๊ก `✓` จบ Set → แถบ **Rest Timer** จะนับถอยหลังอัตโนมัติ (ตามเวลาพักของท่านั้น หรือค่าเริ่มต้น)
   - บันทึก `rest_end_timestamp` และตั้ง **Scheduled Local Notification** (`expo-notifications`) ทันที — ดังนั้นแม้ผู้ใช้ล็อกหน้าจอหรือสลับไปแอปอื่น เมื่อครบเวลาเครื่องจะสั่นและแจ้งเตือนอย่างแม่นยำ
   - มีปุ่มปรับเวลาด่วน `-15s`, `+15s`, `Skip` บนแถบ Timer
4. **จบ Workout & Sync:**
   - กด `Finish` → ตรวจทานสรุประยะเวลา, จำนวน Set และ Total Volume → กดยืนยันบันทึก
   - บันทึกลง Local DB ทันที (ทำต่อได้แม้ Offline) → หากออนไลน์ระบบจะ Sync ขึ้น Supabase ในพื้นหลัง หรือรอ Sync อัตโนมัติเมื่อกลับมามีสัญญาณ

---

## 3. หน้าจอหลักและ Layout (Screens & Responsive Design)

### 3.1 ระบบนำทาง (Navigation Architecture)
ใช้ **Expo Router** แยก Responsive Navigation ตามขนาดหน้าจอ (`width >= 768px` เป็น Desktop/Tablet Web, `< 768px` เป็น Mobile):

- **Android Mobile (`< 768px`):**
  - **Bottom Tab Bar (4 Tabs):**
    1. `Workout` (หน้าเริ่มฝึก & รายการ Routines)
    2. `History` (ประวัติการฝึกย้อนหลัง)
    3. `Exercises` (คลังท่า & Custom Exercises)
    4. `Settings` (ตั้งค่า, Sync, Import/Export)
  - **Persistent Mini Workout Bar:** เมื่อกำลังเล่น Workout อยู่และกดย่อหน้าจอ (Minimize) จะมีแถบลอยเหนือ Tab Bar แสดงชื่อ Workout + เวลาที่ผ่านไป เพื่อให้สลับไปดู History หรือ Exercises แล้วกดกลับมาเล่นต่อได้ทันที
- **Desktop Web (`>= 768px`):**
  - **Left Sidebar Navigation:** แสดง Logo LiftOS, เมนู 4 หน้าหลัก, ปุ่ม `+ Quick Routine`, และป้ายสถานะ Sync (เช่น `Synced just now` / `Offline`)
  - **Wide Split-Pane Views:** ใช้พื้นที่หน้าจอกว้างเพื่อลดการสลับหน้าไปมา (เช่น Routine Builder, History Master-Detail)

### 3.2 รายละเอียดหน้าจอ (MVP Screens)

| หน้าจอ | เส้นทาง (Expo Router) | หน้าที่หลักและองค์ประกอบสำคัญ | Mobile vs Desktop Web |
|---|---|---|---|
| **1. Auth / Sync Gate** | `/(auth)/login` | Sign In / Sign Up ด้วย Email+Password หรือใช้งานแบบ Local-first ก่อนเชื่อมบัญชี | ฟอร์มกลางจอเรียบง่าย |
| **2. Workouts Hub** | `/(tabs)/index` | ปุ่ม `Start Empty Workout`, รายการ `Folders` + `Routine Cards` (แสดงชื่อ, รายชื่อท่าย่อ, ปุ่ม `Start Routine`, เมนู `Edit / Duplicate / Delete`) | Mobile: 1 คอลัมน์<br>Desktop: Grid 2–3 คอลัมน์ |
| **3. Routine Builder** | `/routine/[id]` | แก้ชื่อ Routine, เลือก Folder, จัดลำดับท่า (Up/Down หรือ Drag), กำหนด Target Sets, Set Type (`W/N/D/F`), Target Reps/RPE, Default Rest Timer และ Note | Mobile: Modal เพิ่มท่าแยกหน้า<br>Desktop: **Split-pane** (ซ้ายแก้ไข Routine, ขวา Exercise Picker) |
| **4. Active Workout Logger** | `/workout/active` (Modal/Overlay) | Header (Timer นับเวลาซ้อม, ปุ่ม `Finish`, ปุ่มย่อหน้าจอ), การ์ดแต่ละท่า (แสดง Previous, ตาราง Set: `Set Type`, `Previous`, `Weight (kg/lbs)`, `Reps`, `RPE`, `✓`), ปุ่ม `+ Add Set`, `+ Add Exercise`, Sticky **Rest Timer Bar** (`-15s` / `+15s` / `Skip`) | Mobile: ออกแบบให้กดมือเดียวได้ ปุ่มใหญ่ 44px+ มี Custom/Numeric keypad flow ที่ไว<br>Desktop: Max-width 800px กลางจอ |
| **5. Plate Calculator** | Modal / Bottom Sheet | เลือกแกนบาร์เบล (เช่น `20 kg`, `15 kg`, `45 lbs`), กรอกน้ำหนักรวมเป้าหมาย → แสดงภาพจำลองแผ่นสีมาตรฐานเรียงต่อข้าง + สรุปจำนวนแผ่นต่อข้าง (เช่น `20kg ×1, 10kg ×1, 2.5kg ×1`) | Mobile: Bottom Sheet<br>Desktop: Centered Modal |
| **6. History & Detail** | `/(tabs)/history`<br>`/history/[id]` | รายการ Workout เรียงจากใหม่ไปเก่า (วันที่, ชื่อ, ระยะเวลา, Total Volume, จำนวน Set); หน้ารายละเอียดแสดงทุกท่าและทุก Set พร้อมปุ่ม `Save as Routine`, `Edit Workout`, `Delete` | Mobile: List → กดเข้าหน้ารายละเอียด<br>Desktop: **Master-Detail** ซ้าย-ขวา |
| **7. Exercise Library** | `/(tabs)/exercises`<br>`/exercises/[id]` | ช่องค้นหา + Filter Chips (Muscle Group & Equipment), รายการท่าพร้อม Badge (Custom / Muscle), หน้ารายละเอียดท่า (วิธีฝึก, ภาพประกอบ, ประวัติที่เคยเล่นท่านั้น, ตั้งค่าหน่วย `kg/lbs` เฉพาะท่า), ปุ่ม `+ Create Custom Exercise` | Mobile: List + Filter Sheet<br>Desktop: Filter Bar + Split-pane Detail |
| **8. Settings & Data** | `/(tabs)/settings` | สลับ Theme (`Dark` / `Light`), Default Unit (`kg` / `lbs`), Default Rest Timer, ตั้งค่าน้ำหนักบาร์เบล & แผ่นน้ำหนักที่มี, สถานะ Sync + ปุ่ม `Sync Now`, ปุ่ม `Export JSON`, `Export CSV`, `Import JSON/CSV`, Log Out | Card-based Settings List |

### 3.3 Design System & Theme Tokens
- **Dark Mode (Default — Gym & AMOLED Friendly):**
  - Background: `#0B0F14` (Deep Slate Black)
  - Surface / Card: `#151B23` / `#1E2631`
  - Border: `#2A3441`
  - Primary Text: `#F3F4F6`, Secondary Text: `#9CA3AF`
  - Primary Accent: `#3B82F6` (Electric Blue — ปุ่มหลัก / Active Tab / Rest Timer)
  - Success (Completed Set): `#10B981` (Emerald Green — พื้นหลังแถว Set เมื่อติ๊ก `✓` จะไฮไลต์สีเขียวจางๆ เหมือน Hevy)
- **Light Mode:**
  - Background: `#F8FAFC`, Surface: `#FFFFFF`, Border: `#E2E8F0`, Primary Text: `#0F172A`, Secondary Text: `#64748B`
- **Set Type Badges (ใช้สีเดียวกันทั้ง 2 ธีมเพื่อความคุ้นเคย):**
  - `Warm-up (W)`: Amber `#F59E0B`
  - `Normal (1, 2, ...)`: Neutral Text
  - `Drop Set (D)`: Purple `#A855F7`
  - `Failure (F)`: Red `#EF4444`

---

## 4. โครงสร้างข้อมูล (Data Model / Schema)

ตารางทั้งหมดใช้ **UUID v4** เป็น Primary Key (สร้างจากฝั่ง Client เพื่อให้สร้างข้อมูลตอน Offline ได้ทันที) และใช้ชุดคอลัมน์ Sync มาตรฐาน (`updated_at`, `deleted_at`) ในทุกตารางที่ต้องซิงค์กับ Supabase

### 4.1 Entity Relationship Overview
```text
user_settings (1:1 per user)
routine_folders (1) ──< (N) routines
routines (1) ──< (N) routine_exercises >── (1) exercises
routine_exercises (1) ──< (N) routine_sets
workouts (1) ──< (N) workout_exercises >── (1) exercises
workout_exercises (1) ──< (N) workout_sets
```

### 4.2 ตารางข้อมูลหลัก (Supabase PostgreSQL & Local SQLite Cache)

#### 1) `user_settings`
| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` (PK, FK → `auth.users`) | 1 แถวต่อผู้ใช้ |
| `theme` | `text` (`'dark' \| 'light'`) | Default: `'dark'` |
| `default_weight_unit` | `text` (`'kg' \| 'lbs'`) | Default: `'kg'` |
| `default_rest_seconds` | `integer` | Default: `90` |
| `barbell_weight_kg` | `numeric(5,2)` | Default: `20` |
| `barbell_weight_lbs` | `numeric(5,2)` | Default: `45` |
| `available_plates_kg` | `jsonb` | Default: `[25, 20, 15, 10, 5, 2.5, 1.25]` |
| `available_plates_lbs` | `jsonb` | Default: `[45, 35, 25, 10, 5, 2.5]` |
| `updated_at` | `timestamptz` | Sync timestamp |

#### 2) `exercises`
> **Seed Strategy:** ท่าพื้นฐานจาก `free-exercise-db` (~150–300 ท่ายอดนิยม หรือครบชุดที่คัดแล้ว) จะถูก Seed ด้วย Deterministic UUID (`user_id = NULL`, `is_custom = false`) และฝังไฟล์ Seed JSON ไว้ในแอปด้วย เพื่อให้ใช้งาน Offline ได้ตั้งแต่เปิดแอปครั้งแรก
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (nullable, FK) | `NULL` = System exercise, มีค่า = Custom exercise |
| `name` | `text` (not null) | ชื่อท่า (เช่น `Barbell Bench Press`) |
| `primary_muscle` | `text` (not null) | เช่น `chest`, `back`, `quads`, `hamstrings`, `shoulders`, `biceps`, `triceps`, `core`, `calves`, `glutes`, `forearms` |
| `secondary_muscles` | `jsonb` (`text[]`) | กลุ่มกล้ามเนื้อรอง |
| `equipment` | `text` (not null) | `barbell`, `dumbbell`, `cable`, `machine`, `bodyweight`, `kettlebell`, `bands`, `other` |
| `instructions` | `jsonb` (`text[]`) | ขั้นตอนการเล่น |
| `media_url` | `text` (nullable) | ลิงก์ภาพนิ่ง/GIF หรือวิดีโออ้างอิง |
| `is_custom` | `boolean` | Default: `false` |
| `preferred_weight_unit` | `text` (nullable) | `NULL` = ใช้ค่า Default ของแอป, หรือบังคับ `'kg' \| 'lbs'` เฉพาะท่านี้ |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `deleted_at` | `timestamptz` (nullable) | Soft delete สำหรับ Sync |

#### 3) `routine_folders`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK) | |
| `name` | `text` (not null) | เช่น `Hypertrophy PPL`, `Strength` |
| `sort_order` | `integer` | ลำดับการแสดงผล |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | |

#### 4) `routines`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK) | |
| `folder_id` | `uuid` (nullable, FK → `routine_folders`) | |
| `name` | `text` (not null) | เช่น `Push A`, `Upper Body` |
| `notes` | `text` (nullable) | |
| `sort_order` | `integer` | |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | |

#### 5) `routine_exercises`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK) | ใส่เพื่อทำ RLS ตรงๆ ได้ง่าย |
| `routine_id` | `uuid` (FK → `routines`) | |
| `exercise_id` | `uuid` (FK → `exercises`) | |
| `sort_order` | `integer` | ลำดับท่าในตาราง |
| `rest_seconds` | `integer` (nullable) | เวลาพักเฉพาะท่าในตารางนี้ |
| `notes` | `text` (nullable) | โน้ตประจำท่า (เช่น `Pause 1s at bottom`) |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | |

#### 6) `routine_sets`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK) | |
| `routine_exercise_id` | `uuid` (FK → `routine_exercises`) | |
| `set_number` | `integer` | 1, 2, 3... |
| `set_type` | `text` | `'warmup' \| 'normal' \| 'dropset' \| 'failure'` |
| `target_weight` | `numeric(7,2)` (nullable) | น้ำหนักเป้าหมาย (ถ้ากำหนด) |
| `target_reps` | `integer` (nullable) | เช่น `8` หรือใช้ควบคู่ `target_reps_max` |
| `target_reps_max` | `integer` (nullable) | รองรับช่วง reps เช่น `8-12` |
| `target_rpe` | `numeric(3,1)` (nullable) | เช่น `8.5` |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | |

#### 7) `workouts`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK) | |
| `routine_id` | `uuid` (nullable, FK → `routines`) | อ้างอิง Routine ต้นทาง (ถ้ามี) |
| `name` | `text` (not null) | ชื่อ Session |
| `notes` | `text` (nullable) | |
| `started_at` | `timestamptz` (not null) | เวลาเริ่มเล่น |
| `finished_at` | `timestamptz` (not null) | เวลาจบ |
| `duration_seconds` | `integer` (not null) | ระยะเวลารวม |
| `total_volume_kg` | `numeric(10,2)` | สรุป Volume รวม (คำนวณเป็น kg มาตรฐานเพื่อเทียบสถิติ) |
| `total_sets` | `integer` | จำนวนเซตที่ติ๊ก `is_completed = true` |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | |

#### 8) `workout_exercises`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK) | |
| `workout_id` | `uuid` (FK → `workouts`) | |
| `exercise_id` | `uuid` (FK → `exercises`) | |
| `sort_order` | `integer` | |
| `weight_unit` | `text` (`'kg' \| 'lbs'`) | หน่วยที่ใช้จริงใน Session นี้ |
| `rest_seconds` | `integer` (nullable) | |
| `notes` | `text` (nullable) | |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | |

#### 9) `workout_sets`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK) | |
| `workout_exercise_id` | `uuid` (FK → `workout_exercises`) | |
| `set_number` | `integer` | |
| `set_type` | `text` | `'warmup' \| 'normal' \| 'dropset' \| 'failure'` |
| `weight` | `numeric(7,2)` | ค่าที่ยกจริงตาม `weight_unit` ของ `workout_exercises` |
| `reps` | `integer` | จำนวนครั้ง |
| `rpe` | `numeric(3,1)` (nullable) | ช่วง `6.0 - 10.0` |
| `is_completed` | `boolean` | Default: `true` สำหรับประวัติที่บันทึกแล้ว |
| `completed_at` | `timestamptz` (nullable) | |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | |

### 4.3 Local-Only Metadata (ไม่อยู่บน Supabase)
- **`sync_metadata` (SQLite/Web Storage):** เก็บ `last_synced_at`, `sync_status` (`pending` / `synced` / `error`) ต่อ Record และรายการ Queue
- **`active_workout_draft` (SQLite/Web Storage):** เก็บ JSON state ของ Workout ที่กำลังเล่นอยู่ + `rest_timer_end_at` + `scheduled_notification_id`

### 4.4 Previous Value Lookup Query
เมื่อเปิดท่า `exercise_id` ใน Active Workout:
- Query จาก Local DB หา `workout_exercises` ล่าสุดของ `exercise_id` นั้นจาก `workouts` ที่ `deleted_at IS NULL` เรียงตาม `workouts.started_at DESC LIMIT 1`
- จับคู่ Set ตาม `set_number` (เฉพาะ Set ที่ `is_completed = true`) เพื่อแสดงคอลัมน์ `Previous` (เช่น `80 kg × 8` หรือแปลงหน่วยอัตโนมัติถ้าผู้ใช้สลับหน่วย)

---

## 5. โครงสร้างโฟลเดอร์โค้ด (Code Structure)

ใช้ **Expo (TypeScript) + Expo Router** แยก Layer ชัดเจนเพื่อให้โค้ดดูแลง่ายและรองรับ Cross-platform (`Android` + `Expo Web`):

```text
LiftOS/
├── app/                          # Expo Router (File-based Routing)
│   ├── _layout.tsx               # Root Provider (Theme, Auth, DB Init, Sync Listener)
│   ├── (auth)/
│   │   └── login.tsx             # หน้า Login / Sign Up (Supabase Auth)
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Responsive Nav (Bottom Tabs บน Mobile / Sidebar บน Desktop)
│   │   ├── index.tsx             # Workouts Hub & Routines
│   │   ├── history.tsx           # Workout History (Master-Detail บน Desktop)
│   │   ├── exercises.tsx         # Exercise Library & Filter
│   │   └── settings.tsx          # Settings, Theme, Units, Sync, Import/Export
│   ├── routine/
│   │   └── [id].tsx              # Routine Builder (สร้าง/แก้ไข Routine)
│   ├── workout/
│   │   └── active.tsx            # Active Workout Logger (Modal/Full-screen)
│   ├── history/
│   │   └── [id].tsx              # Workout Detail (สำหรับ Mobile)
│   └── exercises/
│       └── [id].tsx              # Exercise Detail & History
│
├── src/
│   ├── types/                    # TypeScript interfaces ตรงตาม Data Model
│   │   ├── database.ts           # Entity types (Exercise, Routine, Workout, Set)
│   │   └── settings.ts           # UserSettings, Theme, WeightUnit
│   │
│   ├── constants/                # ค่าคงที่และข้อมูลเริ่มต้น
│   │   ├── theme.ts              # Color tokens (Dark/Light), Spacing, Typography
│   │   ├── plates.ts             # มาตรฐานแผ่นน้ำหนัก kg/lbs และสีแผ่นบาร์เบล
│   │   └── seedExercises.json    # คลังท่าพื้นฐานจาก free-exercise-db
│   │
│   ├── lib/                      # Third-party clients & Platform abstractions
│   │   ├── supabase.ts           # Supabase client + Auth storage adapter
│   │   ├── notifications.ts      # Wrapper สำหรับ Rest Timer (expo-notifications on Android / Web Audio+Notification on Web)
│   │   └── storage/              # Cross-platform Local DB Abstraction
│   │       ├── interface.ts      # LocalDatabase interface (CRUD + Sync queries)
│   │       ├── sqlite.native.ts  # Implementation ด้วย expo-sqlite สำหรับ Android
│   │       ├── web.web.ts        # Implementation ด้วย IndexedDB / localForage สำหรับ Expo Web
│   │       └── migrations.ts     # Schema creation & seed loader
│   │
│   ├── services/                 # Business Logic & External IO
│   │   ├── syncEngine.ts         # Push Outbox → Pull Delta (Last-Write-Wins)
│   │   ├── workoutService.ts     # บันทึก Workout, คำนวณ Volume, ดึง Previous Value
│   │   ├── routineService.ts     # จัดการ Routines & Folders
│   │   ├── exerciseService.ts    # ค้นหา/กรองท่า & สร้าง Custom Exercise
│   │   └── portabilityService.ts # Export/Import JSON & CSV (รองรับ Hevy CSV mapping)
│   │
│   ├── stores/                   # State Management (Zustand)
│   │   ├── useAuthStore.ts       # User session & sync status
│   │   ├── useSettingsStore.ts   # Theme, default unit, plates, default rest
│   │   └── useActiveWorkoutStore.ts # Active workout state + Rest timer + Auto-draft persistence
│   │
│   ├── utils/                    # Pure helper functions (Unit-testable)
│   │   ├── plateCalculator.ts    # คำนวณแผ่นน้ำหนักต่อข้าง (kg/lbs)
│   │   ├── unitConversion.ts     # แปลง kg ↔ lbs และคำนวณ Volume
│   │   ├── formatters.ts         # Format เวลา (mm:ss), วันที่, ตัวเลข
│   │   └── uuid.ts               # Client-side UUID generator
│   │
│   └── components/               # Reusable UI Components
│       ├── ui/                   # Base primitives (Button, Card, Input, Badge, ModalSheet)
│       ├── layout/               # ResponsiveShell, SidebarNav, MiniWorkoutBar
│       ├── workout/              # ExerciseCard, SetRow, SetTypeBadge, RestTimerBar, PlateCalculatorModal
│       ├── routine/              # RoutineCard, RoutineExerciseEditor
│       └── exercise/             # ExercisePicker, CustomExerciseModal, MuscleFilterChips
│
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql # SQL DDL + RLS Policies + Indexes สำหรับ Supabase
│
├── docs/                         # Project Planning & Architecture Docs
├── app.json / app.config.ts      # Expo config (Permissions: Notifications, Android package)
├── eas.json                      # EAS Build config สำหรับสร้าง .apk
└── package.json
```

---

## 6. Key Technical Considerations (ความเสี่ยงและจุดที่ต้องระวัง)

1. **Android Background Rest Timer:**
   - ห้ามพึ่ง `setInterval` ใน JS อย่างเดียวเวลาพับหน้าจอ เพราะ Android จะหยุดการทำงานของ JS Thread
   - **วิธีแก้:** เก็บ `restEndTime` เป็น Unix timestamp (`Date.now() + seconds * 1000`), เมื่อแอปกลับมา Foreground ให้คำนวณเวลาที่เหลือจาก `restEndTime - Date.now()`, และใช้ `expo-notifications` ตั้งเวลาแจ้งเตือนล่วงหน้าทันทีที่เริ่มนับถอยหลัง (ยกเลิกและตั้งใหม่เมื่อกด `-15s` / `+15s` / `Skip`) พร้อมตั้งค่า Android Notification Channel ที่มีความสำคัญสูง (`HIGH` / `MAX`)
2. **Expo SQLite on Web vs Native:**
   - แยก File extension `.native.ts` และ `.web.ts` ภายใต้ `src/lib/storage/` เพื่อให้ Metro Bundler เลือกใช้ `expo-sqlite` บน Android และ IndexedDB บน Web โดยไม่ติด Error ตอน Compile หรือ Run บนเบราว์เซอร์
3. **In-Gym Input UX:**
   - ช่องกรอก `Weight` และ `Reps` บนมือถือควรใช้ `keyboardType="decimal-pad"` / `"number-pad"`, Auto-select ข้อความเมื่อโฟกัสเพื่อพิมพ์ทับได้ทันทีไม่ต้องกดลบ, และมีขนาดปุ่มติ๊ก `✓` อย่างน้อย `44×44 dp`
