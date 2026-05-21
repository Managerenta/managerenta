"use client";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { Box, Button, Input, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { SecurityStyled } from "./styled";

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
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);

	// 2FA setup state
	const [setupSecret, setSetupSecret] = useState<string | null>(null);
	const [setupUri, setSetupUri] = useState<string | null>(null);
	const [totpCode, setTotpCode] = useState("");
	const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
	const [setupLoading, setSetupLoading] = useState(false);
	const [enableLoading, setEnableLoading] = useState(false);

	const [disablePassword, setDisablePassword] = useState("");
	const [disableLoading, setDisableLoading] = useState(false);

	const { data: profile, mutate } = useSWR<{
		data?: { security?: { twoFactorEnabled?: boolean } };
	}>("/api/users/user-profile", fetcher, { revalidateOnMount: true });

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
			toast.error("Please fill in all password fields");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}
		if (newPassword.length < 6) {
			toast.error("New password must be at least 6 characters");
			return;
		}
		setIsUpdating(true);
		try {
			await api().post("/api/users/change-password", {
				currentPassword,
				newPassword,
			});
			toast.success("Password updated successfully");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to update password"));
		} finally {
			setIsUpdating(false);
		}
	}, [currentPassword, newPassword, confirmPassword]);

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
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to start 2FA setup"));
		} finally {
			setSetupLoading(false);
		}
	}, []);

	const confirmEnable = useCallback(async () => {
		if (totpCode.length !== 6) {
			toast.error("Enter the 6-digit code from your authenticator");
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
			setTotpCode("");
			await mutate();
			toast.success("Two-factor authentication enabled");
		} catch (err) {
			toast.error(getErrorMessage(err, "Invalid code"));
		} finally {
			setEnableLoading(false);
		}
	}, [totpCode, mutate]);

	const handleDisable = useCallback(async () => {
		if (!disablePassword) {
			toast.error("Enter your password to disable 2FA");
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
			toast.success("Two-factor authentication disabled");
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to disable 2FA"));
		} finally {
			setDisableLoading(false);
		}
	}, [disablePassword, mutate]);

	// Reset recovery codes view after a navigation away
	useEffect(() => () => setRecoveryCodes(null), []);

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
								2. Scan or paste:
							</Text>
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
				</Box>
			</Box>
		</SecurityStyled>
	);
}

export default memo(Security);
