"use client";
import { useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { Box, Text } from "@/components";
import type { Service } from "@/server/iam/arn";
import type { PolicyDocument } from "@/server/iam/types";
import {
	BUILDER_SERVICES,
	type BuilderSelections,
	buildDocumentFromSelections,
	parseSelectionsFromDocument,
	SERVICE_LABELS,
	type ServiceAccess,
} from "./policyBuilder";

const LEVELS: { value: ServiceAccess; label: string }[] = [
	{ value: "off", label: "Off" },
	{ value: "read", label: "Read-only" },
	{ value: "full", label: "Full access" },
];

interface Props {
	/** Seed for edit mode. When it maps cleanly the builder opens; else JSON. */
	initialDocument?: PolicyDocument;
	/** Latest document, or null while the JSON editor holds invalid JSON. */
	onChange: (document: PolicyDocument | null) => void;
}

export default function PolicyBuilder({ initialDocument, onChange }: Props) {
	const initial = useMemo(() => {
		if (!initialDocument) {
			return {
				mode: "builder" as const,
				selections: {} as BuilderSelections,
				json: JSON.stringify(buildDocumentFromSelections({}), null, 2),
			};
		}
		const parsed = parseSelectionsFromDocument(initialDocument);
		return {
			mode: parsed.exact ? ("builder" as const) : ("advanced" as const),
			selections: parsed.selections,
			json: JSON.stringify(initialDocument, null, 2),
		};
	}, [initialDocument]);

	const [mode, setMode] = useState<"builder" | "advanced">(initial.mode);
	const [selections, setSelections] = useState<BuilderSelections>(
		initial.selections,
	);
	// Only drives the Advanced editor; the builder derives its JSON from state.
	const [json, setJson] = useState(initial.json);
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [advancedOpen, setAdvancedOpen] = useState(
		initial.mode === "advanced",
	);

	const builderDoc = useMemo(
		() => buildDocumentFromSelections(selections),
		[selections],
	);
	const builderJson = useMemo(
		() => JSON.stringify(builderDoc, null, 2),
		[builderDoc],
	);

	const setAccess = (service: Service, value: ServiceAccess) => {
		const next: BuilderSelections = { ...selections, [service]: value };
		setSelections(next);
		onChange(buildDocumentFromSelections(next));
	};

	const onJsonChange = (nextText: string) => {
		setJson(nextText);
		try {
			const parsed = JSON.parse(nextText) as PolicyDocument;
			setJsonError(null);
			onChange(parsed);
		} catch {
			setJsonError("Document is not valid JSON");
			onChange(null);
		}
	};

	const switchToAdvanced = () => {
		setJson(builderJson);
		onChange(builderDoc);
		setMode("advanced");
		setAdvancedOpen(true);
	};

	const switchToBuilder = () => {
		// Only adopt the JSON back into the builder if it maps cleanly, else keep
		// editing as JSON so nothing the operator typed is silently dropped.
		try {
			const parsed = JSON.parse(json) as PolicyDocument;
			const res = parseSelectionsFromDocument(parsed);
			if (!res.exact) {
				setJsonError(
					"This policy uses rules the simple builder can't show (e.g. Deny or conditions). Keep editing as JSON.",
				);
				return;
			}
			setSelections(res.selections);
			setJsonError(null);
			onChange(buildDocumentFromSelections(res.selections));
			setMode("builder");
		} catch {
			setJsonError("Fix the JSON before switching back to the builder");
		}
	};

	return (
		<Box className="policy-builder" data-testid="policy-builder">
			{mode === "builder" ? (
				<Box className="builder-grid">
					{BUILDER_SERVICES.map((service) => {
						const current = selections[service] ?? "off";
						return (
							<Box key={service} className="builder-row">
								<Text className="svc-label">
									{SERVICE_LABELS[service]}
								</Text>
								<Box className="segmented">
									{LEVELS.map((lvl) => (
										<button
											key={lvl.value}
											type="button"
											aria-pressed={current === lvl.value}
											data-testid={`svc-${service}-${lvl.value}`}
											className={`seg ${
												current === lvl.value
													? "active"
													: ""
											} ${lvl.value}`}
											onClick={() =>
												setAccess(service, lvl.value)
											}
										>
											{lvl.label}
										</button>
									))}
								</Box>
							</Box>
						);
					})}
				</Box>
			) : (
				<Box className="advanced-note">
					<Text style={{ fontSize: 13 }}>
						Editing this policy as raw JSON.
					</Text>
					<button
						type="button"
						className="link-btn"
						onClick={switchToBuilder}
					>
						Back to simple builder
					</button>
				</Box>
			)}

			<Box className="advanced-wrap">
				<button
					type="button"
					className="link-btn"
					onClick={() => setAdvancedOpen((v) => !v)}
				>
					{advancedOpen ? (
						<FiChevronDown size={14} />
					) : (
						<FiChevronRight size={14} />
					)}
					Advanced (JSON)
				</button>
				{advancedOpen ? (
					<Box className="advanced-body">
						{mode === "builder" ? (
							<>
								<pre
									className="policy-doc"
									data-testid="policy-json-preview"
								>
									{builderJson}
								</pre>
								<button
									type="button"
									className="link-btn"
									onClick={switchToAdvanced}
								>
									Edit as JSON
								</button>
							</>
						) : (
							<textarea
								data-testid="policy-json-editor"
								value={json}
								onChange={(e) => onJsonChange(e.target.value)}
							/>
						)}
						{jsonError ? (
							<Text className="err">{jsonError}</Text>
						) : null}
					</Box>
				) : null}
			</Box>
		</Box>
	);
}
