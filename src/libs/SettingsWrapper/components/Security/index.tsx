"use client";
import { memo, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Input, Text } from "@/components";
import { api } from "@/constants";
import { AppContextProvider } from "@/hooks";
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
	const { env } = useContext(AppContextProvider);
	const [currentPassword, setCurrentPassword] = useState<string>("");
	const [newPassword, setNewPassword] = useState<string>("");
	const [confirmPassword, setConfirmPassword] = useState<string>("");
	const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(false);
	const [isUpdating, setIsUpdating] = useState<boolean>(false);

	const strengthInfo = useMemo(
		() => getStrengthInfo(newPassword),
		[newPassword],
	);

	const renderedStrengthBars = useMemo(() => {
		return [1, 2, 3, 4].map((segment) => (
			<Box
				key={segment}
				className="strength-bar"
				style={{
					background:
						segment <= strengthInfo.segments ? strengthInfo.color : "#e2e8f0",
				}}
			/>
		));
	}, [strengthInfo]);

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
			await api().post(`${env.MAIN_SERVICE_URL}/api/users/change-password`, {
				currentPassword,
				newPassword,
			});
			toast.success("Password updated successfully");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: unknown) {
			const message =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message ?? "Failed to update password";
			toast.error(message);
		} finally {
			setIsUpdating(false);
		}
	}, [env.MAIN_SERVICE_URL, currentPassword, newPassword, confirmPassword]);

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
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setCurrentPassword(e.target.value)
							}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">New Password</Text>
						<Input
							type="password"
							value={newPassword}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setNewPassword(e.target.value)
							}
						/>
						{newPassword.length > 0 && (
							<>
								<Box className="strength-bars">{renderedStrengthBars}</Box>
								<Text
									className="strength-label"
									style={{ color: strengthInfo.color }}>
									{strengthInfo.label}
								</Text>
							</>
						)}
					</Box>

					<Box className="form-field">
						<Text className="field-label">Confirm New Password</Text>
						<Input
							type="password"
							value={confirmPassword}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setConfirmPassword(e.target.value)
							}
						/>
					</Box>

					<Box className="update-btn">
						<Button
							type="button"
							title={isUpdating ? "Updating..." : "Update Password"}
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
							<Text className="toggle-label">Enable 2FA</Text>
							<Text className="toggle-desc">
								Add an extra layer of security
							</Text>
						</Box>
						<Box
							className={`toggle-switch ${is2FAEnabled ? "active" : ""}`}
							onClick={() => setIs2FAEnabled(!is2FAEnabled)}>
							<Box className="toggle-thumb" />
						</Box>
					</Box>

					<Box className="setup-btn">
						<Button
							type="button"
							title="Set Up 2FA"
							background="white"
							color="var(--Black)"
							border="1px solid #e2e8f0"
							borderRadius="8px"
						/>
					</Box>
				</Box>
			</Box>
		</SecurityStyled>
	);
}

export default memo(Security);
