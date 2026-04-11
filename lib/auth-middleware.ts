import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PART 3 - Bước 2: Giao tiếp với Server (Gắn thẻ bài)
 * 
 * Middleware này kiểm tra mỗi request đến API:
 * 1. Lấy Authorization header (hoặc cookie)
 * 2. Xác minh session token
 * 3. Cho phép/từ chối truy cập
 */

export function withAuth(
  handler: (req: NextRequest, context: { userId: string }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Lấy session từ cookie (NextAuth tự động set)
      const sessionCookie = req.cookies.get("next-auth.session-token");

      if (!sessionCookie?.value) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const sessionToken = sessionCookie.value;

      // Querysession từ Database
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 401 }
        );
      }

      // Kiểm tra hạn session
      if (session.expires < new Date()) {
        return NextResponse.json(
          { error: "Session expired" },
          { status: 401 }
        );
      }

      // ✅ Session hợp lệ - tiếp tục xử lý
      return handler(req, { userId: session.userId });
    } catch (error) {
      console.error("[AUTH] Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
