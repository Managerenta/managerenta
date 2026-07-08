"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Box, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { AuthPageStyled } from "../styled";

function VerifyEmailInner() {
	const search = useSearchParams();
	const token = search.get("token") ?? "";
	const [status, setStatus] = useState<"verifying" | "ok" | "error">(
		"verifying",
	);
	const [message, setMessage] = useState<string>("");

	const verify = useCallback(async () => {
		if (!token) {
			setStatus("error");
			setMessage("Missing verification token");
			return;
		}
		try {
			await api().post(
				"/api/auth/verify-email",
				{ token },
				{ baseURL: "" },
			);
			setStatus("ok");
			setMessage("Your email has been verified.");
		} catch (err) {
			setStatus("error");
			setMessage(getErrorMessage(err, "Verification failed"));
		}
	}, [token]);

	useEffect(() => {
		verify();
	}, [verify]);

	return (
		<AuthPageStyled>
			<Box className="card">
				<Text className="title">Email verification</Text>
				{status === "verifying" && (
					<Text className="desc">Verifying…</Text>
				)}
				{status === "ok" && (
					<>
						<Text className="desc success">{message}</Text>
						<Box className="footer-link">
							<Link href="/login">Continue to sign in</Link>
						</Box>
					</>
				)}
				{status === "error" && (
					<>
						<Text className="desc error">{message}</Text>
						<Box className="footer-link">
							<Link href="/login">Back to sign in</Link>
						</Box>
					</>
				)}
			</Box>
		</AuthPageStyled>
	);
}

export default function VerifyEmailPage() {
	return (
		<Suspense fallback={null}>
			<VerifyEmailInner />
		</Suspense>
	);
}
