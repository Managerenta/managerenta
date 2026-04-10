"use client";
import { memo, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Text } from "@/components";
import { api } from "@/constants";
import { AppContextProvider } from "@/hooks";
import type { IPropertyDetail } from "@/types";
import ModalWrapper from "../ModalWrapper";
import { PropertyModalStyled } from "./styled";

const PROPERTY_TYPES = [
	"Apartment",
	"House",
	"Commercial",
	"Land",
	"Studio",
	"Duplex",
	"Bungalow",
	"High-rise",
];

export type PropertyModalMode =
	| { type: "add-property" }
	| { type: "edit-property"; property: IPropertyDetail }
	| { type: "add-unit"; propertyId: string; existingUnitCount: number };

interface IProps {
	open: boolean;
	close: () => void;
	mode: PropertyModalMode;
	onSuccess?: () => void;
}

const EMPTY_PROPERTY_FORM = {
	name: "",
	address: "",
	type: "",
	totalUnits: "",
	monthlyRent: "",
	description: "",
};

function PropertyModal({ open, close, mode, onSuccess }: IProps) {
	const { env } = useContext(AppContextProvider);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [propertyForm, setPropertyForm] = useState(EMPTY_PROPERTY_FORM);
	const [unitForm, setUnitForm] = useState({ name: "", rent: "" });
	const [imageFile, setImageFile] = useState<File | null>(null);

	useEffect(() => {
		if (mode.type === "edit-property") {
			setPropertyForm({
				name: mode.property.name,
				address: mode.property.address,
				type: mode.property.type,
				totalUnits: String(mode.property.totalUnits),
				monthlyRent: String(mode.property.monthlyRent),
				description: "",
			});
		} else if (mode.type === "add-property") {
			setPropertyForm(EMPTY_PROPERTY_FORM);
		} else {
			setUnitForm({ name: "", rent: "" });
		}
		setImageFile(null);
	}, [mode]);

	const handlePropertyChange = useCallback(
		(field: keyof typeof EMPTY_PROPERTY_FORM) =>
			(
				e: React.ChangeEvent<
					HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
				>,
			) => {
				setPropertyForm((prev) => ({
					...prev,
					[field]: e.target.value,
				}));
			},
		[],
	);

	const handleUnitChange = useCallback(
		(field: keyof typeof unitForm) =>
			(e: React.ChangeEvent<HTMLInputElement>) => {
				setUnitForm((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleClose = useCallback(() => {
		setImageFile(null);
		close();
	}, [close]);

	const handleSubmit = useCallback(async () => {
		setIsSubmitting(true);
		try {
			if (mode.type === "add-property") {
				if (
					!propertyForm.name.trim() ||
					!propertyForm.address.trim() ||
					!propertyForm.type
				) {
					toast.error("Please fill in all required fields");
					return;
				}
				const formData = new FormData();
				formData.append("name", propertyForm.name.trim());
				formData.append("address", propertyForm.address.trim());
				formData.append("type", propertyForm.type);
				if (propertyForm.monthlyRent)
					formData.append("monthlyRent", propertyForm.monthlyRent);
				if (propertyForm.description.trim())
					formData.append(
						"description",
						propertyForm.description.trim(),
					);
				if (imageFile) formData.append("image", imageFile);
				await api().post(
					`${env.MAIN_SERVICE_URL}/api/properties`,
					formData,
				);
				toast.success("Property added successfully");
				setPropertyForm(EMPTY_PROPERTY_FORM);
				setImageFile(null);
			} else if (mode.type === "edit-property") {
				if (
					!propertyForm.name.trim() ||
					!propertyForm.address.trim() ||
					!propertyForm.type
				) {
					toast.error("Please fill in all required fields");
					return;
				}
				const formData = new FormData();
				formData.append("name", propertyForm.name.trim());
				formData.append("address", propertyForm.address.trim());
				formData.append("type", propertyForm.type);
				if (propertyForm.totalUnits)
					formData.append("totalUnits", propertyForm.totalUnits);
				if (propertyForm.monthlyRent)
					formData.append("monthlyRent", propertyForm.monthlyRent);
				if (propertyForm.description.trim())
					formData.append(
						"description",
						propertyForm.description.trim(),
					);
				if (imageFile) formData.append("image", imageFile);
				await api().patch(
					`${env.MAIN_SERVICE_URL}/api/properties/${mode.property.id}`,
					formData,
				);
				toast.success("Property updated successfully");
				setImageFile(null);
			} else {
				if (!unitForm.name.trim()) {
					toast.error("Unit name is required");
					return;
				}
				if (!unitForm.rent || Number(unitForm.rent) <= 0) {
					toast.error("Please enter a valid rent amount");
					return;
				}
				await api().post(
					`${env.MAIN_SERVICE_URL}/api/properties/${mode.propertyId}/units`,
					{ name: unitForm.name.trim(), rent: Number(unitForm.rent) },
				);
				toast.success("Unit added successfully");
				setUnitForm({ name: "", rent: "" });
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
	}, [
		mode,
		propertyForm,
		unitForm,
		imageFile,
		env.MAIN_SERVICE_URL,
		close,
		onSuccess,
	]);

	const title =
		mode.type === "add-property"
			? "Add New Property"
			: mode.type === "edit-property"
				? "Edit Property"
				: "Add New Unit";

	const subtitle =
		mode.type === "add-property"
			? "Fill in the details for your new property"
			: mode.type === "edit-property"
				? `Update the details for ${mode.property.name}`
				: `This will be unit ${(mode as { type: "add-unit"; existingUnitCount: number }).existingUnitCount + 1}`;

	const submitLabel =
		mode.type === "add-property"
			? "Add Property"
			: mode.type === "edit-property"
				? "Save Changes"
				: "Add Unit";

	const unitNamePlaceholder =
		mode.type === "add-unit"
			? `e.g. Block 1 Flat ${String.fromCharCode(65 + mode.existingUnitCount)}`
			: "";

	return (
		<ModalWrapper open={open} close={handleClose}>
			<PropertyModalStyled>
				<Box className="modal-header">
					<Text className="modal-title">{title}</Text>
					<Text className="modal-subtitle">{subtitle}</Text>
				</Box>

				<Box className="form-grid">
					{mode.type !== "add-unit" ? (
						<>
							<Box className="form-field full">
								<Text className="field-label">
									Property Name{" "}
									<span className="required">*</span>
								</Text>
								<input
									type="text"
									placeholder="e.g. Sunshine Apartments"
									value={propertyForm.name}
									onChange={handlePropertyChange("name")}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Address <span className="required">*</span>
								</Text>
								<input
									type="text"
									placeholder="e.g. 12 Park Lane, Lagos"
									value={propertyForm.address}
									onChange={handlePropertyChange("address")}
								/>
							</Box>

							<Box className="form-field">
								<Text className="field-label">
									Property Type{" "}
									<span className="required">*</span>
								</Text>
								<select
									value={propertyForm.type}
									onChange={handlePropertyChange("type")}
								>
									<option value="" disabled>
										Select type
									</option>
									{PROPERTY_TYPES.map((t) => (
										<option key={t} value={t}>
											{t}
										</option>
									))}
								</select>
							</Box>

							{mode.type === "edit-property" && (
								<Box className="form-field">
									<Text className="field-label">
										Total Units{" "}
										<span className="optional">
											(optional)
										</span>
									</Text>
									<input
										type="number"
										min="1"
										placeholder="e.g. 10"
										value={propertyForm.totalUnits}
										onChange={handlePropertyChange(
											"totalUnits",
										)}
									/>
								</Box>
							)}

							<Box className="form-field full">
								<Text className="field-label">
									Monthly Rent per Unit (₦){" "}
									<span className="optional">(optional)</span>
								</Text>
								<input
									type="number"
									min="0"
									placeholder="e.g. 500000"
									value={propertyForm.monthlyRent}
									onChange={handlePropertyChange(
										"monthlyRent",
									)}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Description{" "}
									<span className="optional">(optional)</span>
								</Text>
								<textarea
									placeholder="Optional notes about the property"
									value={propertyForm.description}
									onChange={handlePropertyChange(
										"description",
									)}
									rows={3}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Property Image{" "}
									<span className="optional">
										{mode.type === "edit-property"
											? "(leave empty to keep current)"
											: "(optional)"}
									</span>
								</Text>
								<input
									type="file"
									accept="image/*"
									onChange={(e) =>
										setImageFile(
											e.target.files?.[0] ?? null,
										)
									}
								/>
							</Box>
						</>
					) : (
						<>
							<Box className="form-field full">
								<Text className="field-label">
									Unit Name{" "}
									<span className="required">*</span>
								</Text>
								<input
									type="text"
									placeholder={unitNamePlaceholder}
									value={unitForm.name}
									onChange={handleUnitChange("name")}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Monthly Rent (₦){" "}
									<span className="required">*</span>
								</Text>
								<input
									type="number"
									min="1"
									placeholder="e.g. 150000"
									value={unitForm.rent}
									onChange={handleUnitChange("rent")}
								/>
							</Box>
						</>
					)}
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
						title={isSubmitting ? "Please wait..." : submitLabel}
						handleClick={handleSubmit}
						disabled={isSubmitting}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</PropertyModalStyled>
		</ModalWrapper>
	);
}

export default memo(PropertyModal);
