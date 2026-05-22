"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Box, Button, Input, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { SecurityStyled } from "./styled";

interface PasskeyRow {
	credentialId: string;
	label: string;
	transports?: string[];
	createdAt?: string;
	lastUsedAt?: string;
}

function getStrengthInfo(password: string): {
	label: string;
	color: string;
	segments: number;
} {
	if (password.length === 0)
		return { label: "", color: "#e2e8f0", segments: 0 };
	if (password.length < 6)
		return { label: "Weak", color: "#ef4444", segments: 1 };
	if (password.length < 8)
		return { label: "Fair", color: "#f59e0b", segments: 2 };
	const hasUpper = /[A-Z]/.test(password);
	const hasNumber = /[0-9]/.test(password);
	const hasSpecial = /[^A-Za-z0-9]/.test(password);
	const isLong = password.length >= 12;
	const score = [hasUpper, hasNumber, hasSpecial, isLong].filter(
		Boolean,
	).length;
	if (score <= 1) return { label: "Fair", color: "#f59e0b", segments: 2 };
	if (score === 2) return { label: "Good", color: "#22c55e", segments: 3 };
	return { label: "Strong", color: "#16a34a", segments: 4 };
}

function Security() {
	const toast = useToast();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);

	// 2FA setup state
	const [setupSecret, setSetupSecret] = useState<string | null>(null);
	const [setupUri, setSetupUri] = useState<string | null>(null);
	const [setupQrCode, setSetupQrCode] = useState<string | null>(null);
	const [totpCode, setTotpCode] = useState("");
	const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
	const [setupLoading, setSetupLoading] = useState(false);
	const [enableLoading, setEnableLoading] = useState(false);

	const [disablePassword, setDisablePassword] = useState("");
	const [disableLoading, setDisableLoading] = useState(false);

	// Passkey state
	const [passkeyLabel, setPasskeyLabel] = useState("");
	const [passkeyAddLoading, setPasskeyAddLoading] = useState(false);
	const [passkeyRemovingId, setPasskeyRemovingId] = useState<string | null>(
		null,
	);

	const { data: profile, mutate } = useSWR<{
		data?: { security?: { twoFactorEnabled?: boolean } };
	}>("/api/users/user-profile", fetcher, { revalidateOnMount: true });

	const { data: passkeysData, mutate: mutatePasskeys } = useSWR<{
		data?: { passkeys?: PasskeyRow[] };
	}>("/api/users/passkeys", fetcher, { revalidateOnMount: true });
	const passkeys = passkeysData?.data?.passkeys ?? [];

	const twoFactorEnabled = profile?.data?.security?.twoFactorEnabled ?? false;

	const strengthInfo = useMemo(
		() => getStrengthInfo(newPassword),
		[newPassword],
	);
	const renderedStrengthBars = useMemo(
		() =>
			[1, 2, 3, 4].map((segment) => (
				<Box
					key={segment}
					className="strength-bar"
					style={{
						background:
							segment <= strengthInfo.segments
								? strengthInfo.color
								: "#e2e8f0",
					}}
				/>
			)),
		[strengthInfo],
	);

	const handleUpdatePassword = useCallback(async () => {
		if (!currentPassword || !newPassword || !confirmPassword) {
			toast.push("Please fill in all password fields", { type: "warn" });
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.push("New passwords do not match", { type: "warn" });
			return;
		}
		if (newPassword.length < 6) {
			toast.push("New password must be at least 6 characters", {
				type: "warn",
			});
			return;
		}
		setIsUpdating(true);
		try {
			await api().post("/api/users/change-password", {
				currentPassword,
				newPassword,
			});
			toast.push("Password updated successfully", { type: "success" });
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to update password"), {
				type: "warn",
			});
		} finally {
			setIsUpdating(false);
		}
	}, [currentPassword, newPassword, confirmPassword, toast]);

	const startSetup = useCallback(async () => {
		setSetupLoading(true);
		try {
			const res = await api().post(
				"/api/users/2fa/setup",
				{},
				{ baseURL: "" },
			);
			setSetupSecret(res.data?.data?.secret ?? null);
			setSetupUri(res.data?.data?.otpauthUrl ?? null);
			setSetupQrCode(res.data?.data?.qrCodeDataUrl ?? null);
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to start 2FA setup"), {
				type: "warn",
			});
		} finally {
			setSetupLoading(false);
		}
	}, [toast]);

	const confirmEnable = useCallback(async () => {
		if (totpCode.length !== 6) {
			toast.push("Enter the 6-digit code from your authenticator", {
				type: "warn",
			});
			return;
		}
		setEnableLoading(true);
		try {
			const res = await api().post(
				"/api/users/2fa/enable",
				{ token: totpCode },
				{ baseURL: "" },
			);
			setRecoveryCodes(res.data?.data?.recoveryCodes ?? []);
			setSetupSecret(null);
			setSetupUri(null);
			setSetupQrCode(null);
			setTotpCode("");
			await mutate();
			toast.push("Two-factor authentication enabled", {
				type: "success",
			});
		} catch (err) {
			toast.push(getErrorMessage(err, "Invalid code"), { type: "warn" });
		} finally {
			setEnableLoading(false);
		}
	}, [totpCode, mutate, toast]);

	const handleDisable = useCallback(async () => {
		if (!disablePassword) {
			toast.push("Enter your password to disable 2FA", { type: "warn" });
			return;
		}
		setDisableLoading(true);
		try {
			await api().post(
				"/api/users/2fa/disable",
				{ password: disablePassword },
				{ baseURL: "" },
			);
			await mutate();
			setDisablePassword("");
			toast.push("Two-factor authentication disabled", {
				type: "success",
			});
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to disable 2FA"), {
				type: "warn",
			});
		} finally {
			setDisableLoading(false);
		}
	}, [disablePassword, mutate, toast]);

	// Reset recovery codes view after a navigation away
	useEffect(() => () => setRecoveryCodes(null), []);

	const handleAddPasskey = useCallback(async () => {
		// Browsers without WebAuthn (very old, or some embedded views) — fail
		// fast with a useful message instead of letting the lib throw a
		// cryptic "credentials.create is not a function".
		if (
			typeof window === "undefined" ||
			!window.PublicKeyCredential ||
			typeof navigator.credentials?.create !== "function"
		) {
			toast.push("Passkeys aren't supported in this browser", {
				type: "warn",
			});
			return;
		}
		setPasskeyAddLoading(true);
		try {
			const trimmedLabel = passkeyLabel.trim();
			const optsRes = await api().post(
				"/api/users/passkeys/register/options",
				trimmedLabel ? { label: trimmedLabel } : {},
				{ baseURL: "" },
			);
			const optionsJSON = optsRes.data?.data;
			if (!optionsJSON) throw new Error("Bad response from server");

			// startRegistration prompts the browser/OS for the user gesture
			// and returns the attestation we forward to /verify.
			const attestation = await startRegistration({ optionsJSON });

			await api().post(
				"/api/users/passkeys/register/verify",
				{
					response: attestation,
					...(trimmedLabel ? { label: trimmedLabel } : {}),
				},
				{ baseURL: "" },
			);
			setPasskeyLabel("");
			await mutatePasskeys();
			toast.push("Passkey added", { type: "success" });
		} catch (err) {
			// User-cancelled is a DOMException with name 'NotAllowedError' —
			// it's expected and shouldn't surface as a scary error.
			if (err instanceof DOMException && err.name === "NotAllowedError") {
				toast.push("Passkey setup cancelled", { type: "warn" });
			} else {
				toast.push(getErrorMessage(err, "Failed to add passkey"), {
					type: "warn",
				});
			}
		} finally {
			setPasskeyAddLoading(false);
		}
	}, [passkeyLabel, mutatePasskeys, toast]);

	const handleRemovePasskey = useCallback(
		async (credentialId: string) => {
			setPasskeyRemovingId(credentialId);
			try {
				await api().delete(
					`/api/users/passkeys/${encodeURIComponent(credentialId)}`,
					{ baseURL: "" },
				);
				await mutatePasskeys();
				toast.push("Passkey removed", { type: "success" });
			} catch (err) {
				toast.push(getErrorMessage(err, "Failed to remove passkey"), {
					type: "warn",
				});
			} finally {
				setPasskeyRemovingId(null);
			}
		},
		[mutatePasskeys, toast],
	);

	return (
		<SecurityStyled>
			<Text className="section-title">Security</Text>

			<Box className="security-grid">
				<Box className="password-section">
					<Text className="sub-title">Change Password</Text>

					<Box className="form-field">
						<Text className="field-label">Current Password</Text>
						<Input
							type="password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">New Password</Text>
						<Input
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
						/>
						{newPassword.length > 0 && (
							<>
								<Box className="strength-bars">
									{renderedStrengthBars}
								</Box>
								<Text
									className="strength-label"
									style={{ color: strengthInfo.color }}
								>
									{strengthInfo.label}
								</Text>
							</>
						)}
					</Box>

					<Box className="form-field">
						<Text className="field-label">
							Confirm New Password
						</Text>
						<Input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>
					</Box>

					<Box className="update-btn">
						<Button
							type="button"
							title={isUpdating ? "Updating…" : "Update Password"}
							handleClick={handleUpdatePassword}
							disabled={isUpdating}
							background="#ef4444"
							color="white"
							borderRadius="8px"
						/>
					</Box>
				</Box>

				<Box className="twofa-section">
					<Text className="sub-title">Two-Factor Authentication</Text>

					<Box className="twofa-toggle">
						<Box className="toggle-info">
							<Text className="toggle-label">Status</Text>
							<Text className="toggle-desc">
								{twoFactorEnabled ? "Enabled" : "Disabled"}
							</Text>
						</Box>
						<Box
							className={`toggle-switch ${
								twoFactorEnabled ? "active" : ""
							}`}
						>
							<Box className="toggle-thumb" />
						</Box>
					</Box>

					{!twoFactorEnabled && !setupSecret && (
						<Box className="setup-btn">
							<Button
								type="button"
								title={setupLoading ? "Loading…" : "Set Up 2FA"}
								handleClick={startSetup}
								disabled={setupLoading}
								background="var(--Surface-Card)"
								color="var(--Black)"
								border="1px solid var(--Border-Subtle)"
								borderRadius="8px"
							/>
						</Box>
					)}

					{!twoFactorEnabled && setupSecret && (
						<Box className="setup-card">
							<Text className="setup-step">
								1. Add an authenticator (Google Authenticator,
								1Password, Authy).
							</Text>
							<Text className="setup-step">
								2. Scan the QR code, or enter the secret
								manually:
							</Text>
							{setupQrCode && (
								<Box className="setup-qr">
									{/** biome-ignore lint/performance/noImgElement: data URL, not a remote asset */}
									<img
										src={setupQrCode}
										alt="Two-factor authentication QR code"
										width={200}
										height={200}
									/>
								</Box>
							)}
							<code className="setup-secret">{setupSecret}</code>
							{setupUri && (
								<a
									className="setup-link"
									href={setupUri}
									target="_blank"
									rel="noreferrer"
								>
									Open in authenticator app
								</a>
							)}
							<Text className="setup-step">
								3. Enter the 6-digit code:
							</Text>
							<Input
								type="text"
								value={totpCode}
								placeholder="123456"
								onChange={(e) =>
									setTotpCode(
										e.target.value.replace(/\D/g, ""),
									)
								}
							/>
							<Box className="setup-btn">
								<Button
									type="button"
									title={
										enableLoading
											? "Verifying…"
											: "Verify & Enable"
									}
									handleClick={confirmEnable}
									disabled={enableLoading}
									background="var(--Main-Blue)"
									color="white"
									borderRadius="8px"
								/>
							</Box>
						</Box>
					)}

					{recoveryCodes && recoveryCodes.length > 0 && (
						<Box className="setup-card">
							<Text className="sub-title">Recovery codes</Text>
							<Text className="setup-step">
								Store these somewhere safe. They will not be
								shown again.
							</Text>
							<Box className="recovery-list">
								{recoveryCodes.map((c) => (
									<code key={c}>{c}</code>
								))}
							</Box>
						</Box>
					)}

					{twoFactorEnabled && (
						<Box className="setup-card">
							<Text className="sub-title">Disable 2FA</Text>
							<Text className="setup-step">
								Confirm your password to disable 2FA.
							</Text>
							<Input
								type="password"
								value={disablePassword}
								onChange={(e) =>
									setDisablePassword(e.target.value)
								}
							/>
							<Box className="setup-btn">
								<Button
									type="button"
									title={
										disableLoading
											? "Disabling…"
											: "Disable 2FA"
									}
									handleClick={handleDisable}
									disabled={disableLoading}
									background="#ef4444"
									color="white"
									borderRadius="8px"
								/>
							</Box>
						</Box>
					)}

					<Box className="passkey-section">
						<Text className="sub-title">Passkeys</Text>
						<Text className="setup-step">
							Use a passkey (Face ID, Touch ID, Windows Hello, or
							a hardware key) to sign in without a password, or as
							your second factor.
						</Text>

						{passkeys.length > 0 && (
							<Box className="passkey-list">
								{passkeys.map((pk) => (
									<Box
										key={pk.credentialId}
										className="passkey-row"
									>
										<Box className="passkey-info">
											<Text className="passkey-name">
												{pk.label}
											</Text>
											{pk.lastUsedAt && (
												<Text className="passkey-meta">
													Last used{" "}
													{new Date(
														pk.lastUsedAt,
													).toLocaleDateString()}
												</Text>
											)}
										</Box>
										<Button
											type="button"
											title={
												passkeyRemovingId ===
												pk.credentialId
													? "Removing…"
													: "Remove"
											}
											handleClick={() =>
												handleRemovePasskey(
													pk.credentialId,
												)
											}
											disabled={
												passkeyRemovingId ===
												pk.credentialId
											}
											background="transparent"
											color="#ef4444"
											border="1px solid #ef4444"
											borderRadius="6px"
										/>
									</Box>
								))}
							</Box>
						)}

						<Box className="form-field">
							<Text className="field-label">
								Name this passkey (optional)
							</Text>
							<Input
								type="text"
								value={passkeyLabel}
								placeholder="e.g. MacBook Touch ID"
								onChange={(e) =>
									setPasskeyLabel(e.target.value)
								}
							/>
						</Box>

						<Box className="setup-btn">
							<Button
								type="button"
								title={
									passkeyAddLoading
										? "Waiting for authenticator…"
										: "Add a passkey"
								}
								handleClick={handleAddPasskey}
								disabled={passkeyAddLoading}
								background="var(--Main-Blue)"
								color="white"
								borderRadius="8px"
							/>
						</Box>
					</Box>
				</Box>
			</Box>
		</SecurityStyled>
	);
}

export default memo(Security);
