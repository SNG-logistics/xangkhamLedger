# 🐘 XANGKHAM Ledger (ระบบบัญชีช้างคำ)

ระบบบริหารจัดการบัญชีหวยพัฒนา (ลาว) แบบครบวงจร รองรับการจัดการงวด, รายรับ-รายจ่าย, กระแสเงินสด และรายงานสรุปผล

---

## ✨ ฟีเจอร์หลัก (Features)

### 1. ระบบจัดการงวด (Period Management)
- **Auto Creation**: สร้างงวดใหม่อัตโนมัติ (เฉพาะ จันทร์, พุธ, ศุกร์)
- **Backfill Mode**: โหมดพิเศษสำหรับสร้างงวดย้อนหลัง (Admin Only)
- **Lock/Unlock**: ล็อกงวดเพื่อป้องกันการแก้ไขข้อมูลเมื่อปิดยอด
- **Balance Carry Over**: ยกยอดคงเหลือจากงวดล่าสุดไปงวดถัดไปอัตโนมัติ

### 2. บันทึกรายรับ-รายจ่าย (Income & Expenses)
- **Income (ยอดขาย)**: บันทึกยอดขายหวย (LAK)
- **Expenses (ค่าใช้จ่าย)**: บันทึกค่าใช้จ่ายต่างๆ แบ่งหมวดหมู่ได้
- **Currency Support**: รองรับ 2 สกุลเงิน (LAK, THB)
- **Money Format**: แสดงผลตัวเลขแบบมีคอมมา (e.g. 1,000.00)

### 3. รายงานและสรุปผล (Reports)
- **Dashboard**: แสดงภาพรวมสถานะการเงินแต่ละงวด
- **Monthly Report**: รายงานสรุปรายเดือน พร้อม Print View ที่สวยงาม
- **Audit Log**: บันทึกประวัติการแก้ไขข้อมูลทุกขั้นตอน (Who, What, When)

---

## 🛠️ การติดตั้งและเริ่มต้นใช้งาน (Installation)

### 1. Prerequisites
- **Node.js** (v14 หรือสูงกว่า)
- **MySQL Server**

### 2. Clone & Install
```bash
# ติดตั้ง Library ที่จำเป็น
npm install
```

### 3. ตั้งค่า Database
1. สร้าง Database ชื่อ `changkhum_ledger` (หรือชื่ออื่นตามต้องการ)
2. แก้ไขไฟล์ `.env` (copy จาก `.env.example`)
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=changkhum_ledger
   ```
3. **รันคำสั่งสร้างตาราง (Migration)**:
   ```bash
   # คำสั่งนี้จะสร้างตารางทั้งหมดที่จำเป็น
   node scripts/force_schema_update.js
   
   # คำสั่งนี้สำหรับอัปเดตตาราง Audit (ถ้ามี Error เรื่อง old_value)
   node scripts/update_audit_schema.js
   ```

### 4. สร้าง User คนแรก (Super Admin)
```bash
node src/scripts/seed.js
```
*Default User*: `admin` / `admin123`

### 5. Start Server
```bash
npm run dev
```
เข้าใช้งานได้ที่: [http://localhost:3000](http://localhost:3000)

---

## 📖 คู่มือการใช้งาน (User Manual)

### 1. การสร้างงวด (New Period)
- กดปุ่ม **+ New Period**
- เลือกวันที่ต้องการ (ระบบบังคับ จันทร์, พุธ, ศุกร์ เท่านั้น)
- หากต้องการสร้างงวดเก่า -> ให้เปิดสวิตซ์ **Backfill Mode** ด้านบนก่อน

### 2. การล็อกงวด (Lock Period)
- เมื่อตรวจสอบข้อมูลครบถ้วน กดปุ่ม **🔒 Lock**
- **เงื่อนไข**: ต้องล็อกเรียงตามลำดับเวลา (งวดเก่าต้องล็อกก่อนงวดใหม่)
- **Override**: ถ้ายอดเงินติดลบ ระบบจะเตือนแต่สามารถ Force Lock ได้ (ต้องใส่เหตุผล)

### 3. การแจ้งปัญหา (Incident Report)
- กดปุ่ม **⚠️ แจ้งเคส** ในหน้ารายการงวด หรือหน้า Detail
- ระบุความรุนแรง (Low/Medium/High/Critical)
- **Critical Incident** จะทำให้ล็อกงวดไม่ได้ จนกว่าจะได้รับการแก้ไข

---

## 🔧 Troubleshooting (การแก้ปัญหาเบื้องต้น)

### Q: เจอ Error `Unknown column 'old_value'` ใน Audit Log?
**A:** ให้รันคำสั่ง update schema ใน Terminal:
```bash
node scripts/update_audit_schema.js
```

### Q: ปุ่ม Backfill กดไม่ได้?
**A:** ลอง Refresh หน้าจอ หรือตรวจสอบว่า Server รันอยู่หรือไม่

### Q: อยากล้างข้อมูลทั้งหมดแล้วเริ่มใหม่?
**A:** ลบ Database แล้วสร้างใหม่ จากนั้นรัน scripts ตามข้อ 3 อีกครั้ง

---

📌 **Developed for XANGKHAM Ledger Project**
