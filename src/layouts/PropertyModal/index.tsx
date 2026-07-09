"use client";
import { memo, useCallback, useState } from "react";
import { Box, Button, Input, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import ModalWrapper from "../ModalWrapper";
import { PropertyModalStyled } from "./styled";

export type PropertyModalMode = {
	type: "add-unit";
	propertyId: string;
	existingUnitCount: number;
};

interface IProps {
	open: boolean;
	close: () => void;
	mode: PropertyModalMode;
	onSuccess?: () => void;
}

function PropertyModal({ open, close, mode, onSuccess }: IProps) {
	const toast = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [unitForm, setUnitForm] = useState({ name: "", rent: "" });

	const handleUnitChange = useCallback(
		(field: keyof typeof unitForm) =>
			(e: React.ChangeEvent<HTMLInputElement>) => {
				setUnitForm((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleClose = useCallback(() => {
		setUnitForm({ name: "", rent: "" });
		close();
	}, [close]);

	const handleSubmit = useCallback(async () => {
		if (!unitForm.name.trim()) {
			toast.push("Unit name is required", { type: "warn" });
			return;
		}
		if (!unitForm.rent || Number(unitForm.rent) <= 0) {
			toast.push("Please enter a valid rent amount", { type: "warn" });
			return;
		}

		setIsSubmitting(true);
		try {
			await api().post(`/api/properties/${mode.propertyId}/units`, {
				name: unitForm.name.trim(),
				rent: Number(unitForm.rent),
			});
			toast.push("Unit added successfully", { type: "success" });
			setUnitForm({ name: "", rent: "" });

			onSuccess?.();
			close();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setIsSubmitting(false);
		}
	}, [mode, unitForm, close, onSuccess, toast]);

	const unitNamePlaceholder = `e.g. Block 1 Flat ${String.fromCharCode(65 + mode.existingUnitCount)}`;

	return (
		<ModalWrapper open={open} close={handleClose}>
			<PropertyModalStyled>
				<Box className="modal-header">
					<Text className="modal-title">Add New Unit</Text>
					<Text className="modal-subtitle">
						This will be unit {mode.existingUnitCount + 1}
					</Text>
				</Box>

				<Box className="form-grid">
					<Box className="form-field full">
						<Text className="field-label">
							Unit Name <span className="required">*</span>
						</Text>
						<Input
							type="text"
							placeholder={unitNamePlaceholder}
							value={unitForm.name}
							onChange={handleUnitChange("name")}
						/>
					</Box>

					<Box className="form-field full">
						<Text className="field-label">
							Monthly Rent (₦) <span className="required">*</span>
						</Text>
						<Input
							type="number"
							min="1"
							placeholder="e.g. 150000"
							value={unitForm.rent}
							onChange={handleUnitChange("rent")}
						/>
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
						title={isSubmitting ? "Please wait..." : "Add Unit"}
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
