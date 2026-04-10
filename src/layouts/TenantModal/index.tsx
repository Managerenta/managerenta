"use client";
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { Box, Button, Text } from "@/components";
import { api } from "@/constants";
import { AppContextProvider } from "@/hooks";
import type { ITenantDetail } from "@/types";
import ModalWrapper from "../ModalWrapper";
import { TenantModalStyled } from "./styled";

interface IRawUnit {
	_id: string;
	name: string;
	rent: number;
	// backend may return populated object or raw ID string
	property: { _id: string; name: string } | string;
}

interface IGroupedProperty {
	propertyId: string;
	propertyName: string;
	units: IRawUnit[];
}

export type TenantModalMode =
	| {
			type: "add-tenant";
			preselectedUnit?: {
				id: string;
				name: string;
				rent: number;
				propertyName: string;
			};
	  }
	| { type: "edit-tenant"; tenant: ITenantDetail };

interface IProps {
	open: boolean;
	close: () => void;
	mode: TenantModalMode;
	onSuccess?: () => void;
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

function TenantModal({ open, close, mode, onSuccess }: IProps) {
	const { env } = useContext(AppContextProvider);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [selectedRent, setSelectedRent] = useState<number | null>(null);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	const hasPreselectedUnit =
		mode.type === "add-tenant" && !!mode.preselectedUnit;

	// Only fetch vacant units when add modal is open AND no unit is pre-selected
	const { data: unitsResponse, isLoading: unitsLoading } = useSWR(
		open && mode.type === "add-tenant" && !hasPreselectedUnit
			? `${env.MAIN_SERVICE_URL}/api/units?status=Vacant`
			: null,
		(u: string) =>
			api()
				.get(u)
				.then((r) => r.data),
		{ revalidateOnMount: true, revalidateOnFocus: true },
	);

	const vacantUnits: IRawUnit[] = unitsResponse?.data ?? [];

	// Group units by property for <optgroup>
	// Handle both populated { _id, name } and raw ID string from backend
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

	// Sync form state when mode changes
	useEffect(() => {
		if (mode.type === "edit-tenant") {
			// rentDueDay comes back formatted e.g. "15th" — strip to plain number
			const rawDueDay = String(
				parseInt(mode.tenant.rentDueDay ?? "1", 10) || 1,
			);
			setForm({
				unitId: "",
				name: mode.tenant.name ?? "",
				phone: mode.tenant.phone ?? "",
				email: mode.tenant.email ?? "",
				moveInDate: "", // don't send back a formatted date string
				leaseExpiry: "",
				rentDueDay: rawDueDay,
			});
			setSelectedRent(null);
		} else if (mode.type === "add-tenant" && mode.preselectedUnit) {
			setForm((prev) => ({ ...prev, unitId: mode.preselectedUnit?.id ?? "" }));
			setSelectedRent(mode.preselectedUnit.rent);
		} else {
			setForm(EMPTY_FORM);
			setSelectedRent(null);
		}
	}, [mode]);

	const handleChange = useCallback(
		(field: keyof typeof EMPTY_FORM) =>
			(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
				setForm((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleUnitChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const unitId = e.target.value;
			setForm((prev) => ({ ...prev, unitId }));
			const unit = vacantUnits.find((u) => u._id === unitId);
			setSelectedRent(unit?.rent ?? null);
		},
		[vacantUnits],
	);

	const handleClose = useCallback(() => {
		setForm(EMPTY_FORM);
		setSelectedRent(null);
		setAvatarFile(null);
		close();
	}, [close]);

	const handleSubmit = useCallback(async () => {
		if (mode.type === "add-tenant") {
			if (!form.unitId) {
				toast.error("Please select a unit");
				return;
			}
			if (
				!form.name.trim() ||
				!form.phone.trim() ||
				!form.email.trim() ||
				!form.moveInDate
			) {
				toast.error("Please fill in all required fields");
				return;
			}
		} else {
			if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
				toast.error("Please fill in all required fields");
				return;
			}
		}

		setIsSubmitting(true);
		try {
			if (mode.type === "add-tenant") {
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
				await api().post(
					`${env.MAIN_SERVICE_URL}/api/tenants`,
					formData,
				);
				toast.success("Tenant added successfully");
				setAvatarFile(null);
			} else {
				const formData = new FormData();
				formData.append("name", form.name.trim());
				formData.append("phone", form.phone.trim());
				formData.append("email", form.email.trim());
				formData.append("rentDueDay", String(Number(form.rentDueDay)));
				if (form.moveInDate)
					formData.append("moveInDate", form.moveInDate);
				if (form.leaseExpiry)
					formData.append("leaseExpiry", form.leaseExpiry);
				if (avatarFile) formData.append("avatar", avatarFile);
				await api().patch(
					`${env.MAIN_SERVICE_URL}/api/tenants/${mode.tenant.id}`,
					formData,
				);
				toast.success("Tenant updated successfully");
				setAvatarFile(null);
			}

			onSuccess?.();
			close();
		} catch (err: unknown) {
			const message =
				(err as { response?: { data?: { message?: string } } })
					?.response?.data?.message ?? "Something went wrong";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	}, [env.MAIN_SERVICE_URL, form, avatarFile, mode, close, onSuccess]);

	const isAddMode = mode.type === "add-tenant";

	return (
		<ModalWrapper open={open} close={handleClose}>
			<TenantModalStyled>
				<Box className="modal-header">
					<Text className="modal-title">
						{isAddMode ? "Add New Tenant" : "Edit Tenant"}
					</Text>
					<Text className="modal-subtitle">
						{isAddMode
							? "Select a vacant unit and fill in the tenant details"
							: `Update details for ${(mode as { type: "edit-tenant"; tenant: ITenantDetail }).tenant.name}`}
					</Text>
				</Box>

				<Box className="form-grid">
					{isAddMode && (
						<Box className="form-field full">
							<Text className="field-label">
								Unit <span className="required">*</span>
							</Text>
							{hasPreselectedUnit &&
							mode.type === "add-tenant" &&
							mode.preselectedUnit ? (
								<input
									type="text"
									value={`${mode.preselectedUnit.propertyName} — ${mode.preselectedUnit.name}`}
									disabled
								/>
							) : (
								<select
									value={form.unitId}
									onChange={handleUnitChange}
									disabled={unitsLoading}
								>
									<option value="" disabled>
										{unitsLoading
											? "Loading units..."
											: vacantUnits.length === 0
												? "No vacant units available"
												: "Select a vacant unit"}
									</option>
									{groupedProperties.map(
										({
											propertyId,
											propertyName,
											units,
										}) => (
											<optgroup
												key={propertyId}
												label={propertyName}
											>
												{units.map((unit) => (
													<option
														key={unit._id}
														value={unit._id}
													>
														{unit.name}
													</option>
												))}
											</optgroup>
										),
									)}
								</select>
							)}
							{selectedRent !== null && (
								<span className="rent-hint">
									Rent: ₦
									{selectedRent.toLocaleString("en-NG")}/month
								</span>
							)}
						</Box>
					)}

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
						background="white"
						color="var(--Black)"
						borderRadius="8px"
						border="1px solid #e2e8f0"
					/>
					<Button
						type="button"
						title={
							isSubmitting
								? "Please wait..."
								: isAddMode
									? "Add Tenant"
									: "Save Changes"
						}
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
