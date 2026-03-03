"use client";
import { memo, useState, useMemo, useCallback } from "react";
import { FiUpload } from "react-icons/fi";
import { Box, Button, Input, Text } from "@/components";
import { useAddTransactionData, useAddTransactionNavigation } from "@/hooks";
import { TransactionFormStyled } from "./styled";

function TransactionForm() {
	const [selectedType, setSelectedType] = useState<string>("rent");
	const [amount, setAmount] = useState<string>("450,000");
	const [notes, setNotes] = useState<string>("");
	const [transactionDate, setTransactionDate] = useState<string>("2024-12-20");
	const [paymentMethod, setPaymentMethod] = useState<string>("bank-transfer");

	const { transactionTypes, paymentMethods } = useAddTransactionData();
	const { closeAddTransaction } = useAddTransactionNavigation();

	const renderedTypes = useMemo(() => {
		return transactionTypes.map(({ id, label, value, icon }) => (
			<Box
				key={id}
				className={`type-card ${selectedType === value ? "active" : ""}`}
				onClick={() => setSelectedType(value)}>
				<Box className="type-icon">{icon}</Box>
				<Text className="type-label">{label}</Text>
			</Box>
		));
	}, [transactionTypes, selectedType]);

	const renderedPaymentMethods = useMemo(() => {
		return paymentMethods.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [paymentMethods]);

	const handleCancel = useCallback(() => {
		closeAddTransaction();
	}, [closeAddTransaction]);

	const handleSave = useCallback(() => {
		console.log("Save transaction:", {
			type: selectedType,
			amount,
			notes,
			transactionDate,
			paymentMethod,
		});
	}, [selectedType, amount, notes, transactionDate, paymentMethod]);

	return (
		<TransactionFormStyled>
			<Box className="form-section">
				<Text className="section-label">Transaction Type</Text>
				<Box className="type-grid">{renderedTypes}</Box>
			</Box>

			<Box className="form-row">
				<Box className="form-field">
					<Text className="field-label">Amount</Text>
					<Box className="amount-input">
						<Text className="currency-prefix">₦</Text>
						<Input
							type="text"
							value={amount}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setAmount(e.target.value)
							}
							placeholder="0"
						/>
					</Box>
				</Box>

				<Box className="form-field">
					<Text className="field-label">Description/Notes (Optional)</Text>
					<textarea
						className="notes-textarea"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Add notes about this transaction..."
						rows={4}
					/>
				</Box>
			</Box>

			<Box className="form-row">
				<Box className="form-field">
					<Text className="field-label">Transaction Date</Text>
					<Input
						type="date"
						value={transactionDate}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setTransactionDate(e.target.value)
						}
					/>
				</Box>

				<Box className="form-field">
					<Text className="field-label">Receipt/Proof (Optional)</Text>
					<Box className="upload-zone">
						<FiUpload size={24} />
						<Text className="upload-text">Drag & drop files here or</Text>
						<Text className="upload-link">Choose File</Text>
						<Text className="upload-hint">JPG, PNG, PDF up to 10MB</Text>
					</Box>
				</Box>
			</Box>

			<Box className="form-row single">
				<Box className="form-field half">
					<Text className="field-label">Payment Method</Text>
					<select
						className="method-select"
						value={paymentMethod}
						onChange={(e) => setPaymentMethod(e.target.value)}>
						{renderedPaymentMethods}
					</select>
				</Box>
			</Box>

			<Box className="form-actions">
				<Box className="cancel-btn">
					<Button
						type="button"
						title="Cancel"
						handleClick={handleCancel}
						background="white"
						color="var(--Black)"
						border="1px solid #e2e8f0"
						borderRadius="8px"
					/>
				</Box>
				<Box className="save-btn">
					<Button
						type="button"
						title="Save Transaction"
						handleClick={handleSave}
						background="#ef4444"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>
		</TransactionFormStyled>
	);
}

export default memo(TransactionForm);
