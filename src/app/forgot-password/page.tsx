"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Box, Button, Input, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { AuthPageStyled } from "../(auth-pages)/styled";

export default function ForgotPasswordPage() {
	const toast = useToast();
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState(false);

	const submit = useCallback(async () => {
		if (!email.trim()) return;
		setSubmitting(true);
		try {
			await api().post(
				"/api/auth/forgot-password",
				{ email: email.trim() },
				{ baseURL: "" },
			);
			setDone(true);
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed"), { type: "warn" });
		} finally {
			setSubmitting(false);
		}
	}, [email, toast]);

	return (
		<AuthPageStyled>
			<Box className="card">
				<Text className="title">Forgot password</Text>
				{!done ? (
					<>
						<Text className="desc">
							Enter your email and we'll send you a link to reset
							your password.
						</Text>
						<Input
							type="email"
							value={email}
							placeholder="you@example.com"
							onChange={(e) => setEmail(e.target.value)}
						/>
						<Button
							type="button"
							title={submitting ? "Sending…" : "Send reset link"}
							disabled={submitting}
							handleClick={submit}
							background="var(--Main-Blue)"
							color="white"
							borderRadius="8px"
							width="100%"
						/>
					</>
				) : (
					<Text className="desc">
						If an account exists for that email, a reset link has
						been sent.
					</Text>
				)}
				<Box className="footer-link">
					<Link href="/login">Back to sign in</Link>
				</Box>
			</Box>
		</AuthPageStyled>
	);
}
