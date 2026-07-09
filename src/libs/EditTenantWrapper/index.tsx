"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import useSWR from "swr";
import { Box, Button, Image, Input, Select, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import type { IRawTenantDetail } from "@/types";
import { EditTenantWrapperStyled } from "./styled";

interface IProps {
	tenantId: string;
}

const EMPTY_FORM = {
	name: "",
	phone: "",
	email: "",
	moveInDate: "",
	leaseExpiry: "",
	rentDueDay: "1",
};

const RENT_DUE_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1).map(
	(day) => ({
		label: `${day}${
			day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"
		} of each month`,
		value: String(day),
	}),
);

function toDateInputValue(iso?: string): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toISOString().slice(0, 10);
}

function EditTenantWrapper({ tenantId }: IProps) {
	const toast = useToast();
	const router = useRouter();

	const {
		data: tenantResponse,
		isLoading,
		mutate,
	} = useSWR<{ data: IRawTenantDetail }>(
		tenantId ? `/api/tenants/${tenantId}` : null,
		fetcher,
		{ revalidateOnMount: true, revalidateOnFocus: true },
	);

	const tenant = useMemo(
		() => tenantResponse?.data ?? null,
		[tenantResponse],
	);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	useEffect(() => {
		if (!tenant) return;
		setForm({
			name: tenant.name ?? "",
			phone: tenant.phone ?? "",
			email: tenant.email ?? "",
			moveInDate: toDateInputValue(tenant.moveInDate),
			leaseExpiry: toDateInputValue(tenant.leaseExpiry),
			rentDueDay: String(tenant.rentDueDay ?? 1),
		});
	}, [tenant]);

	const handleChange = useCallback(
		(field: keyof typeof EMPTY_FORM) =>
			(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
				setForm((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleCancel = useCallback(() => {
		router.push(`/tenants/${tenantId}`);
	}, [router, tenantId]);

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

			await api().patch(`/api/tenants/${tenantId}`, formData);
			toast.push("Tenant updated successfully", { type: "success" });
			setAvatarFile(null);
			await mutate();
			router.push(`/tenants/${tenantId}`);
			router.refresh();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setIsSubmitting(false);
		}
	}, [form, avatarFile, tenantId, router, toast, mutate]);

	return (
		<EditTenantWrapperStyled>
			<Box className="page-header">
				<Box className="breadcrumb">
					<Link href="/dashboard">Dashboard</Link>
					<span className="separator">&gt;</span>
					<Link href="/tenants">Tenants</Link>
					<span className="separator">&gt;</span>
					{tenant ? (
						<>
							<Link href={`/tenants/${tenantId}`}>
								{tenant.name}
							</Link>
							<span className="separator">&gt;</span>
						</>
					) : null}
					<Text className="current">Edit</Text>
				</Box>

				<Box className="title-row">
					<Box className="title-section">
						<Text className="page-title">Edit Tenant</Text>
						<Text className="page-subtitle">
							{tenant
								? `Update details for ${tenant.name}`
								: "Loading tenant details..."}
						</Text>
					</Box>
					<Box className="close-btn">
						<Button
							type="button"
							title={<FiX size={20} />}
							handleClick={handleCancel}
							background="transparent"
							color="#64748b"
							borderRadius="8px"
						/>
					</Box>
				</Box>
			</Box>

			<Box className="form-card">
				{isLoading && !tenant ? (
					<Box className="loading-state">Loading tenant...</Box>
				) : (
					<>
						<Box className="form-grid">
							{tenant ? (
								<Box className="form-field full">
									<Text className="field-label">Unit</Text>
									<Input
										type="text"
										value={`${tenant.property} — ${tenant.unit}`}
										disabled
									/>
									<span className="unit-readonly">
										Unit assignment cannot be changed here.
									</span>
								</Box>
							) : null}

							<Box className="form-field full">
								<Text className="field-label">
									Full Name{" "}
									<span className="required">*</span>
								</Text>
								<Input
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
								<Input
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
								<Input
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
								{tenant?.avatar ? (
									<Box className="current-avatar">
										<Image
											url={tenant.avatar}
											alt={tenant.name}
											width="48px"
											height="48px"
											borderRadius="50%"
											style={{ objectFit: "cover" }}
										/>
										<Text className="avatar-hint">
											Upload a new image to replace the
											current photo.
										</Text>
									</Box>
								) : null}
								<input
									type="file"
									accept="image/*"
									onChange={(e) =>
										setAvatarFile(
											e.target.files?.[0] ?? null,
										)
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
								<Select
									isSearchable={false}
									options={RENT_DUE_DAY_OPTIONS}
									value={form.rentDueDay}
									onChange={(v) =>
										setForm((prev) => ({
											...prev,
											rentDueDay: v,
										}))
									}
								/>
							</Box>
						</Box>

						<Box className="form-actions">
							<Button
								type="button"
								title="Cancel"
								handleClick={handleCancel}
								disabled={isSubmitting}
								background="var(--Surface-Card)"
								color="var(--Black)"
								borderRadius="8px"
								border="1px solid var(--Border-Subtle)"
							/>
							<Button
								type="button"
								title={
									isSubmitting
										? "Please wait..."
										: "Save Changes"
								}
								handleClick={handleSubmit}
								disabled={isSubmitting || !tenant}
								background="var(--Main-Blue)"
								color="white"
								borderRadius="8px"
							/>
						</Box>
					</>
				)}
			</Box>
		</EditTenantWrapperStyled>
	);
}

export default memo(EditTenantWrapper);
