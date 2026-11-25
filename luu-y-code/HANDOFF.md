# HANDOFF — Hướng dẫn ChatGPT/Codex tiếp tục dự án

> Mọi phiên AI mới phải đọc file này và [AGENTS.md](../AGENTS.md). Tài liệu ở GitHub giúp chuyển giao giữa các phiên ChatGPT; **không phải bộ nhớ tự đồng bộ ngoài repo**.

## 1. Ngữ cảnh dự án

- Repo: [hoanglamvu04/dothihoalac](https://github.com/hoanglamvu04/dothihoalac), website Đô Thị Hòa Lạc.
- Backend: Node.js/Express/Mongoose/MongoDB; frontend: React. Kiểm tra `package.json` và source thực tế trước khi kết luận chi tiết.
- `main` là nhánh tích hợp. PR #77 (WA-002/WA-005), #78 (Search P0/P1), #79 (Sprint 4–6), #80 (manual deploy) đã merge vào `main` ngày 24–25/11/2026.
- Có CI app + frontend + MongoDB 7 isolated E2E; CI PASS chưa thay thế staging và production acceptance.
- Tính năng X-HUB và saved-search alert mặc định **OFF**, không đọc `.env.example` để đoán `.env` của VPS.
- Đợt DTHL-F01 thêm `lastScanAttemptAt` và index không unique `saved_search_fair_scan_order` (`isActive:1,lastScanAttemptAt:1,_id:1`) để quét công bằng. **Cần 3 index vật lý** gồm 2 unique cũ và index xếp lịch mới. Thứ tự migration: backup → preflight read-only → xem duplicate/schema/index → DBA tạo index được duyệt → preflight read-only PASS → staging acceptance. Không tạo index tại production trong ChatGPT.

## 2. Quy trình bắt buộc cho ChatGPT khác

**Đầu phiên:**
1. Mở `AGENTS.md`, `luu-y-code/README.md`, `STATUS.md`, `ROADMAP.md`, `CHANGELOG.md` mới nhất.
2. Đọc `main` hiện tại, PR đang mở, CI kết quả trên **đúng SHA**, các issue tài liệu và mã liên quan. Nếu STATUS đã cũ, cập nhật nó.
3. Xác định task ID, phạm vi, checklist acceptance; ghi blocker nếu không có VPS/DB/approval. Không hỏi lại thông tin vốn đã có trong tài liệu.
4. Lập kế hoạch ngắn và code trên branch riêng khi phù hợp.

**Khi phát triển:**
- Giữ thay đổi nhỏ, ưu tiên sửa source hiện hữu; thêm test cho tình huống đúng/sai, bảo mật, RBAC, trường hợp riêng tư.
- Không sao chép PII, mật khẩu, cookie, API key, MongoDB URI, key X-HUB vào tài liệu hay commit.
- Nếu thay đổi theo yêu cầu người dùng ở `client/`, `server/`, `scripts/`, `.github/workflows/` hoặc root config: **sửa cùng commit/PR cả `luu-y-code/STATUS.md` và `luu-y-code/CHANGELOG.md`**. Kèm ROADMAP/HANDOFF nếu kế hoạch/quy trình thay đổi.
- Kiểm tra npm test, ESLint, build và MongoDB isolated theo phạm vi; không tuyên bố PASS trước khi có log.
- Thực thi GitHub actions/code tool theo quyền hiện có; đừng nói đã chạy trên VPS nếu chỉ có GitHub tool.

**Khi kết thúc:**
1. Ghi trong CHANGELOG: ngày, task ID, file chính, PR/commit, test chạy (có/không), số PASS/FAIL, hạn chế.
2. Ghi trong STATUS: SHA và CI hiện tại, task đang làm, phần mới hoàn thành, blockers, bước tiếp.
3. Ghi ROADMAP: trạng thái task và task tiếp theo; ưu tiên release gates trước tối ưu nâng cao.
4. Trả lời chủ dự án đường dẫn PR/commit, những gì làm được **thật**, những gì chưa chạy/được duyệt.

## 3. Các lệnh và giới hạn phát hành

Trong clone local:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
cd server
npm ci
npm test
node scripts/verify-discovery-indexes.mjs
node scripts/preflight-discovery-release.mjs
```

**Lưu ý:** 2 lệnh audit cuối yêu cầu `MONGO_URI` trỏ đúng DB cần audit, thao tác **chỉ đọc**; không chạy tùy tiện trên production. Các lệnh này **không tự tạo indexes**. Kiểm thử/sửa schema phải dùng DB staging đã có backup và phép rõ ràng.

Đối với frontend, kiểm tra version Node trong workflow, sau đó:

```bash
cd client
npm ci
npm run build
```

**GitHub merge khác VPS deploy:** `.github/workflows/deploy-api.yml` chỉ chạy thủ công (GitHub Actions → Deploy Do Thi Hoa Lac VPS → Run workflow, nhập `DEPLOY_DTHL`). **Không tự chạy** bước này khi người dùng chỉ yêu cầu code/push `main`.

Không bật `SAVED_SEARCH_ALERTS_ENABLED=true`, `XHUB_WEB_ANALYTICS_ENABLED=true`, `XHUB_ANALYTICS_PULL_ENABLED=true` cho tới khi đọc và đáp ứng checklist release tương ứng.

## 4. Quy trình xử lý lỗi, rollback và hồ sơ quyết định

- Build/CI FAIL: ghi `BLOCKED` hoặc `IN_PROGRESS`, link run & job lỗi; sửa và chạy lại trên đúng commit; cập nhật STATUS/CHANGELOG.
- Merge conflicts: giữ đầy đủ feature và test của các nhánh, không ghi đè nguyên file nếu mất chức năng; so sánh từng diff.
- Trước thay đổi schema: lưu backup/restore drill, index audit + preflight, migration riêng, kế hoạch hồi phục.
- Bug production: tách sự thật production và nguồn code `main` đang chưa deploy; kiểm tra runtime/config thực và tính năng đang bật trước khi tác động.
- Quyết định kiến trúc quan trọng: thêm vào CHANGELOG và mô tả lý do, phương án thay thế, sự đánh đổi; điều chỉnh ROADMAP nếu cần.

## 5. Prompt mẫu để sử dụng với ChatGPT khác

```text
Bạn tiếp tục repository hoanglamvu04/dothihoalac.

TRƯỚC TIÊN đọc AGENTS.md và tất cả các file trong thư mục luu-y-code/.
Đối chiếu STATUS với main SHA mới nhất, các PR, GitHub Actions và source thực tế.
Chọn task ưu tiên trong ROADMAP rồi code, thêm kiểm thử và cập nhật
luu-y-code/STATUS.md + luu-y-code/CHANGELOG.md trong CÙNG PR/commit.
Nếu kế hoạch hoặc cấu hình thay đổi, cập nhật cả ROADMAP.md hoặc HANDOFF.md.
Không tự deploy VPS, không tự bật X-HUB/analytics/alerts khi chưa nghiệm thu.
Cuối lượt trả lời commit, PR, kết quả test đúng SHA, phần còn chờ và task tiếp.
```

## 6. Những gì không được suy luận

- Không suy ra site đã deploy chỉ vì GitHub `main` mới.
- Không tự nhận mô hình ML hoặc perceptual hash đã được xây dựng khi chỉ có heuristic.
- Không suy ra tài khoản/cấu hình X-HUB đã có quyền đọc dữ liệu thật từ file ví dụ.
- Không coi check của CI trên MongoDB cô lập là kiểm tra DB staging/production.
- Không hứa tiếp tục code tự động ngoài cuộc trò chuyện nếu không có automation.

## 7. F07 — Search filter transport

Khi chỉnh trang `/tim-kiem`, dùng `client/src/utils/searchQueryParams.mjs` đưa các giá trị URL `days`, `propertyType`, `transactionType`, `minPrice`, `maxPrice`, `minArea`, `maxArea` vào `GET /api/v1/search`; chỉ gửi trường BĐS khi `type=property`. Đổi URL filters phải re-fetch API. CI frontend chạy `client/tests/searchQueryParams.test.mjs`. Trên staging cần kiểm tra kết quả lọc thật và thao tác mobile/keyboard.


## 8. F08 / OPS01 — UI và lệnh VPS chuẩn

- UI active filters: helper `client/src/utils/searchActiveFilters.mjs`; test `client/tests/searchActiveFilters.test.mjs`; không hiển thị bộ lọc BĐS ở tab khác. Xóa chip giữ query/area/type nhưng reset page; giá nhập triệu VND, API nhận VND.
- **VPS:** đường dẫn chính thức theo workflow `/var/www/dothihoalac`. Đọc [VPS_COMMANDS.md](VPS_COMMANDS.md).
- Lệnh lần đầu: `cd /var/www/dothihoalac && git pull --ff-only origin main && bash scripts/vps-update.sh --status`.
- Lần sau: `cd /var/www/dothihoalac && bash scripts/vps-update.sh --pull && bash scripts/vps-update.sh --status`.
- Script không chạy npm build, PM2 reload, migration hoặc deploy. Phải nghiệm thu R01–R04 trước khi chạy manual GitHub Actions `Deploy Do Thi Hoa Lac VPS` với `DEPLOY_DTHL`.
- Khi user yêu cầu "kéo lên VPS", phân biệt **đưa code lên GitHub** và **user SSH vào VPS chạy lệnh**. Không tuyên bố đã thay đổi VPS khi chưa có bằng chứng.

## 9. OPS02 — Runtime smoke read-only trên VPS

- Sau khi OPS02 merge vào main và chủ VPS pull, chạy `cd /var/www/dothihoalac && bash scripts/vps-health-report.sh`. Kiểm tra API port 5000, PM2 `dothihoalac-api`, trang chủ và sitemap public.
- Script cố ý chỉ đọc; `--deploy` bị từ chối. Không kết luận production deploy mới khi chỉ có Git SHA.
- Kiểm tra test `node --test scripts/vps-health-report.test.mjs` và CI trước merge. Khắc phục staging/DB release gates trước khi chạy workflow deploy thủ công.
