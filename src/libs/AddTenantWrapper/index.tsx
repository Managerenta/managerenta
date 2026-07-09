"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import useSWR from "swr";
import { Box, Button, Input, Select, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { AddTenantWrapperStyled } from "./styled";

interface IRawUnit {
	_id: string;
	name: string;
	rent: number;
	property: { _id: string; name: string } | string;
}

interface IGroupedProperty {
	propertyId: string;
	propertyName: string;
	units: IRawUnit[];
}

const EMPTY_FORM = {
	unitId: "",
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

function AddTenantWrapper() {
	const toast = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();

	const preselectedUnit = useMemo(() => {
		const id = searchParams.get("unitId");
		const name = searchParams.get("unitName");
		const rentRaw = searchParams.get("rent");
		const propertyName = searchParams.get("propertyName");
		if (!id || !name || !rentRaw || !propertyName) return null;
		const rent = Number(rentRaw);
		if (!Number.isFinite(rent)) return null;
		return { id, name, rent, propertyName };
	}, [searchParams]);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [form, setForm] = useState<typeof EMPTY_FORM>(() => ({
		...EMPTY_FORM,
		unitId: preselectedUnit?.id ?? "",
	}));
	const [selectedRent, setSelectedRent] = useState<number | null>(
		preselectedUnit?.rent ?? null,
	);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	const hasPreselectedUnit = !!preselectedUnit;

	const { data: unitsResponse, isLoading: unitsLoading } = useSWR<{
		data: IRawUnit[];
	}>(hasPreselectedUnit ? null : "/api/units?status=Vacant", fetcher, {
		revalidateOnMount: true,
		revalidateOnFocus: true,
	});

	const vacantUnits: IRawUnit[] = unitsResponse?.data ?? [];

	const groupedProperties = useMemo<IGroupedProperty[]>(() => {
		const map = new Map<string, IGroupedProperty>();
		for (const unit of vacantUnits) {
			const isPopulated =
				typeof unit.property === "object" && unit.property !== null;
			const pid = isPopulated
				? (unit.property as { _id: string; name: string })._id
				: (unit.property as string);
			const pName = isPopulated
				? (unit.property as { _id: string; name: string }).name
				: "Unknown Property";
			if (!pid) continue;
			if (!map.has(pid)) {
				map.set(pid, {
					propertyId: pid,
					propertyName: pName,
					units: [],
				});
			}
			map.get(pid)?.units.push(unit);
		}
		return Array.from(map.values());
	}, [vacantUnits]);

	useEffect(() => {
		if (preselectedUnit) {
			setForm((prev) => ({ ...prev, unitId: preselectedUnit.id }));
			setSelectedRent(preselectedUnit.rent);
		}
	}, [preselectedUnit]);

	const handleChange = useCallback(
		(field: keyof typeof EMPTY_FORM) =>
			(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
				setForm((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleUnitChange = useCallback(
		(unitId: string) => {
			setForm((prev) => ({ ...prev, unitId }));
			const unit = vacantUnits.find((u) => u._id === unitId);
			setSelectedRent(unit?.rent ?? null);
		},
		[vacantUnits],
	);

	const handleCancel = useCallback(() => {
		router.back();
	}, [router]);

	const handleSubmit = useCallback(async () => {
		if (!form.unitId) {
			toast.push("Please select a unit", { type: "warn" });
			return;
		}
		if (
			!form.name.trim() ||
			!form.phone.trim() ||
			!form.email.trim() ||
			!form.moveInDate
		) {
			toast.push("Please fill in all required fields", { type: "warn" });
			return;
		}

		setIsSubmitting(true);
		try {
			const formData = new FormData();
			formData.append("unitId", form.unitId);
			formData.append("name", form.name.trim());
			formData.append("phone", form.phone.trim());
			formData.append("email", form.email.trim());
			formData.append("moveInDate", form.moveInDate);
			formData.append("rentDueDay", String(Number(form.rentDueDay)));
			if (form.leaseExpiry)
				formData.append("leaseExpiry", form.leaseExpiry);
			if (avatarFile) formData.append("avatar", avatarFile);

			await api().post("/api/tenants", formData);
			toast.push("Tenant added successfully", { type: "success" });
			router.push("/tenants");
			router.refresh();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setIsSubmitting(false);
		}
	}, [form, avatarFile, router, toast]);

	return (
		<AddTenantWrapperStyled>
			<Box className="page-header">
				<Box className="breadcrumb">
					<Link href="/dashboard">Dashboard</Link>
					<span className="separator">&gt;</span>
					<Link href="/tenants">Tenants</Link>
					<span className="separator">&gt;</span>
					<Text className="current">Add Tenant</Text>
				</Box>

				<Box className="title-row">
					<Box className="title-section">
						<Text className="page-title">Add New Tenant</Text>
						<Text className="page-subtitle">
							{hasPreselectedUnit
								? `Adding tenant to ${preselectedUnit?.propertyName} — ${preselectedUnit?.name}`
								: "Select a vacant unit and fill in the tenant details"}
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
				<Box className="form-grid">
					<Box className="form-field full">
						<Text className="field-label">
							Unit <span className="required">*</span>
						</Text>
						{hasPreselectedUnit && preselectedUnit ? (
							<Input
								type="text"
								value={`${preselectedUnit.propertyName} — ${preselectedUnit.name}`}
								disabled
							/>
						) : (
							<Select
								isDisabled={unitsLoading}
								placeholder={
									unitsLoading
										? "Loading units..."
										: vacantUnits.length === 0
											? "No vacant units available"
											: "Select a vacant unit"
								}
								value={form.unitId}
								onChange={handleUnitChange}
								options={groupedProperties.map(
									({ propertyName, units }) => ({
										label: propertyName,
										options: units.map((unit) => ({
											label: unit.name,
											value: unit._id,
										})),
									}),
								)}
							/>
						)}
						{selectedRent !== null && (
							<span className="rent-hint">
								Rent: ₦{selectedRent.toLocaleString("en-NG")}
								/month
							</span>
						)}
					</Box>

					<Box className="form-field full">
						<Text className="field-label">
							Full Name <span className="required">*</span>
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
							Move-in Date <span className="required">*</span>
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
						title={isSubmitting ? "Please wait..." : "Add Tenant"}
						handleClick={handleSubmit}
						disabled={isSubmitting}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>
		</AddTenantWrapperStyled>
	);
}

export default memo(AddTenantWrapper);
