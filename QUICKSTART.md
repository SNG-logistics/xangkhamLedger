# 🚀 QUICK START GUIDE

## สำหรับผู้ใช้งาน - เริ่มต้นใช้งานภายใน 5 นาที

### ขั้นตอนที่ 1: ติดตั้ง Dependencies (2 นาที)

เปิด Command Prompt และรันคำสั่ง:

```bash
cd "C:\Users\acer\OneDrive\เดสก์ท็อป\บัญชีช้างคำ\changkhum-ledger"
npm install
```

รอจนติดตั้งเสร็จ...

---

### ขั้นตอนที่ 2: สร้าง Database (1 นาที)

เปิด MySQL และรันคำสั่งต่อไปนี้:

```sql
CREATE DATABASE changkhum_ledger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit
```

จากนั้น import schema:

```bash
mysql -u root -p changkhum_ledger < "C:\Users\acer\OneDrive\เดสก์ท็อป\บัญชีช้างคำ\changkhum-ledger\sql\001_schema.sql"

mysql -u root -p changkhum_ledger < "C:\Users\acer\OneDrive\เดสก์ท็อป\บัญชีช้างคำ\changkhum-ledger\sql\002_seed_superadmin.sql"
```

**หมายเหตุ:** ถ้า MySQL ของคุณมี password ให้ใส่เมื่อถาม

---

### ขั้นตอนที่ 3: ตั้งค่า Database (30 วินาที)

ไฟล์ `.env` ถูกสร้างไว้แล้ว แต่ถ้า MySQL ของคุณมี password:

1. เปิดไฟล์ `.env`
2. แก้ไข: `DB_PASSWORD=YOUR_MYSQL_PASSWORD`
3. บันทึก

---

### ขั้นตอนที่ 4: เริ่มระบบ (30 วินาที)

```bash
npm run dev
```

คุณจะเห็นข้อความ:
```
╔═══════════════════════════════════════════╗
║   Changkhum Ledger - Server Started!     ║
╠═══════════════════════════════════════════╣
║   Port: 3000                              ║
║   URL: http://localhost:3000              ║
║                                           ║
║   Default Login:                          ║
║   Username: admin                         ║
║   Password: admin123                      ║
╚═══════════════════════════════════════════╝
```

---

### ขั้นตอนที่ 5: เข้าสู่ระบบ (1 นาที)

1. เปิดเบราว์เซอร์
2. ไปที่: **http://localhost:3000**
3. Login:
   - Username: `admin`
   - Password: `admin123`

✨ **เสร็จสิ้น!** คุณพร้อมใช้งานแล้ว

---

## 📚 การใช้งานเบื้องต้น

### สร้างงวดหวยใหม่

1. คลิก **"จัดการงวด"** ที่ Sidebar
2. คลิก **"สร้างงวดใหม่"**
3. เลือกวันที่งวด เช่น 25/12/2025
4. คลิก **"สร้าง"**

### บันทึกยอดขาย

1. คลิกที่งวดที่ต้องการ
2. คลิก **"บันทึกยอดขาย"**
3. กรอก:
   - ยอดขาย LAK
   - ยอดขาย THB
   - แนบไฟล์ (ถ้ามี)
4. คลิก **"บันทึก"**

### เพิ่มค่าใช้จ่าย

1. ในหน้ารายละเอียดงวด คลิก **"+ เพิ่มค่าใช้จ่าย"**
2. กรอก:
   - เวลาเกิดจริง (วันที่ + เวลา)
   - ประเภท (เช่น ค่าคอมฯ, ค่าเดินทาง)
   - จำนวน LAK/THB
3. ระบบจะคำนวณงวดที่นับอัตโนมัติ
4. คลิก **"บันทึก"**

### ล็อกงวด

1. เมื่อกรอกข้อมูลครบแล้ว คลิก **"🔒 LOCK งวด"**
2. **ต้องใส่เหตุผล!** เช่น "สรุปงวดตามปกติ"
3. คลิก OK
4. ระบบจะ:
   - ล็อกงวด
   - สร้าง Journal อัตโนมัติ
   - บันทึก Audit Log

### ดูรายงาน

- **รายงานรายงวด:** คลิก **"📊 รายงานงวดนี้"**
- **รายงานรายเดือน:** ไปที่ **"รายงานรายเดือน"** → เลือกเดือน/ปี

### ดู Audit Log

- ไปที่ **"Audit Log"** ที่ Sidebar
- ดูประวัติ Lock/Unlock
- ดูการเปลี่ยนแปลงทั้งหมด

---

## ⚠️ ข้อควรระวัง

### งวดที่ LOCK แล้ว
- **ไม่สามารถแก้ไขข้อมูลได้**
- ต้องให้ SUPER_ADMIN **UNLOCK** ก่อน (พร้อมใส่เหตุผล)
- หลัง UNLOCK จึงแก้ไขได้

### Rolling Settlement
- ค่าใช้จ่ายจะถูกนับในงวด**ถัดไป**
- ขึ้นอยู่กับเวลาเกิดจริง (occurred_at)
- ตัดรอบที่ 20:00 น.

---

## 🆘 แก้ปัญหาเบื้องต้น

### ปัญหา: npm install ไม่สำเร็จ
**แก้:** 
```bash
npm cache clean --force
npm install
```

### ปัญหา: เชื่อมต่อ database ไม่ได้
**แก้:** ตรวจสอบ
1. MySQL เปิดอยู่หรือไม่
2. ไฟล์ `.env` ตั้งค่าถูกต้องหรือไม่
3. Database `changkhum_ledger` สร้างแล้วหรือยัง

### ปัญหา: Login ไม่ได้
**แก้:** 
- Username: `admin` (ตัวพิมพ์เล็ก)
- Password: `admin123`
- ตรวจสอบว่า import `002_seed_superadmin.sql` แล้วหรือยัง

---

## 📁 ไฟล์สำคัญ

- `README.md` - ภาพรวมระบบ
- `INSTALLATION.md` - คู่มือติดตั้งแบบละเอียด
- `.env` - ตั้งค่าระบบ
- `sql/001_schema.sql` - Database schema
- `sql/002_seed_superadmin.sql` - User admin

---

## ✅ ระบบพร้อมใช้งาน 100%

**คุณสมบัติครบ:**
- ✅ ระบบบัญชีแบบ Rolling Settlement
- ✅ Lock/Unlock งวดพร้อม Audit
- ✅ บันทึกยอดขาย + อัปโหลดไฟล์
- ✅ บันทึกค่าใช้จ่าย (auto period)
- ✅ จัดการยอดธนาคาร
- ✅ รายงานรายงวด + รายเดือน
- ✅ Audit Log ครบถ้วน

**ข้อมูล Login:**
- URL: http://localhost:3000
- Username: admin
- Password: admin123

---

**หากต้องการรายละเอียดเพิ่มเติม:**
- อ่าน `INSTALLATION.md` - คู่มือแบบละเอียด
- ดู Code comments - มีอธิบายในโค้ด

**สนุกกับการใช้งาน! 🎉**
