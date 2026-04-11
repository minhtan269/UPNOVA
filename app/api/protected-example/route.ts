import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";

/**
 * PART 3 - Example Protected API Route
 * 
 * Bất kỳ API route được bảo vệ nào cũng cần:
 * 1. Import withAuth middleware
 * 2. Wrap handler với withAuth
 * 3. Nhận userId từ context
 */

async function handler(
  req: NextRequest,
  context: { userId: string }
) {
  const { userId } = context;

  // ✅ Nếu code chạy đến đây = User đã xác minh

  if (req.method === "GET") {
    return NextResponse.json({
      message: "Hello, authenticated user!",
      userId: userId,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    console.log("[API] Protected POST from user:", userId, body);

    return NextResponse.json({
      success: true,
      userId,
      received: body,
    });
  }

  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

// Export protected endpoint
export const GET = (req: NextRequest) => withAuth(handler)(req);
export const POST = (req: NextRequest) => withAuth(handler)(req);
