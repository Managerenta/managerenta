import { type DocumentProps, pdf } from "@react-pdf/renderer";
import type { JSXElementConstructor, ReactElement } from "react";
import type { ITenantTransaction } from "@/types";
import ReceiptDocument from "./ReceiptDocument";

interface ITenantInfo {
	name: string;
	property: string;
	unit: string;
	email: string;
	phone: string;
}

export async function downloadReceipt(
	transaction: ITenantTransaction,
	tenantInfo: ITenantInfo,
): Promise<void> {
	const now = new Date();
	const issuedAt = `${now.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	})}, ${now.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	})}`;

	const doc = (
		<ReceiptDocument
			transaction={transaction}
			tenantInfo={tenantInfo}
			issuedAt={issuedAt}
		/>
	) as ReactElement<DocumentProps, JSXElementConstructor<DocumentProps>>;

	const blob = await pdf(doc).toBlob();
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = `receipt-${transaction.id.slice(0, 8)}-${transaction.date.replace(/\//g, "-")}.pdf`;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}
