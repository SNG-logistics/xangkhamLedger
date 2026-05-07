# XANGKHAM Ledger (ช้างคำ เลดเจอร์)

ระบบบัญชีสำหรับธุรกิจขายหวยถูกกฎหมายในลาว
**Lottery Accounting System for Legal Lottery Business in Laos**

## เทคโนโลยีที่ใช้ (Tech Stack)

- **Backend**: Node.js + Express
- **View Engine**: EJS (Server-Side Rendering)
- **Database**: MySQL
- **File Upload**: multer / express-fileuploads
- **Auth**: Session-based
- **CSS**: Vanilla CSS (ไม่ใช้ Framework)
- **JS**: Vanilla JavaScript

## กฎทางธุรกิจ (Business Rules)

1. **เวลาออกผลรางวัล**: 20:00 น. (เวลาลาว)
2. **ปิดการขาย**: ก่อน 20:00 น.
3. **ระบบ Rolling Settlement**:
   - งวดที่สรุป = ยอดขายของงวดนี้ + ค่าใช้จ่ายที่เกิดหลังหวยออกงวดก่อน (20:00) จนถึงก่อน 20:00 ของงวดนี้
4. **การล็อกงวด (Period Lock)**:
   - งวดที่ LOCKED แล้ว ห้ามแก้ไขข้อมูล (ยกเว้น SUPER_ADMIN ต้อง UNLOCK ก่อน)

## การติดตั้ง (Installation)

### 1. ดาวน์โหลดและติดตั้ง

```bash
cd changkhum-ledger
npm install
```

### 2. ตั้งค่า Environment

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ให้ตรงกับข้อมูล database ของคุณ

### 3. สร้าง Database และ Import ข้อมูล

```sql
CREATE DATABASE changkhum_ledger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

นำเข้าโครงสร้างตารางและข้อมูลเริ่มต้น:

```bash
mysql -u root -p changkhum_ledger < sql/001_schema.sql
mysql -u root -p changkhum_ledger < sql/002_seed_superadmin.sql
```

### 4. รันเซิร์ฟเวอร์

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่: **http://localhost:3000**

## ข้อมูลเข้าสู่ระบบเริ่มต้น (Default Login)

- **Username**: `admin`
- **Password**: `admin123`

**⚠️ สำคัญ**: กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก!

## ฟีเจอร์หลัก (Features)

### 1. ระบบยืนยันตัวตน (Authentication)
- เข้าสู่ระบบ / ออกจากระบบ
- ระบบ Session

### 2. จัดการงวด (Period Management)
- จัดการงวดหวย (วันที่/เดือน/ปี)
- Lock/Unlock งวด (เฉพาะ SUPER_ADMIN)
- สถานะ: OPEN (เปิด) / LOCKED (ล็อก)

### 3. สรุปยอดขาย (Sales Summary)
- บันทึกยอดขาย LAK (กีบ) / THB (บาท)
- แนบไฟล์หลักฐาน (Excel/PDF/รูปภาพ)

### 4. ค่าใช้จ่าย (Expenses)
- เพิ่ม/แก้ไข/ลบค่าใช้จ่าย
- คำนวณงวดบัญชีอัตโนมัติตามเวลาที่เกิด (Rolling Settlement)
- Soft delete (ลบแบบกู้คืนได้ถ้าระบบรองรับ)

### 5. ยอดเงินธนาคาร (Bank Balances)
- แยกตามธนาคาร: BCEL / LDB / JDB / อื่นๆ
- แยกสกุลเงิน: LAK / THB

### 6. ระบบบัญชีอัตโนมัติ (Auto GL)
- สร้างรายการสมุดบัญชีรายวัน (Journal Entry) อัตโนมัติเมื่อสั่ง LOCK งวด

### 7. รายงาน (Reports)
- รายงานรายงวด (Period Report)
- รายงานสรุปรายเดือน (Monthly Report)

### 8. บันทึกการตรวจสอบ (Audit Log)
- บันทึกทุกกิจกรรมสำคัญ
- ตารางเก็บประวัติการ Lock/Unlock

## โครงสร้างไฟล์ (File Structure)

```
changkhum-ledger/
├── package.json
├── .env.example
├── README.md
├── sql/
│   ├── 001_schema.sql          # โครงสร้างฐานข้อมูล
│   └── 002_seed_superadmin.sql # ข้อมูลผู้ดูแลระบบเริ่มต้น
├── src/
│   ├── server.js               # ไฟล์หลักของ Server
│   ├── config/                 # การตั้งค่า Database
│   ├── middleware/             # ระบบ Auth, RBAC, Audit
│   ├── utils/                  # ฟังก์ชันคำนวณเงินและเวลา
│   ├── models/                 # Model เชื่อมต่อ Database
│   ├── controllers/            # Logic การทำงาน
│   ├── routes/                 # เส้นทาง URL
│   ├── views/                  # หน้าจอ EJS Templates
│   └── public/                 # ไฟล์ Static (CSS, JS, Uploads)
```

## ลิขสิทธิ์

MIT
