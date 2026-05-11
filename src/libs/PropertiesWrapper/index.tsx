"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Box } from "@/components";
import { usePropertiesData } from "@/hooks";
import { Pagination, PropertyModal } from "@/layouts";
import type { IPropertyList } from "@/types";
import {
	PropertiesFilter,
	PropertiesGrid,
	PropertiesHeader,
} from "./components";
import { PropertiesWrapperStyled } from "./styled";

function PropertiesWrapper() {
	const router = useRouter();
	const [offset, setOffset] = useState<number>(0);
	const [pageSize, setPageSize] = useState<number>(12);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState("all");
	const [sortBy, setSortBy] = useState("name");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

	const handleViewModeChange = useCallback((mode: "grid" | "list") => {
		setViewMode(mode);
	}, []);

	useEffect(() => setMounted(true), []);

	const { properties, stats, isLoading, mutate, total } = usePropertiesData(
		pageSize,
		offset,
	);

	const openModal = useCallback(() => setIsModalOpen(true), []);
	const closeModal = useCallback(() => setIsModalOpen(false), []);

	const handlePropertyAdded = useCallback(async () => {
		await mutate();
		router.refresh();
	}, [mutate, router]);

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setOffset(0);
	}, []);

	const handleFilterChange = useCallback((value: string) => {
		setFilterType(value);
		setOffset(0);
	}, []);

	const handleSortChange = useCallback((value: string) => {
		setSortBy(value);
		setOffset(0);
	}, []);

	const filteredProperties = useMemo<IPropertyList[]>(() => {
		let result = properties;

		if (filterType !== "all") {
			result = result.filter(
				(p) => p.type.toLowerCase() === filterType.toLowerCase(),
			);
		}

		if (search.trim()) {
			const q = search.trim().toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.address.toLowerCase().includes(q),
			);
		}

		result = [...result].sort((a, b) => {
			switch (sortBy) {
				case "occupancy":
					return (
						b.occupied / b.totalUnits - a.occupied / a.totalUnits
					);
				case "revenue":
					return b.occupied - a.occupied;
				case "units":
					return b.totalUnits - a.totalUnits;
				default:
					return a.name.localeCompare(b.name);
			}
		});

		return result;
	}, [properties, search, filterType, sortBy]);

	const filteredTotal = filteredProperties.length;
	const totalPages = useMemo<number>(() => {
		return Math.ceil((filteredTotal || 1) / pageSize);
	}, [filteredTotal, pageSize]);

	return (
		<PropertiesWrapperStyled>
			<PropertiesHeader
				stats={stats}
				isLoading={isLoading}
				onAddProperty={openModal}
			/>
			{mounted && (
				<PropertyModal
					open={isModalOpen}
					close={closeModal}
					mode={{ type: "add-property" }}
					onSuccess={handlePropertyAdded}
				/>
			)}
			<PropertiesFilter
				search={search}
				onSearchChange={handleSearchChange}
				filterType={filterType}
				onFilterChange={handleFilterChange}
				sortBy={sortBy}
				onSortChange={handleSortChange}
				viewMode={viewMode}
				onViewModeChange={handleViewModeChange}
			/>
			<PropertiesGrid
				properties={filteredProperties}
				isLoading={isLoading}
				viewMode={viewMode}
			/>

			<Box className="pagination-footer">
				<Box className="items-per-page">
					<span>Items per page:</span>
					<select
						value={pageSize}
						onChange={(e) => {
							setPageSize(Number(e.target.value));
							setOffset(0);
						}}
					>
						<option value={6}>6</option>
						<option value={12}>12</option>
						<option value={24}>24</option>
					</select>
				</Box>

				<Pagination
					totalPages={totalPages}
					pageSize={pageSize}
					offset={offset}
					setOffset={setOffset}
				/>

				<Box className="showing-info">
					Showing {Math.min(offset + 1, filteredTotal)}-
					{Math.min(offset + pageSize, filteredTotal)} of{" "}
					{filteredTotal}{" "}
					{filteredTotal !== total
						? `(filtered from ${total})`
						: "properties"}
				</Box>
			</Box>
		</PropertiesWrapperStyled>
	);
}

export default memo(PropertiesWrapper);
