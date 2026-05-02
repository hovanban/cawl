Deploy project Cawl lên production server (46.202.167.100).

Thực hiện theo thứ tự sau:

## Bước 1 — Push code lên GitHub

Chạy các lệnh git sau:
1. `git add -A`
2. `git status --short` để xem những file thay đổi
3. Nếu có thay đổi: `git commit -m "deploy: <mô tả ngắn thay đổi>"` rồi `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa -o IdentitiesOnly=yes" git push origin main`
4. Nếu không có thay đổi: bỏ qua bước commit/push

## Bước 2 — Deploy lên server

SSH vào server và chạy deploy script:

```
ssh -i ~/.ssh/id_rsa root@46.202.167.100 "cd /home/baovothuat-bot/htdocs/bot.baovothuat.com && bash scripts/deploy.sh 2>&1"
```

## Bước 3 — Kiểm tra kết quả

Sau khi deploy xong, kiểm tra:
```
ssh -i ~/.ssh/id_rsa root@46.202.167.100 "pm2 status && curl -s -o /dev/null -w '%{http_code}' http://localhost:3005"
```

- Nếu pm2 status là `online` và HTTP code là `200` → deploy thành công
- Nếu có lỗi → đọc logs: `pm2 logs cawl --lines 30`

Báo cáo kết quả deploy cho user sau khi hoàn thành.
