import type { ReactNode } from "react";

/**
 * Layout boundary for public / pre-authentication routes (login, signup,
 * password reset, email verification, invitation acceptance). These pages
 * deliberately do NOT mount the dashboard shell — each renders its own
 * centered card. `middleware.ts` bounces already-authenticated users away
 * from the sign-in pages.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
