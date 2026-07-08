"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useState } from "react";
import { FiX } from "react-icons/fi";
import { Box, Button, Select, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { AddPropertyWrapperStyled } from "./styled";

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

const EMPTY_PROPERTY_FORM = {
	name: "",
	address: "",
	type: "",
	monthlyRent: "",
	description: "",
};

function AddPropertyWrapper() {
	const toast = useToast();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [propertyForm, setPropertyForm] = useState(EMPTY_PROPERTY_FORM);
	const [imageFile, setImageFile] = useState<File | null>(null);

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

	const handleCancel = useCallback(() => {
		router.push("/properties");
	}, [router]);

	const handleSubmit = useCallback(async () => {
		if (
			!propertyForm.name.trim() ||
			!propertyForm.address.trim() ||
			!propertyForm.type
		) {
			toast.push("Please fill in all required fields", { type: "warn" });
			return;
		}

		setIsSubmitting(true);
		try {
			const formData = new FormData();
			formData.append("name", propertyForm.name.trim());
			formData.append("address", propertyForm.address.trim());
			formData.append("type", propertyForm.type);
			if (propertyForm.monthlyRent)
				formData.append("monthlyRent", propertyForm.monthlyRent);
			if (propertyForm.description.trim())
				formData.append("description", propertyForm.description.trim());
			if (imageFile) formData.append("image", imageFile);

			await api().post("/api/properties", formData);
			toast.push("Property added successfully", { type: "success" });
			router.push("/properties");
			router.refresh();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setIsSubmitting(false);
		}
	}, [propertyForm, imageFile, router, toast]);

	return (
		<AddPropertyWrapperStyled>
			<Box className="page-header">
				<Box className="breadcrumb">
					<Link href="/dashboard">Dashboard</Link>
					<span className="separator">&gt;</span>
					<Link href="/properties">Properties</Link>
					<span className="separator">&gt;</span>
					<Text className="current">Add Property</Text>
				</Box>

				<Box className="title-row">
					<Box className="title-section">
						<Text className="page-title">Add New Property</Text>
						<Text className="page-subtitle">
							Fill in the details for your new property
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
							Property Name <span className="required">*</span>
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
							Property Type <span className="required">*</span>
						</Text>
						<Select
							placeholder="Select type"
							options={PROPERTY_TYPES.map((t) => ({
								label: t,
								value: t,
							}))}
							value={propertyForm.type}
							onChange={(v) =>
								setPropertyForm((prev) => ({
									...prev,
									type: v,
								}))
							}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">
							Monthly Rent per Unit (₦){" "}
							<span className="optional">(optional)</span>
						</Text>
						<input
							type="number"
							min="0"
							placeholder="e.g. 500000"
							value={propertyForm.monthlyRent}
							onChange={handlePropertyChange("monthlyRent")}
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
							onChange={handlePropertyChange("description")}
							rows={3}
						/>
					</Box>

					<Box className="form-field full">
						<Text className="field-label">
							Property Image{" "}
							<span className="optional">(optional)</span>
						</Text>
						<input
							type="file"
							accept="image/*"
							onChange={(e) =>
								setImageFile(e.target.files?.[0] ?? null)
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
						title={isSubmitting ? "Please wait..." : "Add Property"}
						handleClick={handleSubmit}
						disabled={isSubmitting}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>
		</AddPropertyWrapperStyled>
	);
}

export default memo(AddPropertyWrapper);
