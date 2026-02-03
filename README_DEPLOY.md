# Hướng Dẫn Deploy Lên Vercel

## Vấn đề đã sửa:
- ✅ Thêm file `vercel.json` để cấu hình routing SPA
- ✅ Cập nhật `vite.config.ts` với cấu hình build đúng
- ✅ Thêm file `.vercelignore`

## Các bước deploy:

### 1. Chuẩn bị Environment Variables trên Vercel
Trước khi deploy, bạn cần thêm biến môi trường trên Vercel Dashboard:
- Vào Project Settings → Environment Variables
- Thêm: `GEMINI_API_KEY` = `your_api_key_here`

### 2. Deploy từ GitHub:

#### A. Push code lên GitHub (nếu chưa có):
```bash
git init
git add .
git commit -m "Initial commit với cấu hình Vercel"
git branch -M main
git remote add origin your-github-repo-url
git push -u origin main
```

#### B. Deploy trên Vercel:
1. Truy cập https://vercel.com
2. Click "Add New Project"
3. Import repository GitHub của bạn
4. Vercel sẽ tự động phát hiện Vite framework
5. Thêm Environment Variables (GEMINI_API_KEY)
6. Click "Deploy"

### 3. Hoặc deploy trực tiếp bằng Vercel CLI:
```bash
npm i -g vercel
vercel login
vercel --prod
```

## Lưu ý quan trọng:

1. **Environment Variables**: Đảm bảo đã thêm `GEMINI_API_KEY` trong Vercel Dashboard
2. **Build Settings trên Vercel**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Nếu vẫn gặp lỗi 404**:
   - Xóa deployment cũ trên Vercel
   - Redeploy lại từ đầu
   - Kiểm tra Deployment Logs để xem lỗi cụ thể

## Kiểm tra sau khi deploy:
- ✅ Trang chủ có load được không
- ✅ API key có hoạt động không
- ✅ Các tính năng có chạy đúng không

## Lỗi thường gặp:

### Lỗi 404:
- **Nguyên nhân**: Routing SPA không được cấu hình
- **Giải pháp**: File `vercel.json` đã được thêm để xử lý vấn đề này

### Lỗi API không hoạt động:
- **Nguyên nhân**: Thiếu environment variables
- **Giải pháp**: Thêm GEMINI_API_KEY trong Vercel Dashboard

### Lỗi Build Failed:
- **Nguyên nhân**: Dependencies không được cài đúng
- **Giải pháp**: Xóa `node_modules` và `package-lock.json`, sau đó `npm install` lại
