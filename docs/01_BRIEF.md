# 01 - Project Brief: LiftOS

> ใช้สำหรับแชทที่ 1: บรีฟงานให้ชัดเจนก่อนเริ่มออกแบบหรือเขียนโค้ด

## 1. ภาพรวมและเป้าหมาย (Overview & Goal)
- **LiftOS คืออะไร:** แอปพลิเคชันวางแผนและบันทึกการฝึกซ้อมเวทเทรนนิ่ง (Weightlifting / Bodybuilding) สำหรับใช้งานส่วนตัว โดยดึงต้นแบบฟีเจอร์และประสบการณ์ใช้งาน (UX) มาจากแอป **Hevy**
- **ปัญหาที่ต้องการแก้:**
  - แอปบันทึกเวททั่วไปมักจำกัดจำนวน Routine และช่วงเวลาย้อนหลังในแพ็กเกจฟรี (เช่น Hevy Free จำกัด 3–4 Routines)
  - ต้องการใช้งานได้ทั้งบน **มือถือ Android** (จดเซตไวๆ ในยิม + จับเวลาพักแม่นยำ) และ **คอมพิวเตอร์ (Web)** (วางแผนตารางฝึกซ้อมและดูสถิติบนหน้าจอกว้าง)
  - ต้องการเป็นเจ้าของข้อมูลการฝึกซ้อม 100% และต่อยอดฟีเจอร์ส่วนตัวได้ในอนาคต
- **กลุ่มผู้ใช้งาน (Target Users):** ใช้งานส่วนตัวคนเดียว (Single-user Personal App) โดยผู้พัฒนาไม่มีพื้นฐานการเขียนโค้ด (พัฒนาผ่าน AI-assisted Development)

## 2. ฟีเจอร์หลัก (Core Features - MVP)

### 2.1 การวางแผนและคลังท่า (Planning & Exercise Library)
- [ ] **Routine Builder:** สร้าง แก้ไข และจัดหมวดหมู่ตารางฝึกซ้อม (เช่น Push / Pull / Legs, Upper / Lower) ได้ไม่จำกัดจำนวน รองรับการใช้งานสะดวกบนคอมพิวเตอร์
- [ ] **Exercise Library:** คลังท่าออกกำลังกายพื้นฐาน พร้อมค้นหา/กรองตามกลุ่มกล้ามเนื้อและอุปกรณ์ (ใช้ฐานข้อมูล Open-source เช่น `free-exercise-db`) และสร้าง **Custom Exercise** เองได้ไม่จำกัด

### 2.2 การบันทึกการฝึกในยิม (Active Workout Logger)
- [ ] **Fast Workout Logging:** กดเริ่มฝึกจาก Routine หรือเริ่มแบบ Empty Workout, เพิ่ม/ลบ Set, กรอก Weight, Reps, RPE และโน้ตสั้นๆ
- [ ] **Set Types:** ระบุประเภท Set ได้ (`Warm-up`, `Normal`, `Drop Set`, `Failure`)
- [ ] **Previous Value Display:** แสดงค่า Weight × Reps ของครั้งล่าสุดในท่าเดียวกันข้างช่องกรอก พร้อมปุ่มลอกค่าอย่างรวดเร็วเพื่อทำ Progressive Overload
- [ ] **Automatic Rest Timer:** จับเวลาพักถอยหลังอัตโนมัติทันทีที่ติ๊กจบ Set พร้อมปุ่มปรับเวลาด่วน (`-15s` / `+15s` / `Skip`) และส่งเสียง/สั่นแจ้งเตือนผ่าน Local Notification แม้พับหน้าจอหรือสลับแอป
- [ ] **Plate Calculator:** เครื่องคำนวณจำนวนแผ่นน้ำหนักต่อข้างของบาร์เบลจากน้ำหนักรวมเป้าหมาย

### 2.3 ประวัติและการจัดการข้อมูล (History & Data Portability)
- [ ] **Workout History:** บันทึกประวัติการฝึกย้อนหลัง พร้อมสรุประยะเวลา, จำนวน Set และ Total Volume
- [ ] **Offline Resilience:** จดบันทึกบนมือถือ Android ได้แม้ไม่มีสัญญาณอินเทอร์เน็ตในยิม
- [ ] **Import / Export Data:** ส่งออกและนำเข้าข้อมูลเป็น JSON / CSV เพื่อสำรองข้อมูลหรือย้ายประวัติเก่า

### ฟีเจอร์ต่อยอดหลังจบ MVP (Phase 2+)
- กราฟพัฒนาการรายท่า (Estimated 1RM, Max Weight, Total Volume) และจำนวน Working Sets รายสัปดาห์แยกตามกลุ่มกล้ามเนื้อ
- ระบบตรวจจับสถิติใหม่ (Auto PR Detection) และปฏิทินการซ้อม
- บันทึกน้ำหนักตัว สัดส่วนร่างกาย (Body Measurements) และ Supersets
- ฟีเจอร์เฉพาะตัว เช่น กฎแนะนำการเพิ่มน้ำหนักอัตโนมัติ (Auto-Progression Rules) หรือ AI Coach วิเคราะห์สถิติ

## 3. เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend (Cross-platform Single Codebase):** **React Native + Expo (Expo Web)** เขียนโค้ดชุดเดียวรันได้ทั้งแอป Android แท้ๆ และหน้าเว็บสำหรับวางแผนบนคอมพิวเตอร์ (ใช้ TypeScript / JavaScript)
- **Backend / Database & Sync:** *(รอสรุปในขั้นตอนแรกของ Phase 02)*
  - **Option A (แนะนำ):** **Supabase (Free Tier)** + **Local Offline Cache** บนอุปกรณ์ — ซิงค์ตารางจากคอมเข้ามือถือ และส่งประวัติการฝึกจากมือถือกลับขึ้นคอมได้อัตโนมัติ
  - **Option B:** **Local Storage / SQLite + Import/Export JSON** — Offline 100% ไม่พึ่ง Cloud ภายนอก (โอนไฟล์ตารางเอง)
- **Testing & Deployment:**
  - ทดสอบบน Android ผ่าน **Expo Go** (สแกน QR Code)
  - Build ไฟล์ `.apk` บน Cloud ด้วย **Expo EAS Build** (ฟรี ไม่ต้องลง Android Studio หนักๆ บนคอม)
  - Web version รันผ่าน Local / Cloud Web Hosting (เช่น Vercel) ตามรูปแบบ Sync ที่เลือก

## 4. ขอบเขตและข้อจำกัด (Scope & Constraints)
- **สิ่งที่อยู่นอกขอบเขต (Out of Scope):**
  - ไม่มีระบบ Social Network (Feed, Follow เพื่อน, Like, Comment)
  - ไม่มีแอปแยกสำหรับ Smartwatch (Wear OS / Apple Watch)
  - ไม่มีแอนิเมชัน 3D ของท่าออกกำลังกาย (ใช้ภาพนิ่ง/GIF จาก Open-source หรือแนบลิงก์วิดีโอแทน)
  - ไม่รองรับการวิเคราะห์กีฬา Endurance / GPS (วิ่ง, ปั่นจักรยาน)
  - ไม่มี AI Workout Generator สร้างตารางอัตโนมัติเต็มรูปแบบใน MVP
- **ข้อจำกัดและข้อควรระวัง (Constraints):**
  - **Android-first:** โฟกัสการทดสอบและ Build ลง **Android** เท่านั้น (ไม่รองรับการ Publish/TestFlight บน iOS ในเฟสนี้)
  - **Background Rest Timer:** ต้องตั้งค่า Local Notification และทดสอบเรื่อง Battery Optimization ของ Android บนเครื่องจริงเพื่อให้แจ้งเตือนแม่นยำขณะพับหน้าจอ
  - **AI-assisted Workflow:** เน้นแบ่งงานเป็นขั้นย่อยๆ (Iterative MVP) เพื่อให้ทดสอบและแก้ไขได้ง่าย
