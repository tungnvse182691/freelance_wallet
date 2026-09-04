# Freelance Wallet — Frontend

React 18 + Vite + TypeScript (strict) + Tailwind CSS. SPA không router (chuyển tab bằng state).
Gọi đúng BE contract trong `2026-09-04-freelance-wallet-design.md` §4, không tự bịa API.

## Chạy local

```bash
npm install
cp .env.example .env   # sửa VITE_API_URL nếu BE không ở localhost:5000
npm run dev             # http://localhost:5173
npm run build           # gate: tsc + vite build, 0 lỗi mới pass
```

`.env.example`:

```
VITE_API_URL=http://localhost:5000
```

API base URL chỉ lấy từ `VITE_API_URL`, không hardcode trong component.

## Deploy Vercel

1. Import repo vào Vercel, root directory chọn `frontend` (hoặc deploy cả repo, build command `npm run build` trong `frontend`).
2. Framework preset: Vite. Output: `dist`.
3. Set env `VITE_API_URL` = URL public của BE rồi Deploy.

Lưu ý honest Phase 1: BE chạy localhost nên bản Vercel public không gọi được BE
trừ khi BE đã deploy hoặc mở tunnel (ngrok/cloudflared). Không có `vercel.json`
vì preset Vite mặc định đã đủ.

## Quy ước

- Tiền hiển thị `Intl.NumberFormat("vi-VN") + đ`; FE không tự tính tổng —
  số dashboard lấy từ `GET /api/dashboard`.
- Lỗi request nào cũng hiện `message` server trả về qua toast, không hiện stack.
- Mobile-first 390px, copy tiếng Việt (trừ thuật ngữ code: job, invoice, deadline).
