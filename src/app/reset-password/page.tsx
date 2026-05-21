"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Input, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { AuthPageStyled } from "../(auth-pages)/styled";

function ResetPasswordInner() {
	const router = useRouter();
	const search = useSearchParams();
	const token = search.get("token") ?? "";
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const submit = useCallback(async () => {
		if (!token) {
			toast.error("Missing or invalid token");
			return;
		}
		if (password.length < 6) {
			toast.error("Password must be at least 6 characters");
			return;
		}
		if (password !== confirm) {
			toast.error("Passwords do not match");
			return;
		}
		setSubmitting(true);
		try {
			await api().post(
				"/api/auth/reset-password",
				{ token, newPassword: password },
				{ baseURL: "" },
			);
			toast.success("Password updated. Please sign in.");
			router.push("/login");
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to reset password"));
		} finally {
			setSubmitting(false);
		}
	}, [token, password, confirm, router]);

	return (
		<AuthPageStyled>
			<Box className="card">
				<Text className="title">Reset password</Text>
				<Text className="desc">
					Choose a new password for your account.
				</Text>
				<Input
					type="password"
					value={password}
					placeholder="New password"
					onChange={(e) => setPassword(e.target.value)}
				/>
				<Input
					type="password"
					value={confirm}
					placeholder="Confirm new password"
					onChange={(e) => setConfirm(e.target.value)}
				/>
				<Button
					type="button"
					title={submitting ? "Updating…" : "Update password"}
					disabled={submitting}
					handleClick={submit}
					background="var(--Main-Blue)"
					color="white"
					borderRadius="8px"
					width="100%"
				/>
				<Box className="footer-link">
					<Link href="/login">Back to sign in</Link>
				</Box>
			</Box>
		</AuthPageStyled>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={null}>
			<ResetPasswordInner />
		</Suspense>
	);
}
