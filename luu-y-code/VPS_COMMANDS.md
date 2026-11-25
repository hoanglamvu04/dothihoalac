# VPS — Lệnh cập nhật mã nguồn Đô Thị Hòa Lạc

**Đường dẫn VPS theo workflow deploy của repo:** `/var/www/dothihoalac`  
**Repository:** `hoanglamvu04/dothihoalac`  
**PM2 backend mặc định:** `dothihoalac-api`  
**Website:** https://dothihoalac.vn/

> Đây là file trong GitHub. Nó chỉ xuất hiện trên VPS sau khi người vận hành **kéo repository về**. Phiên ChatGPT không có kết nối SSH/VPS và không thể xác nhận code đã chạy trên VPS.

## 1. Lệnh lần đầu — kéo code, xem trạng thái

Dán trên terminal SSH của VPS:

```bash
cd /var/www/dothihoalac && git pull --ff-only origin main && bash scripts/vps-update.sh --status
```

Lệnh chỉ cập nhật **source** và kiểm tra SHA/PM2/API readiness. **Không build**, **không restart/reload**, **không tạo MongoDB index**, **không sửa Nginx, .env hoặc dữ liệu**. Nếu Git báo local changes/conflict, đọc `git status`; không dùng `git reset --hard` bừa bãi.

## 2. Từ lần thứ hai — helper cập nhật an toàn

```bash
cd /var/www/dothihoalac && bash scripts/vps-update.sh --pull && bash scripts/vps-update.sh --status
```

Helper chỉ fast-forward branch main. Nó từ chối chạy nếu thư mục khác `/var/www/dothihoalac`, remote không phải `hoanglamvu04/dothihoalac`, đang ở branch khác main hoặc có thay đổi tracked chưa commit. Nó không triển khai production.

## 3. Kiểm tra MongoDB chỉ đọc (sau backup và xác minh server/.env)

```bash
cd /var/www/dothihoalac && bash scripts/vps-update.sh --preflight
```

Lệnh này chạy `server/scripts/preflight-discovery-release.mjs` (read-only), chỉ kiểm tra index và số nhóm bản ghi trùng, không tạo/sửa index và không in connection URI. Trước khi bật alerts phải có **hai unique indexes** và **saved_search_fair_scan_order**, với số nhóm trùng bằng 0. PASS trên CI không thay thế PASS trên staging/VPS.

## 4. Khi nào website thật thay đổi?

Kéo code không đồng nghĩa website đang chạy bản mới. Backend PM2 có thể vẫn chạy mã nguồn nạp từ trước và frontend Nginx vẫn phục vụ `client/dist` cũ.

**Sau khi đã nghiệm thu staging, database preflight, backup/restore và approval phát hành**, dùng workflow deploy thủ công hiện có trong GitHub:

GitHub → Actions → **Deploy Do Thi Hoa Lac VPS** → Run workflow → nhập `DEPLOY_DTHL`.

Workflow thực hiện build/restart qua `server/deploy.sh`, `client/deploy.sh` và kiểm tra readiness/smoke. Helper `scripts/vps-update.sh` **cố ý không có chế độ --deploy** để tránh cập nhật production khi chưa nghiệm thu.

## 5. Lệnh tra cứu khi có lỗi

```bash
cd /var/www/dothihoalac && git rev-parse --short HEAD
pm2 describe dothihoalac-api
curl -fsS --max-time 8 http://127.0.0.1:5000/api/v1/health/ready
```

Không in `server/.env`, token, cookie hay URI MongoDB vào tin nhắn/log. Chỉ restart process DTHL khi được phép; không restart các dự án khác trên cùng VPS.

## 6. Quy tắc tiếp tục phát triển

Khi nâng cấp code phải cập nhật `luu-y-code/STATUS.md` và `luu-y-code/CHANGELOG.md` cùng PR; khi thay đổi kế hoạch hoặc cách triển khai, cập nhật `ROADMAP.md`, `HANDOFF.md` và file VPS này.
