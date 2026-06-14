"use client";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { FiDownload, FiFile, FiTrash2, FiUploadCloud } from "react-icons/fi";
import { Box, Button, Select, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useDocuments, usePropertyOptions, useToast } from "@/hooks";
import { Badge, EntityPageStyled, Modal, StatCard } from "../shared/entity";
import {
	documentCategoryFilterOptions,
	documentCategoryOptions,
	titleCase,
} from "../shared/options";

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsWrapper() {
	const toast = useToast();
	const fileRef = useRef<HTMLInputElement>(null);
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [propertyFilter, setPropertyFilter] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [name, setName] = useState("");
	const [category, setCategory] = useState("");
	const [propertyId, setPropertyId] = useState("");
	const [file, setFile] = useState<File | null>(null);

	const { documents, total, isLoading, mutate } = useDocuments({
		search,
		category: categoryFilter,
		propertyId: propertyFilter || undefined,
	});
	const { options: propertyOptions, nameById } = usePropertyOptions();

	const totalSize = useMemo(
		() => documents.reduce((a, d) => a + (d.size ?? 0), 0),
		[documents],
	);

	const openModal = useCallback(() => {
		setName("");
		setCategory("");
		setPropertyId("");
		setFile(null);
		setModalOpen(true);
	}, []);

	const handleUpload = useCallback(async () => {
		if (!file || !category) {
			toast.push("Pick a file and a category", { type: "warn" });
			return;
		}
		setSubmitting(true);
		try {
			const fd = new FormData();
			fd.append("file", file);
			fd.append("name", name.trim() || file.name);
			fd.append("category", category);
			if (propertyId) fd.append("propertyId", propertyId);
			await api().post("/api/documents", fd);
			toast.push("Document uploaded", { type: "success" });
			setModalOpen(false);
			await mutate();
		} catch (err) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setSubmitting(false);
		}
	}, [file, name, category, propertyId, toast, mutate]);

	const handleDelete = useCallback(
		async (id: string) => {
			try {
				await api().delete(`/api/documents/${id}`);
				toast.push("Document deleted", { type: "success" });
				await mutate();
			} catch (err) {
				toast.push(getErrorMessage(err), { type: "warn" });
			}
		},
		[toast, mutate],
	);

	const rows = useMemo(
		() =>
			documents.map((d) => (
				<tr key={d.id}>
					<td>
						<Text
							style={{
								fontWeight: 600,
								display: "flex",
								alignItems: "center",
								gap: 8,
							}}
						>
							<FiFile size={15} color="var(--Text-Secondary)" />
							{d.name}
						</Text>
						<Text
							style={{
								fontSize: 12,
								color: "var(--Text-Secondary)",
							}}
						>
							{d.fileName}
						</Text>
					</td>
					<td>
						<Badge>{titleCase(d.category)}</Badge>
					</td>
					<td>
						{d.propertyId ? (nameById[d.propertyId] ?? "—") : "—"}
					</td>
					<td>{formatBytes(d.size ?? 0)}</td>
					<td>{new Date(d.createdAt).toLocaleDateString("en-NG")}</td>
					<td>
						<Box className="row-actions">
							{d.url ? (
								<a
									className="icon-btn"
									href={d.url}
									target="_blank"
									rel="noreferrer"
									title="Download"
								>
									<FiDownload size={15} />
								</a>
							) : null}
							<Box
								className="icon-btn danger"
								onClick={() => handleDelete(d.id)}
							>
								<FiTrash2 size={15} />
							</Box>
						</Box>
					</td>
				</tr>
			)),
		[documents, nameById, handleDelete],
	);

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Documents</Text>
					<Text className="subtitle">
						Leases, receipts, IDs and other files in one place.
					</Text>
				</Box>
				<Button
					title="Upload"
					leadingIcon={<FiUploadCloud size={16} />}
					handleClick={openModal}
				/>
			</Box>

			<Box className="stat-grid">
				<StatCard label="Total Documents" value={total} />
				<StatCard label="Storage Used" value={formatBytes(totalSize)} />
			</Box>

			<Box className="toolbar">
				<input
					className="search"
					placeholder="Search documents…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<Box className="filter">
					<Select
						options={documentCategoryFilterOptions}
						value={categoryFilter}
						onChange={setCategoryFilter}
						isSearchable={false}
						placeholder="Category"
					/>
				</Box>
				<Box className="filter">
					<Select
						options={[
							{ label: "All Properties", value: "" },
							...propertyOptions,
						]}
						value={propertyFilter}
						onChange={setPropertyFilter}
						placeholder="Property"
					/>
				</Box>
			</Box>

			<Box className="panel">
				<Box className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Document</th>
								<th>Category</th>
								<th>Property</th>
								<th>Size</th>
								<th>Uploaded</th>
								<th />
							</tr>
						</thead>
						<tbody>{rows}</tbody>
					</table>
				</Box>
				{!isLoading && documents.length === 0 ? (
					<Box className="empty">
						No documents yet. Upload your first file.
					</Box>
				) : null}
			</Box>

			{modalOpen ? (
				<Modal
					title="Upload Document"
					onClose={() => setModalOpen(false)}
					footer={
						<>
							<Button
								title="Cancel"
								variant="ghost"
								handleClick={() => setModalOpen(false)}
							/>
							<Button
								title="Upload"
								handleClick={handleUpload}
								disabled={submitting}
							/>
						</>
					}
				>
					<Box className="field full">
						<Text className="field-label">
							File<span className="req">*</span>
						</Text>
						<input
							ref={fileRef}
							type="file"
							onChange={(e) => {
								const f = e.currentTarget.files?.[0] ?? null;
								setFile(f);
								if (f && !name) setName(f.name);
							}}
						/>
					</Box>
					<Box className="field full">
						<Text className="field-label">Display Name</Text>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Defaults to file name"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">
							Category<span className="req">*</span>
						</Text>
						<Select
							options={documentCategoryOptions}
							value={category}
							onChange={setCategory}
							placeholder="Select category"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Property</Text>
						<Select
							options={propertyOptions}
							value={propertyId}
							onChange={setPropertyId}
							isClearable
							placeholder="Optional"
						/>
					</Box>
				</Modal>
			) : null}
		</EntityPageStyled>
	);
}

export default memo(DocumentsWrapper);
