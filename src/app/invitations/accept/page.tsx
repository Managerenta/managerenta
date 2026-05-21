"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { AuthPageStyled } from "../../(auth-pages)/styled";

function AcceptInviteInner() {
	const router = useRouter();
	const search = useSearchParams();
	const token = search.get("token") ?? "";
	const [submitting, setSubmitting] = useState(false);

	const submit = useCallback(async () => {
		if (!token) {
			toast.error("Missing invitation token");
			return;
		}
		setSubmitting(true);
		try {
			const res = await api().post(
				"/api/organizations/invites/accept",
				{ token },
				{ baseURL: "" },
			);
			toast.success(
				`Joined ${res.data?.data?.name ?? "organization"} — switching workspace`,
			);
			router.push("/dashboard");
		} catch (err) {
			toast.error(getErrorMessage(err, "Could not accept invitation"));
		} finally {
			setSubmitting(false);
		}
	}, [token, router]);

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
					<Link href="/login">Need to sign in first?</Link>
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
