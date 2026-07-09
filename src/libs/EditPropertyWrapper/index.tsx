"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import useSWR from "swr";
import { Box, Button, Image, Input, Select, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { EditPropertyWrapperStyled } from "./styled";

interface IProps {
	propertyId: string;
}

interface IRawProperty {
	_id: string;
	name: string;
	address: string;
	type: string;
	totalUnits: number;
	monthlyRent: number;
	description?: string;
	image?: string;
}

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

const EMPTY_FORM = {
	name: "",
	address: "",
	type: "",
	totalUnits: "",
	monthlyRent: "",
	description: "",
};

function EditPropertyWrapper({ propertyId }: IProps) {
	const toast = useToast();
	const router = useRouter();

	const {
		data: propertyResponse,
		isLoading,
		mutate,
	} = useSWR<{ data: IRawProperty }>(
		propertyId ? `/api/properties/${propertyId}` : null,
		fetcher,
		{ revalidateOnMount: true, revalidateOnFocus: true },
	);

	const property = useMemo(
		() => propertyResponse?.data ?? null,
		[propertyResponse],
	);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
	const [imageFile, setImageFile] = useState<File | null>(null);

	useEffect(() => {
		if (!property) return;
		setForm({
			name: property.name ?? "",
			address: property.address ?? "",
			type: property.type ?? "",
			totalUnits:
				property.totalUnits != null ? String(property.totalUnits) : "",
			monthlyRent:
				property.monthlyRent != null
					? String(property.monthlyRent)
					: "",
			description: property.description ?? "",
		});
	}, [property]);

	const handleChange = useCallback(
		(field: keyof typeof EMPTY_FORM) =>
			(
				e: React.ChangeEvent<
					HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
				>,
			) => {
				setForm((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleCancel = useCallback(() => {
		router.push(`/properties/${propertyId}`);
	}, [router, propertyId]);

	const handleSubmit = useCallback(async () => {
		if (!form.name.trim() || !form.address.trim() || !form.type) {
			toast.push("Please fill in all required fields", { type: "warn" });
			return;
		}

		setIsSubmitting(true);
		try {
			const formData = new FormData();
			formData.append("name", form.name.trim());
			formData.append("address", form.address.trim());
			formData.append("type", form.type);
			if (form.totalUnits) formData.append("totalUnits", form.totalUnits);
			if (form.monthlyRent)
				formData.append("monthlyRent", form.monthlyRent);
			if (form.description.trim())
				formData.append("description", form.description.trim());
			if (imageFile) formData.append("image", imageFile);

			await api().patch(`/api/properties/${propertyId}`, formData);
			toast.push("Property updated successfully", { type: "success" });
			setImageFile(null);
			await mutate();
			router.push(`/properties/${propertyId}`);
			router.refresh();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setIsSubmitting(false);
		}
	}, [form, imageFile, propertyId, router, toast, mutate]);

	return (
		<EditPropertyWrapperStyled>
			<Box className="page-header">
				<Box className="breadcrumb">
					<Link href="/dashboard">Dashboard</Link>
					<span className="separator">&gt;</span>
					<Link href="/properties">Properties</Link>
					<span className="separator">&gt;</span>
					{property ? (
						<>
							<Link href={`/properties/${propertyId}`}>
								{property.name}
							</Link>
							<span className="separator">&gt;</span>
						</>
					) : null}
					<Text className="current">Edit</Text>
				</Box>

				<Box className="title-row">
					<Box className="title-section">
						<Text className="page-title">Edit Property</Text>
						<Text className="page-subtitle">
							{property
								? `Update details for ${property.name}`
								: "Loading property details..."}
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
				{isLoading && !property ? (
					<Box className="loading-state">Loading property...</Box>
				) : (
					<>
						<Box className="form-grid">
							<Box className="form-field full">
								<Text className="field-label">
									Property Name{" "}
									<span className="required">*</span>
								</Text>
								<Input
									type="text"
									placeholder="e.g. Sunshine Apartments"
									value={form.name}
									onChange={handleChange("name")}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Address <span className="required">*</span>
								</Text>
								<Input
									type="text"
									placeholder="e.g. 12 Park Lane, Lagos"
									value={form.address}
									onChange={handleChange("address")}
								/>
							</Box>

							<Box className="form-field">
								<Text className="field-label">
									Property Type{" "}
									<span className="required">*</span>
								</Text>
								<Select
									placeholder="Select type"
									options={PROPERTY_TYPES.map((t) => ({
										label: t,
										value: t,
									}))}
									value={form.type}
									onChange={(v) =>
										setForm((prev) => ({
											...prev,
											type: v,
										}))
									}
								/>
							</Box>

							<Box className="form-field">
								<Text className="field-label">
									Total Units{" "}
									<span className="optional">(optional)</span>
								</Text>
								<Input
									type="number"
									min="1"
									placeholder="e.g. 10"
									value={form.totalUnits}
									onChange={handleChange("totalUnits")}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Monthly Rent per Unit (₦){" "}
									<span className="optional">(optional)</span>
								</Text>
								<Input
									type="number"
									min="0"
									placeholder="e.g. 500000"
									value={form.monthlyRent}
									onChange={handleChange("monthlyRent")}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Description{" "}
									<span className="optional">(optional)</span>
								</Text>
								<textarea
									placeholder="Optional notes about the property"
									value={form.description}
									onChange={handleChange("description")}
									rows={3}
								/>
							</Box>

							<Box className="form-field full">
								<Text className="field-label">
									Property Image{" "}
									<span className="optional">
										(leave empty to keep current)
									</span>
								</Text>
								{property?.image ? (
									<Box className="current-image">
										<Image
											url={property.image}
											alt={property.name}
											width="72px"
											height="56px"
											borderRadius="8px"
											style={{ objectFit: "cover" }}
										/>
										<Text className="image-hint">
											Upload a new image to replace the
											current one.
										</Text>
									</Box>
								) : null}
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
								disabled={isSubmitting || !property}
								background="var(--Main-Blue)"
								color="white"
								borderRadius="8px"
							/>
						</Box>
					</>
				)}
			</Box>
		</EditPropertyWrapperStyled>
	);
}

export default memo(EditPropertyWrapper);
