# Maker Docs — Game Documentation Hub

Hệ thống web quản lý tài liệu game cho mọi vai trò (artist, game design, dev, QA): character, skill, mechanic, feature… Cho phép **paste HTML trực tiếp** hoặc **import file** (`.html` / `.md`), với **sidebar động** tạo/link tài liệu lồng nhau.

> Lấy cảm hứng từ trang Hero Hub ví dụ (Sprout — Wings of Everland).

## Tech stack

- **Next.js (App Router)** + **TypeScript** + **Turbopack**
- **Tailwind CSS v4** + `@tailwindcss/typography`
- **MongoDB** (truy cập qua driver chính thức)
- **framer-motion** (animation), **lucide-react** (icons), **marked** (Markdown), **isomorphic-dompurify** (sanitize HTML)

## Tính năng (MVP, chưa có đăng nhập/phân quyền)

- 🌳 **Sidebar động**: cây tài liệu lồng nhau, tạo / đổi tên / xóa inline, thêm tài liệu con tại bất kỳ cấp, badge trạng thái, search realtime, tự mở rộng theo trang đang xem.
- 📝 **Trang tài liệu**: header (icon, tiêu đề, status, tags), breadcrumb, mục lục "Trên trang này" tự sinh từ heading, nội dung render đẹp (bảng, code, blockquote…).
- ✍️ **Editor**: chuyển đổi **HTML Source ⇄ Preview**, **paste HTML** trực tiếp, **import file** `.html` / `.md` / `.txt`.
- 🧩 **Templates**: Hero / Skill / Mechanic / Feature / Folder / Blank.
- 🎨 UI hiện đại, mượt, chuyên nghiệp; sidebar thu gọn được.
- 🌱 **Seed sẵn** dữ liệu mẫu Wings of Everland (Sprout, Bloom Burst, Mechanics…).

## Chạy dự án

Cần một MongoDB đang chạy. App **tự seed** 11 tài liệu mẫu vào DB khi collection còn rỗng (chạy với bất kỳ Mongo nào: Docker, local, Atlas).

```bash
npm install
npm run dev          # chỉ chạy Next.js, dùng MongoDB ở MONGODB_URI
```

- Mở http://localhost:3000 (bận thì tự nhảy 3001…).
- Cấu hình kết nối trong `.env.local`:

```
MONGODB_URI=mongodb://admin:123456@127.0.0.1:27017/?authSource=admin
MONGODB_DB=maker_docs
```

> Ví dụ ở trên trỏ tới container Docker `mongo-local` (mongo:6) — đổi user/pass/host theo môi trường của bạn. Atlas thì dùng `mongodb+srv://…`.

### Không có sẵn MongoDB? Dùng bản nhúng

```bash
npm run dev:embedded   # chạy MongoDB nhúng (lưu .mongo-data/) + Next.js
```

MongoDB nhúng bind cổng 27017 — hãy đảm bảo không có Mongo/Docker nào khác đang chiếm cổng này.

## Cấu trúc

```
src/
  app/
    api/docs/route.ts            # GET list, POST create
    api/docs/[id]/route.ts       # GET, PATCH, DELETE (xóa kèm con)
    api/docs/reorder/route.ts    # POST reorder
    doc/[id]/page.tsx            # trang tài liệu
    page.tsx                     # dashboard
    layout.tsx, globals.css
  components/
    AppShell.tsx                 # layout + thu gọn sidebar
    Sidebar.tsx / SidebarItem.tsx# cây tài liệu động
    CreateDocModal.tsx           # tạo doc theo template
    DocView.tsx                  # xem + sửa + paste/import HTML
    DocsProvider.tsx             # state + API client
  lib/
    mongodb.ts, docs.ts, types.ts, templates.ts, sanitize.ts, utils.ts
scripts/
  mongo-dev.mjs                  # MongoDB nhúng + auto-seed
  seed-data.mjs                  # dữ liệu mẫu
```

## Định hướng tiếp theo

- Đăng nhập + phân quyền theo vai trò (artist / design / dev / QA)
- Kéo-thả sắp xếp sidebar (API `reorder` đã sẵn sàng)
- Backlinks 2 chiều `[[wiki-link]]`, graph view
- Version history + diff, comment inline
- Block editor (table/callout/gallery), publish static page
# maker-docs
