import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Middleware cho phép tất cả routes access
    // Client-side sẽ handle login modal logic
    return;
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Cho phép tất cả requests (client sẽ handle authentication UI)
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    // Allow tất cả routes (không redirect)
    "/((?!api/auth|_next/static|_next/image|favicon).*)",
  ],
};
