"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { Box, Button, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { AuthPageStyled } from "../../(auth-pages)/styled";

function AcceptInviteInner() {
	const toast = useToast();
	const router = useRouter();
	const search = useSearchParams();
	const token = search.get("token") ?? "";
	const [submitting, setSubmitting] = useState(false);

	// If the proxy bounced us to /login (and back), the original `?token=…`
	// would have been lost. Build a sign-in link that round-trips the token
	// so the invitee lands back here with the token intact after auth.
	const signInLink = useMemo(() => {
		if (!token) return "/login";
		const here = `/invitations/accept?token=${encodeURIComponent(token)}`;
		return `/login?next=${encodeURIComponent(here)}`;
	}, [token]);

	const submit = useCallback(async () => {
		if (!token) {
			toast.push("Missing invitation token", { type: "warn" });
			return;
		}
		setSubmitting(true);
		try {
			const res = await api().post(
				"/api/organizations/invites/accept",
				{ token },
				{ baseURL: "" },
			);
			toast.push(
				`Joined ${res.data?.data?.name ?? "organization"} — switching workspace`,
				{ type: "success" },
			);
			router.push("/dashboard");
		} catch (err) {
			toast.push(getErrorMessage(err, "Could not accept invitation"), {
				type: "warn",
			});
		} finally {
			setSubmitting(false);
		}
	}, [token, router, toast]);

	return (
		<AuthPageStyled>
			<Box className="card">
				<Text className="title">Accept invitation</Text>
				<Text className="desc">
					You've been invited to join an organization. Click below to
					accept and switch into the workspace.
				</Text>
				<Button
					type="button"
					title={submitting ? "Accepting…" : "Accept invitation"}
					disabled={submitting}
					handleClick={submit}
					background="var(--Main-Blue)"
					color="white"
					borderRadius="8px"
					width="100%"
				/>
				<Box className="footer-link">
					<Link href={signInLink}>Need to sign in first?</Link>
				</Box>
			</Box>
		</AuthPageStyled>
	);
}

export default function AcceptInvitePage() {
	return (
		<Suspense fallback={null}>
			<AcceptInviteInner />
		</Suspense>
	);
}
