# คู่มือการนำขึ้น HostAtom (Deployment Guide)

คู่มือนี้จะแนะนำขั้นตอนการนำระบบ **XANGKHAM Ledger** ขึ้นใช้งานจริงบน HostAtom (หรือ Hosting อื่นๆ ที่ใช้ DirectAdmin / Plesk ที่รองรับ Node.js)

## สิ่งที่ต้องเตรียม
1. ไฟล์โปรเจค (Zip file) หรือ Git Repository
2. ข้อมูล Database
3. การตั้งค่าบน Hosting

---

## ขั้นตอนที่ 0: ตั้งค่า Domain Nameserver (สำหรับ xangkhamledger.com)

ก่อนเริ่มใช้งาน ให้ตั้งค่า Nameserver ของโดเมน `xangkhamledger.com` ให้ชี้มาที่ HostAtom ตามค่าที่ได้รับมาครับ:

1. ไปที่ผู้ให้บริการจดโดเมนของคุณ
2. แก้ไข **Nameservers** เป็น:
   - **NS1:** `sg5.hostatom.com` (IP: `15.235.154.180`)
   - **NS2:** `sg6.hostatom.com` (IP: `203.170.129.24`)
3. รอให้ DNS อัปเดต (อาจใช้เวลา 1-24 ชม.)

---

## ขั้นตอนที่ 1: เตรียมไฟล์สำหรับอัปโหลด

**(ทางเลือกที่ 1) อัปโหลดไฟล์ Zip:**
1. ให้ทำการ **Zip** โฟลเดอร์โปรเจคทั้งหมด **ยกเว้น** โฟลเดอร์ `node_modules`
2. ตรวจสอบว่ามีไฟล์สำคัญครบถ้วน (`package.json`, `src/`, `.env.example`)

**(ทางเลือกที่ 2) ใช้ Git (ถ้ามี SSH):**
- ใช้คำสั่ง: `git clone https://github.com/SNG-logistics/xangkhamLedger.git`
- หรือใช้เมนู **Git** ใน DirectAdmin แล้วใส่ URL นี้

---

## ขั้นตอนที่ 2: สร้างฐานข้อมูล (MySQL Database)

1. เข้าสู่หน้า Control Panel ของ HostAtom (DirectAdmin / Plesk)
2. ไปที่เมนู **MySQL Management** หรือ **Databases**
3. สร้าง Database ใหม่:
   - **Database Name**: ตั้งชื่อ (เช่น `admin_ledger`)
   - **Username**: สร้าง user ใหม่
   - **Password**: ตั้งรหัสผ่านที่ยากต่อการเดา (จดเก็บไว้ใช้ตั้งค่า)
4. กดเข้าไปที่ **phpMyAdmin** ของ Database ที่เพิ่งสร้าง
5. ไปที่แท็บ **Import**:
   - เลือกไฟล์ `sql/001_schema.sql` แล้วกด **Go** (เพื่อสร้างตาราง)
   - เลือกไฟล์ `sql/002_seed_superadmin.sql` แล้วกด **Go** (เพื่อสร้าง user admin เริ่มต้น)

---

## ขั้นตอนที่ 3: อัปโหลดและตั้งค่า Node.js

1. ไปที่เมนู **Setup Node.js App** หรือ **Node.js** ใน Control Panel
2. กดปุ่ม **Create Application**
3. ตั้งค่าดังนี้:
   - **Node.js Version**: เลือกเวอร์ชันที่ใหม่ที่สุด (แนะนำ 18.x หรือ 20.x)
   - **Application Mode**: `Production`
   - **Application Root**: ระบุโฟลเดอร์ที่จะวางไฟล์ (เช่น `xangkham_ledger`)
   - **Application URL**: เลือกโดเมน `xangkhamledger.com`
   - **Application Startup File**: พิมพ์ `src/server.js` **(สำคัญมาก! ต้องระบุ path ให้ถูก)**
4. กดปุ่ม **Create**
5. ระบบจะสร้างโฟลเดอร์ตามที่ระบุใน Application Root
6. เข้าไปที่ **File Manager** แล้วไปที่โฟลเดอร์นั้น
7. **อัปโหลดไฟล์ Zip** ที่เตรียมไว้ในขั้นตอนที่ 1 แล้วกด **Extract** (แตกไฟล์)
8. **สร้างไฟล์ .env**:
   - สร้างไฟล์ใหม่ชื่อ `.env` ในโฟลเดอร์นั้น
   - ก๊อปปี้เนื้อหาจาก `.env.example` มาวาง
   - แก้ไขข้อมูลให้ตรงกับ Database ที่สร้างในขั้นตอนที่ 2:
     ```env
     DB_HOST=localhost
     DB_USER=ชื่อuserที่สร้าง
     DB_PASSWORD=รหัสผ่านที่ตั้ง
     DB_NAME=ชื่อdatabaseที่ตั้ง
     NODE_ENV=production
     ```

---

## ขั้นตอนที่ 4: ติดตั้ง Library และเริ่มระบบ

1. กลับไปที่หน้า **Setup Node.js App**
2. กดปุ่ม **Run NPM Install** (รอจนเสร็จ)
3. กดปุ่ม **Restart Application**

## ขั้นตอนที่ 5: ทดสอบการใช้งาน

1. เปิด Browser เข้าไปที่ URL ที่ตั้งไว้
2. ลองล็อกอินด้วย:
   - **Username**: `admin`
   - **Password**: `admin123`
3. ถ้าเข้าได้ปกติ ให้รีบเปลี่ยนรหัสผ่านทันที!

---

## การแก้ไขปัญหาเบื้องต้น (Troubleshooting)

- **เข้าเว็บแล้วเจอ error 500 / 503**:
  - ตรวจสอบไฟล์ `.env` ว่าใส่ User/Password ของ Database ถูกต้องหรือไม่
  - ลองกดปุ่ม **Restart** ในหน้า Node.js App อีกครั้ง
- **วันเวลาไม่ตรง**:
  - แจ้ง Support ของ HostAtom ให้ตั้งค่า Timezone ของ Server เป็น `Asia/Bangkok` หรือ `Asia/Vientiane`

ขอให้สนุกกับการใช้งาน XANGKHAM Ledger ครับ! 🐘✨
