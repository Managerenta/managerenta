"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { Box, Button, Input, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { AuthPageStyled } from "../styled";

function ResetPasswordInner() {
	const toast = useToast();
	const router = useRouter();
	const search = useSearchParams();
	const token = search.get("token") ?? "";
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const submit = useCallback(async () => {
		if (!token) {
			toast.push("Missing or invalid token", { type: "warn" });
			return;
		}
		if (password.length < 6) {
			toast.push("Password must be at least 6 characters", {
				type: "warn",
			});
			return;
		}
		if (password !== confirm) {
			toast.push("Passwords do not match", { type: "warn" });
			return;
		}
		setSubmitting(true);
		try {
			await api().post(
				"/api/auth/reset-password",
				{ token, newPassword: password },
				{ baseURL: "" },
			);
			toast.push("Password updated. Please sign in.", {
				type: "success",
			});
			router.push("/login");
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to reset password"), {
				type: "warn",
			});
		} finally {
			setSubmitting(false);
		}
	}, [token, password, confirm, router, toast]);

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
