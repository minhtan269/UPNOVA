/**
 * PART 3 - Bước 2 & 3: Giao tiếp & Xử lý Token Hết Hạn
 * 
 * API Client này tự động:
 * 1. Lấy session token từ NextAuth
 * 2. GAttach vào Authorization header mỗi request
 * 3. Nếu 401 → thử refresh token
 * 4. Nếu vẫn fail → redirect đến sign in
 */

import { getSession } from "next-auth/react";

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Refresh session khi token hết hạn
 */
async function refreshSession(): Promise<void> {
  // Tránh gọi refresh nhiều lần cùng lúc
  if (isRefreshing) {
    return refreshPromise || Promise.resolve();
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Gọi NextAuth refresh endpoint
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        await response.json();
      }
    } catch (error) {
      console.error("[API] Session refresh failed:", error);
      // Redirect to sign in
      window.location.href = "/signin";
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * API Client - Gắn token + handle refresh
 */
export async function apiCall(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await getSession();

  // Chuẩn bị headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Gắn token vào Authorization header
  if (session?.user) {
    // NextAuth v4 sử dụng cookies, nhưng bạn cũng có thể gắn token tường minh
    // headers.Authorization = `Bearer ${session.accessToken}`;
    // (Nếu bạn cấp access token riêng - hiện tại NextAuth lưu vào cookie)
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // ⚡ Quan trọng: gửi cookies
  });

  // PART 3 - Bước 3: Xử lý khi token hết hạn
  if (response.status === 401) {
    console.log("[API] Got 401 - Attempting refresh...");
    await refreshSession();

    // Thử lại request sau khi refresh
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  }

  // ✅ Nếu vẫn 401 sau refresh → redirect đến sign in
  if (response.status === 401) {
    console.error("[API] Unauthorized after refresh - redirecting to sign in");
    window.location.href = "/signin";
  }

  return response;
}

/**
 * Convenience wrappers
 */
export async function apiGet(url: string) {
  return apiCall(url, { method: "GET" });
}

export async function apiPost(url: string, body?: any) {
  return apiCall(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut(url: string, body?: any) {
  return apiCall(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(url: string) {
  return apiCall(url, { method: "DELETE" });
}
