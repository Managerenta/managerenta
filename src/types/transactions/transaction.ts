export interface ITransactionType {
	id: string;
	label: string;
	value: string;
	icon: React.ReactNode;
}

export interface IPaymentHistoryItem {
	id: string;
	label: string;
	date: string;
	amount: string;
	amountColor: string;
	note?: string;
	noteColor?: string;
}

export interface ISmartSuggestion {
	id: string;
	label: string;
	description: string;
	bgColor: string;
	iconColor: string;
	icon: React.ReactNode;
}

export interface IKeyboardShortcut {
	id: string;
	label: string;
	key: string;
}
