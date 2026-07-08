import type { ReactNode } from "react";
import { DashboardWrapper } from "@/components/BodyWrapper/components/Main/components";

/**
 * Layout boundary for the authenticated application. Every route in this group
 * renders inside the dashboard shell (sidebar + navbar). Public/auth routes
 * live in the `(auth)` group and never mount this shell, so the boundary is
 * enforced by the route structure rather than a runtime pathname allowlist.
 *
 * Access is gated server-side by `middleware.ts` (redirects anonymous visitors
 * to /login) and by each API route's `withAuth` guard.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
	return <DashboardWrapper>{children}</DashboardWrapper>;
}
