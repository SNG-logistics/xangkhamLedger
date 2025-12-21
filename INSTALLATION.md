# 🚀 คู่มือการติดตั้ง - CHANGKHUM LEDGER

**ระบบบัญชีหวยครบวงจร สำหรับธุรกิจในสปป.ลาว**

---

## ✅ สเปคของระบบ

### เทคโนโลยี
- **Backend**: Node.js + Express
- **View**: EJS (Server-Side Rendering)
- **Database**: MySQL
- **File Upload**: express-fileupload
- **Auth**: Session-based
- **CSS**: Vanilla CSS (ไม่ใช้ Framework)
- **JS**: Vanilla JavaScript

### ฟีเจอร์ทางธุรกิจ
- ✅ **ระบบตัดรอบบัญชี (Rolling Settlement)**: ตัดรอบ 20:00 น.
- ✅ **ล็อก/ปลดล็อกงวด**: ควบคุมโดย SUPER_ADMIN
- ✅ **คำนวณงวดอัตโนมัติ**: สำหรับค่าใช้จ่ายต่างๆ
- ✅ **Audit Log**: เก็บประวัติการใช้งานแบบแก้ไขไม่ได้
- ✅ **สรุปยอดขาย**: พร้อมระบบแนบไฟล์
- ✅ **ยอดเงินธนาคาร**: รองรับ BCEL/LDB/JDB และอื่นๆ
- ✅ **Auto GL**: สร้างรายการบัญชีอัตโนมัติเมื่อล็อกงวด
- ✅ **รายงาน**: รายงวดและรายเดือน
- ✅ **RBAC**: ระบบจัดการสิทธิ์ผู้ใช้งาน

---

## 📦 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: ติดตั้ง Dependencies

```bash
cd changkhum-ledger
npm install
```

### ขั้นตอนที่ 2: ตั้งค่าฐานข้อมูล MySQL

**การติดตั้ง MySQL Installer (Windows):**
1. ในหน้า **Type and Networking**:
   - Config Type: เลือก **Development Computer**
   - Connectivity: เลือก **TCP/IP** และ Port **3306**
2. ในหน้า **Accounts and Roles**:
   - ตั้ง **Root Password** (จำรหัสนี้ไว้ให้ดี!)
3. กด Next ไปจนเสร็จสิ้น

เมื่อติดตั้งเสร็จแล้ว ให้สร้าง Database:
```sql
CREATE DATABASE changkhum_ledger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

นำเข้าตารางและข้อมูล:
```bash
mysql -u root -p changkhum_ledger < sql/001_schema.sql
mysql -u root -p changkhum_ledger < sql/002_seed_superadmin.sql
```

หรือใช้ Windows Command Prompt:
```cmd
mysql -u root -p changkhum_ledger < "sql\001_schema.sql"
mysql -u root -p changkhum_ledger < "sql\002_seed_superadmin.sql"
```

### ขั้นตอนที่ 3: ตั้งค่า Environment

ไฟล์ `.env` ถูกสร้างไว้แล้วด้วยค่าเริ่มต้น:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=changkhum_ledger
DB_PORT=3306

PORT=3000
SESSION_SECRET=changkhum-super-secret-key-change-this
```

**สิ่งที่ต้องแก้ไข (ถ้าจำเป็น):**
- `DB_PASSWORD` - รหัสผ่าน MySQL ของคุณ
- `SESSION_SECRET` - เปลี่ยนเป็นข้อความสุ่มเพื่อความปลอดภัย

### ขั้นตอนที่ 4: รันเซิร์ฟเวอร์

```bash
npm run dev
```

หรือ:
```bash
node src/server.js
```

### ขั้นตอนที่ 5: เข้าใช้งานระบบ

เปิดเบราว์เซอร์ไปที่:
```
http://localhost:3000
```

**รหัสผ่านเริ่มต้น:**
- Username: `admin`
- Password: `admin123`

⚠️ **สำคัญ**: กรุณาเปลี่ยนรหัสผ่านทันทีหลังเข้าใช้งานครั้งแรก!

---

## 🗂️ โครงสร้างไฟล์

(อ้างอิงจาก README.md)

---

## 🔑 ฟีเจอร์สำคัญ

### 1. การตัดรอบบัญชี (Rolling Settlement)
- ค่าใช้จ่ายจะถูกปัดไปงวดถัดไปอัตโนมัติถ้าเกิดหลัง 20:00 น.
- ใช้ `timeRule.js` ในการคำนวณ

### 2. ระบบ Lock/Unlock
- เฉพาะ SUPER_ADMIN เท่านั้น
- **เมื่องวดถูกล็อก**:
  - ❌ แก้ไขยอดขาย/ค่าใช้จ่ายไม่ได้
  - ✅ ปลดล็อกได้โดย SUPER_ADMIN (ต้องระบุเหตุผล)
  - 🔒 แสดงแบนเนอร์สีแดงแจ้งเตือน
- **เมื่อสั่งล็อก**:
  - สร้างรายการบัญชี (Auto GL)
  - บันทึกการล็อกในตาราง `period_lock_events`
  - บันทึก Audit Log

### 3. ระบบตรวจสอบ (Audit Trail)
- **บันทึกทุกกิจกรรมสำคัญ**: Login, Lock, แก้ไขข้อมูลการเงิน
- **แก้ไขไม่ได้** (Append-only)
- **เก็บพข้อมูล**: User, Action, ข้อมูลก่อน/หลัง, เหตุผล, IP

### 4. รายงานครบถ้วน
- **รายงวด**: ยอดขาย, ค่าใช้จ่าย, กำไร/ขาดทุน, ยอดธนาคาร
- **รายเดือน**: ภาพรวมทั้งเดือน
- **พิมพ์ได้**: ออกแบบมาสำหรับการสั่งพิมพ์

### 5. การแสดงผลเงิน
- จัดรูปแบบอัตโนมัติ: `1,000,000.00`
- รองรับ 2 สกุลเงิน (LAK/THB)

---

## 🎯 เวิร์กโฟลว์การใช้งาน

### 1. เข้าสู่ระบบ
- Login ด้วย `admin` / `admin123`

### 2. สร้างงวด
- ไปที่ "จัดการงวด" -> "สร้างงวดใหม่" -> เลือกวันที่

### 3. บันทึกยอดขาย
- เลือกงวด -> "บันทึกยอดขาย" -> กรอกยอด LAK/THB -> แนบไฟล์

### 4. เพิ่มค่าใช้จ่าย
- หน้ารายละเอียดงวด -> "+ เพิ่มค่าใช้จ่าย"
- ระบบคำนวณงวดบัญชีให้อัตโนมัติจากเวลาที่เกิด

### 5. บันทึกยอดธนาคาร
- เลือก "จัดการยอดเงิน" -> ใส่ยอดแต่ละบัญชี

### 6. ล็อกงวด (สิ้นวัน)
- กด "🔒 LOCK งวด"
- **ต้องใส่เหตุผล**
- ระบบจะสร้างรายการบัญชีและล็อกข้อมูล

### 7. ดูรายงาน
- กด "📊 รายงานงวดนี้" หรือเมนู "รายงานรายเดือน"

---

## 🛡️ ความปลอดภัย

- ✅ รหัสผ่านเข้ารหัสด้วย bcrypt
- ✅ ตรวจสอบสิทธิ์ทุกการเข้าถึง (RBAC)
- ✅ บังคับใส่เหตุผลเมื่อมีการล็อก/ปลดล็อก
- ✅ เก็บ Log การใช้งานละเอียด

---

## 🔧 การแก้ปัญหาเบื้องต้น

### เชื่อมต่อฐานข้อมูลไม่ได้
1. เช็คว่า MySQL รันอยู่ (`mysql -u root -p`)
2. เช็คชื่อ Database `changkhum_ledger`
3. เช็คไฟล์ `.env`

### ติดตั้ง npm ไม่ผ่าน
1. เช็ค Node.js version (`node -v`)
2. ลอง `npm cache clean --force` แล้ว install ใหม่

### รหัสผ่าน admin ใช้ไม่ได้
รันโค้ดนี้เพื่อสร้าง hash ใหม่:
```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('admin123', 10, (err, hash) => console.log(hash));
```
แล้วนำไป update ในฐานข้อมูล

---

**สถานะ: ✅ พร้อมใช้งาน 100%**
