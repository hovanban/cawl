# Deploy Guide — Cawl (Production)

Hướng dẫn deploy tự động lên server production.

---

## Thông tin cần điền

| Biến | Giá trị | Ghi chú |
|------|---------|---------|
| `SERVER_IP` | `46.202.167.100` | IP hoặc domain của server |
| `SERVER_USER` | `root` | User SSH (ví dụ: `ubuntu`, `root`) |
| `DEPLOY_PATH` | `/home/baovothuat-bot/htdocs/bot.baovothuat.com` | Thư mục deploy trên server |
| `DATABASE_URL` | `mongodb://cawl_user:Cawl%402025%21Secure@localhost:27017/cawl?authSource=admin` | MongoDB connection string (VPS) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | API key Anthropic (hoặc cài sau qua /settings) |
| `NEXT_PUBLIC_APP_URL` | `https://bot.baovothuat.com` | Domain production |
| `JWT_ACCESS_SECRET` | `__CHUỖI_NGẪU_NHIÊN_32_KÝ_TỰ__` | Bí mật ký JWT access token |
| `JWT_REFRESH_SECRET` | `__CHUỖI_NGẪU_NHIÊN_32_KÝ_TỰ__` | Bí mật ký JWT refresh token |
| `PM2_APP_NAME` | `cawl` | Tên app trong PM2 |
| `APP_PORT` | `3005` | Port chạy Next.js |

---

## 0. Tạo MongoDB Atlas & import dữ liệu

> Bỏ qua nếu đã có connection string MongoDB.

### 0.1 Tạo cluster miễn phí

1. Vào [cloud.mongodb.com](https://cloud.mongodb.com) → đăng ký / đăng nhập
2. **Create a deployment** → chọn **M0 Free** (512MB, đủ dùng)
3. Chọn provider/region gần Việt Nam (AWS / Singapore)
4. Đặt tên cluster, nhấn **Create**

### 0.2 Tạo database user

1. **Database Access** → **Add New Database User**
2. Chọn **Password authentication**
3. Đặt username & password (lưu lại)
4. Role: **Atlas admin** → **Add User**

### 0.3 Whitelist IP

1. **Network Access** → **Add IP Address**
2. Thêm **IP server** (`46.202.167.100`) và **IP máy local** của bạn
3. Hoặc chọn **Allow Access from Anywhere** (`0.0.0.0/0`) nếu muốn đơn giản

### 0.4 Lấy connection string

1. **Database** → **Connect** → **Drivers**
2. Chọn Driver: **Node.js**, Version: **5.5 or later**
3. Copy connection string dạng:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cawl?retryWrites=true&w=majority
   ```
4. Thay `<user>`, `<password>`, đổi `myFirstDatabase` → `cawl`

---

### 0.5 Export dữ liệu từ local lên Atlas

> Thực hiện trên máy local (Windows). Cần cài [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools).

**Export từ local:**
```powershell
# Export toàn bộ DB local
mongodump --uri="mongodb://localhost:27017/cawl?replicaSet=rs0&directConnection=true" --out="C:\backup\cawl"
```

**Import lên Atlas:**
```powershell
# Thay bằng connection string Atlas của bạn
mongorestore --uri="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cawl" --drop "C:\backup\cawl\cawl"
```

> **Lưu ý:** nếu chưa có dữ liệu gì cần import, bỏ qua bước này — Prisma sẽ tự tạo collections và indexes khi chạy `prisma db push`.

---

### 0.6 Kiểm tra kết nối

```bash
# Cài mongosh nếu chưa có
# Chạy trong terminal
mongosh "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cawl"
# Nếu vào được shell MongoDB là thành công
```

---

## Yêu cầu server

- Ubuntu 20.04+ / Debian 11+
- Node.js 18+
- PM2 (`npm install -g pm2`)
- Git
- MongoDB 6+ (hoặc dùng MongoDB Atlas — free tier 512MB)
- Nginx (reverse proxy)

---

## 1. Lần đầu setup server

```bash
# SSH vào server
ssh SERVER_USER@SERVER_IP

# Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài PM2
npm install -g pm2

# Cài Nginx
sudo apt install -y nginx

# Tạo thư mục deploy
sudo mkdir -p /var/www/cawl
sudo chown $USER:$USER /var/www/cawl

# Clone repo
cd /var/www/cawl
git clone __ĐIỀN_GIT_REPO_URL__ .

# Tạo file .env
cp .env.example .env
nano .env  # Điền các biến môi trường
```

---

## 2. File `.env` trên server

```env
DATABASE_URL="mongodb://cawl_user:Cawl%402025%21Secure@localhost:27017/cawl?authSource=admin"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_APP_URL="https://bot.baovothuat.com"
JWT_ACCESS_SECRET="__CHUỖI_NGẪU_NHIÊN_32_KÝ_TỰ__"
JWT_REFRESH_SECRET="__CHUỖI_NGẪU_NHIÊN_32_KÝ_TỰ__"
AI_MAX_TOKENS=500
AI_CONTENT_LIMIT=4000
```

Tạo JWT secret ngẫu nhiên nhanh:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Chạy 2 lần, lấy 2 chuỗi khác nhau cho ACCESS và REFRESH
```

---

## 3. Script deploy tự động

Tạo file `scripts/deploy.sh` trên server:

```bash
#!/bin/bash
set -e

DEPLOY_PATH="/var/www/cawl"
PM2_APP_NAME="cawl"
APP_PORT=3002

echo "==> [1/6] Pull code mới nhất..."
cd $DEPLOY_PATH
git pull origin main

echo "==> [2/6] Cài dependencies..."
npm ci --omit=dev

echo "==> [3/6] Generate Prisma client..."
npx prisma generate

echo "==> [4/6] Đồng bộ schema MongoDB..."
npx prisma db push --accept-data-loss

echo "==> [5/6] Build Next.js..."
npm run build

echo "==> [6/6] Restart PM2..."
pm2 reload $PM2_APP_NAME --update-env || pm2 start npm --name "$PM2_APP_NAME" -- start -- -p $APP_PORT

echo ""
echo "Deploy hoàn tất!"
pm2 status
```

Cấp quyền thực thi:

```bash
chmod +x scripts/deploy.sh
```

---

## 4. Khởi động lần đầu với PM2

```bash
cd /var/www/cawl
npm ci
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

# Khởi động app
pm2 start npm --name "cawl" -- start -- -p 3002

# Lưu PM2 config để tự khởi động khi reboot
pm2 save
pm2 startup  # Chạy lệnh mà PM2 in ra
```

---

## 5. Cấu hình Nginx

Tạo file `/etc/nginx/sites-available/cawl`:

```nginx
server {
    listen 80;
    server_name __DOMAIN__;  # Ví dụ: cawl.yourdomain.com

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kích hoạt site:

```bash
sudo ln -s /etc/nginx/sites-available/cawl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. HTTPS với Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d __DOMAIN__
# Certbot tự cấu hình HTTPS và auto-renew
```

---

## 7. CI/CD tự động với GitHub Actions

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_IP }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/cawl
            bash scripts/deploy.sh
```

**Secrets cần thêm vào GitHub** (Settings → Secrets and variables → Actions):

| Secret | Giá trị |
|--------|---------|
| `SERVER_IP` | IP server |
| `SERVER_USER` | User SSH |
| `SSH_PRIVATE_KEY` | Nội dung file `~/.ssh/id_rsa` (private key) |

---

## 8. Tạo SSH key cho GitHub Actions

```bash
# Trên máy local — tạo key riêng cho deploy
ssh-keygen -t ed25519 -C "deploy-cawl" -f ~/.ssh/deploy_cawl

# Copy public key lên server
ssh-copy-id -i ~/.ssh/deploy_cawl.pub SERVER_USER@SERVER_IP

# Nội dung private key (~/.ssh/deploy_cawl) → dán vào GitHub Secret SSH_PRIVATE_KEY
cat ~/.ssh/deploy_cawl
```

---

## 9. Deploy thủ công khi cần

```bash
# SSH vào server và chạy script
ssh SERVER_USER@SERVER_IP "cd /var/www/cawl && bash scripts/deploy.sh"
```

Hoặc ngắn hơn với alias:

```bash
alias deploy-cawl='ssh SERVER_USER@SERVER_IP "cd /var/www/cawl && bash scripts/deploy.sh"'
```

---

## 10. Kiểm tra sau khi deploy

```bash
# Trạng thái app
pm2 status

# Logs realtime
pm2 logs cawl --lines 50

# Kiểm tra port
curl http://localhost:3002

# Kiểm tra domain
curl https://__DOMAIN__
```

---

## Luồng deploy tự động

```
git push origin main
       ↓
GitHub Actions trigger
       ↓
SSH vào server
       ↓
git pull → npm ci → prisma db push → build → pm2 reload
       ↓
App mới chạy (zero-downtime với PM2 reload)
```

---

## Ghi chú

- `pm2 reload` (khác `restart`) để **zero-downtime deploy**
- `prisma db push` dùng thay cho `migrate` vì MongoDB không có migration SQL — chỉ đồng bộ index/schema
- Nếu dùng **Vercel**: bỏ qua mục 3–9, chỉ cần thêm env vars trong Vercel dashboard và kết nối GitHub repo
- Database backup: nên dùng **MongoDB Atlas** (có sẵn auto-backup) hoặc `mongodump` nếu tự host
