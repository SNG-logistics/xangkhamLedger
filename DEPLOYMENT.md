# 🚀 CHANGKHUM LEDGER - PRODUCTION DEPLOYMENT GUIDE

คู่มือสำหรับการนำระบบขึ้น Host จริง (VPS / Cloud Server)

---

## ✅ สิ่งที่ต้องเตรียม (Prerequisites)

1. **VPS / Cloud Server** (Ubuntu 20.04/22.04 LTS แนะนำ)
2. **Domain Name** (ถ้ามี)
3. **Node.js** (v16+)
4. **MySQL** (v8.0+)
5. **Nginx** (สำหรับทำ Reverse Proxy)
6. **PM2** (สำหรับรัน Node.js เป็น Background Service)

---

## 🛠️ ขั้นตอนการติดตั้งบน Server (Ubuntu)

### 1. ติดตั้ง Node.js, MySQL, Nginx, PM2

```bash
# อัปเดตเครื่อง
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js (ผ่าน NVM หรือ NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# ติดตั้ง MySQL
sudo apt install -y mysql-server

# ติดตั้ง Nginx
sudo apt install -y nginx

# ติดตั้ง PM2 (ตัวจัดการ Process)
sudo npm install -g pm2
```

### 2. ตั้งค่า Database

```bash
# เข้าสู่ MySQL
sudo mysql -u root

# สร้าง Database และ User (เปลี่ยน password ด้วย!)
CREATE DATABASE changkhum_ledger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'changkhum_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON changkhum_ledger.* TO 'changkhum_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. อัปโหลดโค้ดและติดตั้ง

คุณสามารถใช้ git clone หรือ upload ไฟล์ผ่าน SFTP ก็ได้

```bash
# ไปที่โฟลเดอร์เว็บ (ตัวอย่าง)
cd /var/www
git clone <your-repo-url> changkhum-ledger
cd changkhum-ledger

# ติดตั้ง dependencies
npm install --production
```

### 4. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` สำหรับ Production:
```bash
cp .env.example .env
nano .env
```

**แก้ไขข้อมูลใน .env:**
- `NODE_ENV=production`
- `DB_USER=changkhum_user`
- `DB_PASSWORD=YOUR_SECURE_PASSWORD`
- `SESSION_SECRET=ตั้งรหัสยาวๆและยากๆ`

### 5. Import Database Schema

```bash
mysql -u changkhum_user -p changkhum_ledger < sql/001_schema.sql
mysql -u changkhum_user -p changkhum_ledger < sql/002_seed_superadmin.sql
```

### 6. เริ่มต้นระบบด้วย PM2

เราได้เตรียมไฟล์ `ecosystem.config.js` ไว้ให้แล้ว

```bash
# เริ่มรันโปรแกรม
pm2 start ecosystem.config.js --env production

# ตั้งให้รันอัตโนมัติเมื่อเปิดเครื่อง
pm2 save
pm2 startup
```

### 7. ตั้งค่า Nginx (Reverse Proxy)

เพื่อให้เข้าผ่าน Domain หรือ IP ได้โดยไม่ต้องใส่ Port 3000

แก้ไขไฟล์ config ของ Nginx:
```bash
sudo nano /etc/nginx/sites-available/default
```

ใส่ค่าดังนี้:
```nginx
server {
    listen 80;
    server_name your_domain.com_or_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

ตรวจสอบและ Restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 ความปลอดภัย (Security Checklist)

1. **Firewall (UFW)**
   - อนุญาตเฉพาะ Port ที่จำเป็น (SSH, HTTP, HTTPS)
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

2. **SSL Certificate (HTTPS)**
   - แนะนำใช้ Certbot (Let's Encrypt)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your_domain.com
   ```

3. **เปลี่ยนรหัสผ่าน Admin**
   - เข้าสู่ระบบด้วย `admin` / `admin123` ทันทีหลังติดตั้งเสร็จและเปลี่ยนรหัสผ่านใหม่

---

## 🔄 การอัปเดตระบบ (Maintenance)

เมื่อมีการแก้โค้ดและอัปโหลดขึ้น Server ใหม่:

```bash
cd /var/www/changkhum-ledger
git pull origin main
npm install
pm2 restart changkhum-ledger
```

---

**ขอให้โชคดีกับการใช้งานจริงครับ! 🚀**
