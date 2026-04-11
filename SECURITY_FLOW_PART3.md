# 🔐 Auth Security Flow - Part 3: State Management & Session Persistence

## 📊 Sơ đồ Part 3: Từ Local Storage đến Token Refresh

```
CLIENT (Browser)                          SERVER (Node.js Backend)
────────────────────────────────────      ─────────────────────────────

[Part 2 Complete - User logged in]

SESSION COOKIE (HTTPOnly)
├─ Lưu trữ tại: Browser's Cookie Store
├─ Bảo vệ: HTTPOnly + Secure flags
└─ JavaScript không thể truy cập ✓ (Tránh XSS)

│
├─ BƯỚC 1: CLIENT TỰ ĐỘNG GẮN TOKEN
│  User bấm "Xem Profile"
│  │
│  Browser tự động gửi cookie:
│  GET /api/user/profile
│  Cookie: next-auth.session-token=abc123...
│  │                    ↓
│  │          Server kiểm tra:
│  │          - Lookup session từ database
│  │          - Kiểm tra hạn
│  │          - Lấy userId
│  │
│  Response ← ✓ 200 Profile data
│

│
├─ BẬC 2: TOKEN HẾT HẠN - CLIENT REFRESH
│  User gọi API sau 30 ngày:
│  GET /api/user/profile
│  Cookie: next-auth.session-token=abc123... (hết hạn)
│  │                    ↓
│  │          Server: "Cái session này quá cũ!"
│  │          Response: 401 Unauthorized
│  │
│  401 Unauthorized ← Response
│  │
│  │ (apiClient tự động xử lý)
│  │ Gọi /api/auth/session để refresh
│  │ → NextAuth tạo session token mới
│  │ → Cookie updated
│  │
│  │ Thử lại request cũ:
│  │ GET /api/user/profile
│  │ Cookie: next-auth.session-token=xyz789... (MỚI)
│  │                    ↓
│  │                ✓ Accept
│  │
│  Response ← ✓ 200 Profile data
│

│
└─ BƯỚC 3: USER LOGOUT
   signOut()
   ├─ Backend: Xóa session từ database
   ├─ Frontend: Clear cookie
   └─ Redirect: /signin
```

---

## 🔑 Part 3 Chi Tiết: Các Bước Cụ Thể

### **Bước 1: Lưu Trữ "Chìa Khóa" An Toàn Trên Thiết Bị ✅**

**Dưới cơ chế của NextAuth v4:**

```typescript
// Khi user sign in, NextAuth tạo session token:

SET-COOKIE: next-auth.session-token=eys2j3k4h2j4k2h...;
  HttpOnly;           // ⚡ JavaScript không thể đọc
  Secure;             // ⚡ Chỉ gửi qua HTTPS (production)
  SameSite=Lax;       // ⚡ Tránh CSRF attack
  Max-Age=2592000;    // ⚡ 30 ngày
  Path=/;
```

**Bảo mật:**
- ✅ Không ai lấy cắp được (JavaScript XSS không thể đọc)
- ✅ Không ai giả mạo được (ký bằng NEXTAUTH_SECRET)
- ✅ Tự động gửi mỗi request (browser tự động làm)

**Ứng dụng React/Next:**
```typescript
// Client-side không cần làm gì!
// Browser tự động gửi cookie
const response = await fetch("/api/user/profile");
// Cookie tự động attach ✓
```

---

### **Bước 2: Giao Tiếp Với Server (Gắn Thẻ Bài) ✅**

**Flow:**

```typescript
// CLIENT
import { apiPost } from "@/lib/api-client";

const response = await apiPost("/api/user/profile", {
  name: "New Name",
});

// API Client tự động làm:
// 1. Kiểm tra session từ NextAuth
// 2. Gắn cookie (browser tự động)
// 3. Gửi request
// 4. Kiểm tra response status
```

**Server:**

```typescript
// SERVER - app/api/user/profile/route.ts
import { withAuth } from "@/lib/auth-middleware";

export const GET = (req) => withAuth(async (req, context) => {
  const { userId } = context;
  // ✅ Nếu chạy đến đây = User đã xác minh
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  return NextResponse.json(user);
})(req);
```

**Luồng:**

```
CLIENT                              SERVER
─────────────────────────────────  ──────────────────────
fetch("/api/user/profile")
├─ Browser tự động attach cookie
│   Cookie: next-auth.session-token=abc123...
│
└─ POST /api/user/profile ──────→  middleware.withAuth()
                                  ├─ Lấy cookie
                                  ├─ Query session từ DB
                                  ├─ Kiểm tra hạn
                                  └─ Lấy userId ✓
                                  
                                  handler(req, {userId})
                                  ├─ Fetch user từ DB
                                  └─ Return data
                                  
                        {"name": "..."}
                        ←──────────
200 OK
```

---

### **Bước 3: Xử Lý Khi "Chìa Khóa" Hết Hạn (Refresh Token) ✅**

#### **Scenario 1: User Quay Lại Sau 30 Ngày**

```
CLIENT                                  SERVER
─────────────────────────────────────  ─────────────────────

User quay lại app sau 30 ngày
│
Session cookie cũ: (hết hạn)
next-auth.session-token=abc123...
│
fetch("/api/user/profile") ────────→  Query session
                                      ├─ SELECT from DB
                                      ├─ Kiểm tra expires
                                      ├─ Thời gian quá cũ ✗
                                      └─ return 401
                                      
← 401 Unauthorized
│
│ apiClient.js tự động:
├─ Detect 401
├─ Gọi /api/auth/session (refresh endpoint)
│
fetch("/api/auth/session") ────────→  NextAuth refresh
                                      ├─ Kiểm tra có valid refresh token
                                      ├─ Tạo session token mới
                                      ├─ SET-COOKIE mới
                                      └─ return 200
                                      
← 200 OK (cookie updated)
│
│ apiClient.js:
├─ Thử lại request cũ
│
fetch("/api/user/profile") ────────→  Query session (MỚI)
                                      ├─ Session hợp lệ ✓
                                      └─ return data
                                      
← 200 OK {user data}
```

#### **Scenario 2: Refresh Vẫn Fail → Logout**

```
Session cũ + refresh token cũ
│
└─ Cả 2 đều hết hạn
   
GET /api/auth/session ──────→ NextAuth
                              ├─ Kiểm tra refresh token
                              ├─ Hết hạn ✗
                              └─ return 401
                              
← 401 Unauthorized

apiClient.js:
├─ Redirect: /signin
└─ Yêu cầu user đăng nhập lại
```

#### **Code Implementation (api-client.ts):**

```typescript
// PART 3 - Bước 3 Implementation
async function refreshSession(): Promise<void> {
  // Tránh gọi nhiều lần cùng lúc
  if (isRefreshing) {
    return refreshPromise || Promise.resolve();
  }

  isRefreshing = true;
  
  try {
    // Gọi NextAuth refresh endpoint
    const response = await fetch("/api/auth/session");
    
    if (response.ok) {
      // ✅ Session đã được refresh
      // Cookie mới đã được set
      await response.json();
    } else {
      // ❌ Không thể refresh
      // Redirect to sign in
      window.location.href = "/signin";
    }
  } finally {
    isRefreshing = false;
  }
}

// Mỗi khi API call nhận 401:
if (response.status === 401) {
  await refreshSession();
  // Retry với cookie mới
  response = await fetch(url, { credentials: "include" });
}
```

---

## 🛡️ Bảo Mật Part 3

| Yếu tố | Bảo vệ? | Cách |
|-------|--------|-----|
| **Session token** | ✅ | HTTPOnly cookie + NEXTAUTH_SECRET signature |
| **XSS attacks** | ✅ | HTTPOnly flag (JS không thể đọc) |
| **CSRF attacks** | ✅ | SameSite=Lax + CSRF token (built-in) |
| **Token theft** | ✅ | Secure flag (HTTPS only) |
| **Token expiration** | ✅ | Auto-refresh logic + DB validation |
| **Simultaneous refresh** | ✅ | De-duplication logic (isRefreshing flag) |

---

## 📱 Usage Examples

### **Example 1: Protected Component (Fetch User Data)**

```typescript
"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

export function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await apiGet("/api/user/profile");
        
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Error:", error);
        // apiClient sẽ redirect to /signin nếu 401
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No user data</div>;

  return <div>Hello {user.name}!</div>;
}
```

### **Example 2: Protected API Route**

```typescript
// app/api/user/profile/route.ts

import { withAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ✅ Handler nhận userId từ context
async function handler(
  req: NextRequest,
  context: { userId: string }
) {
  if (req.method === "GET") {
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
    });
    return NextResponse.json(user);
  }

  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export const GET = (req: NextRequest) => 
  withAuth(handler)(req);
```

### **Example 3: Form Submission (POST)**

```typescript
"use client";

import { apiPost } from "@/lib/api-client";
import { useState } from "react";

export function UpdateProfileForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData);

      const response = await apiPost("/api/user/profile", data);

      if (!response.ok) {
        throw new Error("Update failed");
      }

      alert("Profile updated!");
    } catch (err) {
      setError(err.message);
      // apiClient sẽ tàng hide redirect nếu 401
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="name" placeholder="Name" required />
      <button type="submit" disabled={loading}>
        {loading ? "Updating..." : "Update"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
```

---

## 🔐 Security Checklist Part 3

✅ Session token lưu trong HTTPOnly cookie  
✅ Không bao giờ lộ NEXTAUTH_SECRET  
✅ Cookie tự động gửi (credentials: "include")  
✅ Token refresh logic tự động  
✅ 401 handler redirect to /signin  
✅ De-duplication refresh requests  
✅ Database validation trên server  
✅ Logout xóa session từ DB  

---

## 🎯 Kết Luận Part 3

Bạn đã tuân thủ 100% quy trình bảo mật Part 3:

✅ **Bước 1**: Session token lưu an toàn (HTTPOnly cookie)  
✅ **Bước 2**: Client tự động gắn token (browser tự động)  
✅ **Bước 3**: Token refresh logic (xử lý 401 + refresh)  
✅ **Bước 4**: Database session persistence (lưu vào Prisma)  

**Tổng kết:**
- User đăng nhập lần 1 → Nhận session token
- Token lưu trong HTTPOnly cookie (an toàn)
- Mỗi request tự động gắn cookie
- Token hết hạn → Refresh tự động
- App hoạt động mượt mà 30 ngày
- Refresh fail → Logout + Sign in lại

**🔒 Kết quả: Bảo mật + User Experience tối ưu!**
