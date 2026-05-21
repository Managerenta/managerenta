"use client";
import { memo, useCallback, useEffect, useState } from "react";
import { Box, Button, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import type { ITenantDetail } from "@/types";
import ModalWrapper from "../ModalWrapper";
import { TenantModalStyled } from "./styled";

export type TenantModalMode = { type: "edit-tenant"; tenant: ITenantDetail };

interface IProps {
	open: boolean;
	close: () => void;
	mode: TenantModalMode;
	onSuccess?: () => void;
}

const EMPTY_FORM = {
	name: "",
	phone: "",
	email: "",
	moveInDate: "",
	leaseExpiry: "",
	rentDueDay: "1",
};

function TenantModal({ open, close, mode, onSuccess }: IProps) {
	const toast = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	useEffect(() => {
		// rentDueDay comes back formatted e.g. "15th" — strip to plain number
		const rawDueDay = String(
			parseInt(mode.tenant.rentDueDay ?? "1", 10) || 1,
		);
		setForm({
			name: mode.tenant.name ?? "",
			phone: mode.tenant.phone ?? "",
			email: mode.tenant.email ?? "",
			moveInDate: "",
			leaseExpiry: "",
			rentDueDay: rawDueDay,
		});
	}, [mode]);

	const handleChange = useCallback(
		(field: keyof typeof EMPTY_FORM) =>
			(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
				setForm((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleClose = useCallback(() => {
		setForm(EMPTY_FORM);
		setAvatarFile(null);
		close();
	}, [close]);

	const handleSubmit = useCallback(async () => {
		if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
			toast.push("Please fill in all required fields", { type: "warn" });
			return;
		}

		setIsSubmitting(true);
		try {
			const formData = new FormData();
			formData.append("name", form.name.trim());
			formData.append("phone", form.phone.trim());
			formData.append("email", form.email.trim());
			formData.append("rentDueDay", String(Number(form.rentDueDay)));
			if (form.moveInDate) formData.append("moveInDate", form.moveInDate);
			if (form.leaseExpiry)
				formData.append("leaseExpiry", form.leaseExpiry);
			if (avatarFile) formData.append("avatar", avatarFile);
			await api().patch(`/api/tenants/${mode.tenant.id}`, formData);
			toast.push("Tenant updated successfully", { type: "success" });
			setAvatarFile(null);

			onSuccess?.();
			close();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setIsSubmitting(false);
		}
	}, [form, avatarFile, mode, close, onSuccess, toast]);

	return (
		<ModalWrapper open={open} close={handleClose}>
			<TenantModalStyled>
				<Box className="modal-header">
					<Text className="modal-title">Edit Tenant</Text>
					<Text className="modal-subtitle">
						Update details for {mode.tenant.name}
					</Text>
				</Box>

				<Box className="form-grid">
					<Box className="form-field full">
						<Text className="field-label">
							Full Name <span className="required">*</span>
						</Text>
						<input
							type="text"
							placeholder="e.g. Chioma Okoro"
							value={form.name}
							onChange={handleChange("name")}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">
							Phone <span className="required">*</span>
						</Text>
						<input
							type="tel"
							placeholder="+2348012345678"
							value={form.phone}
							onChange={handleChange("phone")}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">
							Email <span className="required">*</span>
						</Text>
						<input
							type="email"
							placeholder="tenant@email.com"
							value={form.email}
							onChange={handleChange("email")}
						/>
					</Box>

					<Box className="form-field full">
						<Text className="field-label">
							Profile Photo{" "}
							<span className="optional">(optional)</span>
						</Text>
						<input
							type="file"
							accept="image/*"
							onChange={(e) =>
								setAvatarFile(e.target.files?.[0] ?? null)
							}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">
							Move-in Date{" "}
							<span className="optional">(optional)</span>
						</Text>
						<input
							type="date"
							value={form.moveInDate}
							onChange={handleChange("moveInDate")}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">
							Lease Expiry{" "}
							<span className="optional">(optional)</span>
						</Text>
						<input
							type="date"
							value={form.leaseExpiry}
							onChange={handleChange("leaseExpiry")}
						/>
					</Box>

					<Box className="form-field full">
						<Text className="field-label">
							Rent Due Day{" "}
							<span className="optional">(optional)</span>
						</Text>
						<select
							value={form.rentDueDay}
							onChange={handleChange("rentDueDay")}
						>
							{Array.from({ length: 28 }, (_, i) => i + 1).map(
								(day) => (
									<option key={day} value={String(day)}>
										{day}
										{day === 1
											? "st"
											: day === 2
												? "nd"
												: day === 3
													? "rd"
													: "th"}{" "}
										of each month
									</option>
								),
							)}
						</select>
					</Box>
				</Box>

				<Box className="modal-actions">
					<Button
						type="button"
						title="Cancel"
						handleClick={handleClose}
						disabled={isSubmitting}
						background="var(--Surface-Card)"
						color="var(--Black)"
						borderRadius="8px"
						border="1px solid var(--Border-Subtle)"
					/>
					<Button
						type="button"
						title={isSubmitting ? "Please wait..." : "Save Changes"}
						handleClick={handleSubmit}
						disabled={isSubmitting}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</TenantModalStyled>
		</ModalWrapper>
	);
}

export default memo(TenantModal);
