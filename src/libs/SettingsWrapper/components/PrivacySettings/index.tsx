"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { PrivacySettingsStyled } from "./styled";

function PrivacySettings() {
	const router = useRouter();
	const [exporting, setExporting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmText, setConfirmText] = useState("");

	const handleExport = useCallback(async () => {
		setExporting(true);
		try {
			const res = await api().get("/api/users/data-export", {
				baseURL: "",
			});
			const blob = new Blob([JSON.stringify(res.data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `managerenta-export-${
				new Date().toISOString().split("T")[0]
			}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("Data exported");
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to export data"));
		} finally {
			setExporting(false);
		}
	}, []);

	const handleDelete = useCallback(async () => {
		setDeleting(true);
		try {
			await api().delete("/api/users", { baseURL: "" });
			await api().delete("/api/auth/logout", { baseURL: "" });
			toast.success("Account scheduled for deletion");
			router.push("/login");
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to delete account"));
		} finally {
			setDeleting(false);
		}
	}, [router]);

	return (
		<PrivacySettingsStyled>
			<Box className="section">
				<Text className="section-title">Export your data</Text>
				<Text className="section-desc">
					Download a JSON archive of your profile, organizations,
					properties, tenants, transactions, and notification log.
				</Text>
				<Box className="action-btn">
					<Button
						type="button"
						title={exporting ? "Preparing…" : "Download my data"}
						handleClick={handleExport}
						disabled={exporting}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>

			<Box className="section danger">
				<Text className="section-title">Delete account</Text>
				<Text className="section-desc">
					Permanently removes your account, properties, tenants and
					transaction history. This cannot be undone. Type{" "}
					<b>DELETE</b> to confirm.
				</Text>
				<input
					className="confirm-input"
					placeholder="Type DELETE to confirm"
					value={confirmText}
					onChange={(e) => setConfirmText(e.target.value)}
				/>
				<Box className="action-btn">
					<Button
						type="button"
						title={deleting ? "Deleting…" : "Delete my account"}
						disabled={confirmText !== "DELETE" || deleting}
						handleClick={handleDelete}
						background="#ef4444"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>
		</PrivacySettingsStyled>
	);
}

export default memo(PrivacySettings);
