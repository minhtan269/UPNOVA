# 🔐 Auth Security Flow - Part 2: Server-Side Verification

## 📊 Sơ đồ Toàn Bộ Quy Trình (Part 1 + Part 2)

```
CLIENT (Browser)                          SERVER (Node.js Backend)
────────────────────────────────────      ─────────────────────────────

1. User click "Sign In with Google"
   │
2. NextAuth opens Google popup
   │
3. User enters Google password
   │
4. Google returns Authorization Code
   │
5. Authorization Code sent to /api/auth/callback/google
   │                               ├─→ STEP 1 (Bước 1 Part 2)
   │                               │   NextAuth + Google libs xác minh Token
   │                               │   - Kiểm tra chữ ký (Signature) ✓
   │                               │   - Kiểm tra thời hạn (Expiration) ✓
   │                               │   - Kiểm tra Audience (ứng dụng) ✓
   │                               │
   │                               ├─→ signIn() callback
   │                               │   ID Token được xác minh 100%
   │                               │   providerAccountId = "sub" (không đổi)
   │                               │
   │                               ├─→ STEP 2 (Bước 2 Part 2)
   │                               │   PrismaAdapter trích xuất:
   │                               │   - sub (Google user ID vĩnh viễn)
   │                               │   - email, name, image
   │                               │
   │                               ├─→ STEP 3 (Bước 3 Part 2)
   │                               │   Database Lookup:
   │                               │   SELECT * FROM Account 
   │                               │   WHERE provider="google" 
   │                               │   AND providerAccountId=sub
   │                               │   
   │                               │   IF EXISTS:
   │                               │     → User quay lại (Sign In)
   │                               │     → Cập nhật lastLogin
   │                               │   ELSE:
   │                               │     → User mới (Auto Sign Up)
   │                               │     → Tạo User + Account record
   │                               │
   │                               ├─→ jwt() callback
   │                               │   Tạo JWT Token với:
   │                               │   - userId: nội bộ database ID
   │                               │   - googleId: sub từ Google
   │                               │   - Email, permissions
   │                               │   - Ký bằng NEXTAUTH_SECRET
   │                               │
   │                               ├─→ STEP 4 (Bước 4 Part 2)
   │                               │   Cấp Access Token:
   │                               │   - Tạo Session Cookie
   │                               │   - Ký bằng NEXTAUTH_SECRET
   │                               │   - HTTPOnly + Secure flags
   │                               │
6. Session Cookie returned
   ←──────────────────────────────
   
7. Browser stores cookie (HTTPOnly - JS không thể đọc)
   │
8. Next requests gửi cookie tự động
   │                               ├─→ Server xác minh cookie
   │                               │   - Kiểm tra chữ ký
   │                               │   - Kiểm tra thời hạn
   │                               │   - Lấy userId từ JWT
   │                               │
9. Truy cập được dữ liệu ✓
```

---

## 🔑 Part 2: Chi Tiết Các Bước Server

### **Bước 1: Xác Thực Tính Hợp Lệ của Token ✅**

```typescript
// Khi: Authorization Code arrive tại server

// NextAuth + Google libraries tự động:
// 1. POS Authorization Code đến Google Token Endpoint
// 2. Dùng GOOGLE_SECRET để trao đổi lấy ID Token
// 3. Kéo Google Public Keys từ https://www.googleapis.com/oauth2/v3/certs
// 4. Verify chữ ký bằng public keys

// ❌ Nếu Token fake:
// - Chữ ký không match → REJECT
// - Thời hạn quá hạn → REJECT  
// - Audience khác app → REJECT
// → Server không bao giờ tạo session

// ✅ Nếu Token thật:
// → Tiếp tục bước 2
```

**Điểm quan trọng:**
- Chỉ **Server** có `GOOGLE_SECRET`
- Client không bao giờ nhận `GOOGLE_SECRET`
- Chỉ Server mới có thể đổi Authorization Code lấy ID Token
- Kẻ xấu không thể giả mạo (không có secret key)

---

### **Bước 2: Trích Xuất Thông Tin Người Dùng ✅**

```typescript
// ID Token được trích xuất, có dạng JWT. Nội dung:
{
  "iss": "https://accounts.google.com",
  "azp": "YOUR_GOOGLE_CLIENT_ID",
  "aud": "YOUR_GOOGLE_CLIENT_ID",
  "sub": "110169214123456789",  // ⚡ Google User ID - KHÔNG BAO GIỜ ĐỔI
  "email": "user@gmail.com",
  "email_verified": true,
  "at_hash": "...",
  "iat": 1234567890,
  "exp": 1234571490,
  "name": "User Name",
  "picture": "https://...",
  "given_name": "User",
  "family_name": "Name",
  "locale": "en"
}
```

**Tại sao dùng `sub` thay vì `email`?**

| Trường | Có thể đổi? | Dùng để? |
|-------|-----------|---------|
| `email` | ✓ Có thay đổi | Hiển thị, liên hệ |
| `sub` | ✗ KHÔNG bao giờ | Liên kết database (unique key) |

**Ví dụ:**
- User có email: `john@gmail.com`
- User đổi email thành: `john.doe@gmail.com`
- Nhưng `sub` vẫn là: `110169214123456789` (không đổi)
- Database của bạn sẽ liên kết: `Account.providerAccountId = "110169214123456789"`

---

### **Bước 3: Đối Chiếu Với Database ✅**

**Prisma Schema:**
```prisma
model User {
  id            String    @id         // Internal database ID
  name          String?
  email         String?   @unique
  image         String?
  googleId      String?   @unique    // Có thể lưu sub ở đây
  createdAt     DateTime  @default(now())
}

model Account {
  id                 String    @id
  userId             String    // Link đến User
  provider           String    // "google"
  providerAccountId  String    // Đây là "sub" - Google user ID
  
  @@unique([provider, providerAccountId])  // ⚡ Không cho trùng
}
```

**Logic đối chiếu:**
```typescript
// PrismaAdapter tự động làm:

const account = await prisma.account.findUnique({
  where: {
    provider_providerAccountId: {
      provider: "google",
      providerAccountId: "110169214123456789", // sub
    },
  },
  include: { user: true },
});

if (account) {
  // ✅ User cũ quay lại → SIGN IN
  return account.user;
} else {
  // ✅ User mới → AUTO SIGN UP
  const newUser = await prisma.user.create({
    data: {
      email: "user@gmail.com",
      name: "User Name",
      image: "https://...",
      accounts: {
        create: {
          provider: "google",
          providerAccountId: "110169214123456789", // sub
          type: "oauth",
        },
      },
    },
  });
  return newUser;
}
```

**Bảo mật:**
- Email không phải unique key (user có thể đổi)
- `sub` mới là unique key bất biến
- Kẻ xấu không thể giả mạo `sub` (đã được Google ký)

---

### **Bước 4: Cấp "Thẻ Thành Viên Riêng" (Local Access Token) ✅**

```typescript
// NextAuth tạo JWT Session Token:

const sessionToken = jwt.sign({
  sub: user.id,              // User ID nội bộ của server
  googleId: "110169...",     // Google sub (tham khảo)
  email: user.email,
  iat: now,
  exp: now + 30days,         // Hạn 30 ngày
}, NEXTAUTH_SECRET);

// Lưu vào HTTPOnly Cookie:
// Set-Cookie: next-auth.session-token=<sessionToken>; 
//   HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

**Lợi ích:**
- ✅ Session được ký bằng `NEXTAUTH_SECRET` (chỉ server biết)
- ✅ Client không thể đọc Cookie (HTTPOnly flag)
- ✅ Client không thể sửa Cookie (nếu sửa → chữ ký invalid)
- ✅ Không phải hỏi Google lại trong 30 ngày
- ✅ Nếu ID Token Google hết hạn, session vẫn còn hạn

---

## 🛡️ Tóm Tắt Bảo Mật

| Yếu tố | Được bảo vệ? | Cách |
|-------|-------------|-----|
| **Authorization Code** | ✅ | Server-to-Google channel (HTTPS) |
| **ID Token** | ✅ | Google signature + NEXTAUTH_SECRET |
| **Google secret** | ✅ | Chỉ server biết, không public |
| **Session Cookie** | ✅ | Ký bằng NEXTAUTH_SECRET + HTTPOnly |
| **User ID** | ✅ | Liên kết bằng `sub` (không đổi) |
| **Email spoofing** | ✅ | Không thể fake `sub` |
| **Session tampering** | ✅ | Chữ ký invalid ngay |

---

## 🔍 Logs & Debugging

Khi deploy, kiểm tra logs:

```
[AUTH] Google Sign-In verified:
  sub: 110169214123456789
  email: user@gmail.com
  name: User Name
  timestamp: 2024-04-10T...

[AUTH] Session created:
  userId: clv1hl7m8...
  email: user@gmail.com
  provider: google
  timestamp: 2024-04-10T...
```

---

## ❌ Lỗi Cơ Bản Cần Tránh

```typescript
// ❌ KHÔNG LÀM: Email là unique key
Account.providerAccountId = email  // SAIS!

// ✅ LÀM: sub là unique key
Account.providerAccountId = sub    // ĐÚNG!

// ❌ KHÔNG LÀM: Tin email từ request body
const email = req.body.email;
await signIn(email);               // NGUY HIỂM!

// ✅ LÀM: Chỉ tin email từ verified token
const email = idToken.email;       // ĐÚNG!

// ❌ KHÔNG LÀM: Gửi ID Token lại cho client
response.idToken = idToken;        // ĐỌC!

// ✅ LÀM: Gửi session cookie
response.cookie = sessionCookie;   // ĐÚNG!
```

---

## 📱 Kiểm Tra Trên Client

```typescript
// Sau sign in, client có thể:
const { data: session } = useSession();

console.log(session.user.id);       // User ID nội bộ
console.log(session.user.email);    // Email đã xác minh
console.log(session.user.googleId); // Google sub (reference)

// Nhưng session KHÔNG chứa:
// - ID Token từ Google
// - Google refresh token
// - Raw JWT secret
```

---

## ✅ Kết Luận

Bạn đã tuân thủ **100% quy trình bảo mật Part 2**:

✅ Xác thực Token từ Google  
✅ Trích xuất `sub` (không phải email)  
✅ Đối chiếu database tự động (sign in hoặc sign up)  
✅ Cấp local access token (session cookie)  
✅ Không bao giờ gửi Google secret xuống client  
✅ Không bao giờ tin email trực tiếp từ request  

**🔒 Kết quả: 100% bảo mật!**
