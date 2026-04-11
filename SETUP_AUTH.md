# Setup Database & Authentication

Tôi đã thêm PostgreSQL database và Google OAuth authentication cho dự án của bạn. Dưới đây là hướng dẫn setup:

## 📦 Bước 1: Cài đặt Dependencies

```bash
npm install
```

## 🔐 Bước 2: Thiết lập PostgreSQL Database

### Option A: Dùng PostgreSQL Local
1. Cài đặt PostgreSQL từ https://www.postgresql.org/download/
2. Tạo database mới:
```sql
CREATE DATABASE acrm_db;
```

### Option B: Dùng Docker (Dễ hơn)
```bash
docker run --name postgres-acrm -e POSTGRES_PASSWORD=password -e POSTGRES_DB=acrm_db -p 5432:5432 -d postgres
```

## 🔑 Bước 3: Tạo Google OAuth Credentials

1. Truy cập https://console.cloud.google.com/
2. Tạo project mới
3. Vào "APIs & Services" → "Credentials"
4. Tạo "OAuth 2.0 Client ID" (Web application)
5. Authorized redirect URIs thêm:
   - `http://localhost:3000/api/auth/callback/google` (cho development)
   - `https://yourdomain.com/api/auth/callback/google` (cho production)
6. Copy **Client ID** và **Client Secret**

## 🚀 Bước 4: Setup Environment Variables

1. Copy `.env.example` sang `.env.local`:
```bash
cp .env.example .env.local
```

2. Sửa `.env.local` với thông tin của bạn:
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/acrm_db

# NextAuth Secret (Generate với: openssl rand -base64 32)
NEXTAUTH_SECRET=your-32-char-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_SECRET=your-google-client-secret
```

### Tạo NEXTAUTH_SECRET:
```bash
# Run lệnh này để generate secret
openssl rand -base64 32
```

## 📊 Bước 5: Setup Database Schema

```bash
# Tạo database tables
npx prisma migrate dev --name init

# Or nếu chỉ muốn sync:
npx prisma db push
```

## ▶️ Bước 6: Chạy Development Server

```bash
npm run dev
```

Mở http://localhost:3000 trong browser.

## 🔗 Các Files Được Tạo

- `lib/auth.ts` - Cấu hình NextAuth
- `lib/prisma.ts` - Prisma client
- `app/api/auth/[...nextauth]/route.ts` - Auth API endpoints
- `app/signin/page.tsx` - Trang đăng nhập
- `components/AuthProvider.tsx` - Session provider
- `components/UserMenu.tsx` - User menu component
- `middleware.ts` - Route protection
- `prisma/schema.prisma` - Database schema

## 📝 Sử dụng Authentication trong Components

### Lấy session hiện tại:
```typescript
import { useSession } from "next-auth/react";

export function MyComponent() {
  const { data: session } = useSession();
  
  if (session) {
    console.log("User:", session.user);
  }
}
```

### Server-side (Server Components):
```typescript
import { auth } from "@/lib/auth";

export async function MyServerComponent() {
  const session = await auth();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return <div>Hello {session.user?.name}</div>;
}
```

## 🛡️ Protected Routes

Middleware tự động bảo vệ tất cả routes ngoại trừ:
- `/` (trang chủ)
- `/signin` (trang đăng nhập)
- `/api/**` (API routes)

Nếu user không đăng nhập sẽ bị redirect đến `/signin`.

## 🐛 Troubleshooting

### Lỗi: "DATABASE_URL không được set"
- Kiểm tra file `.env.local` tồn tại và có `DATABASE_URL`

### Lỗi: "NEXTAUTH_SECRET is not set"
- Tạo secret: `openssl rand -base64 32`
- Thêm vào `.env.local`

### Lỗi kết nối Google OAuth
- Kiểm tra `GOOGLE_ID` và `GOOGLE_SECRET` chính xác
- Kiểm tra redirect URI match đúng

## 📱 Cải thiện tiếp theo

Hiện có thể thêm:
1. Email verification
2. Profile page để update thông tin
3. Remember me functionality
4. More OAuth providers (GitHub, Microsoft, etc.)
5. Role-based access control (RBAC)

Hãy cho tôi biết nếu cần thêm gì! 🚀
