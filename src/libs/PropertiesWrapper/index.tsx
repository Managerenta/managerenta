"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import { Box, Select } from "@/components";
import { usePropertiesData } from "@/hooks";
import { Pagination } from "@/layouts";
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
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState("all");
	const [sortBy, setSortBy] = useState<string>("name");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

	const handleViewModeChange = useCallback((mode: "grid" | "list") => {
		setViewMode(mode);
	}, []);

	const { properties, stats, isLoading, total } = usePropertiesData(
		pageSize,
		offset,
		search,
		filterType,
		sortBy,
	);

	const handleAddProperty = useCallback(() => {
		router.push("/properties/new");
	}, [router]);

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

	const totalPages = useMemo<number>(() => {
		return Math.ceil((total || 1) / pageSize);
	}, [total, pageSize]);

	return (
		<PropertiesWrapperStyled>
			<PropertiesHeader
				stats={stats}
				isLoading={isLoading}
				onAddProperty={handleAddProperty}
			/>
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
				properties={properties}
				isLoading={isLoading}
				viewMode={viewMode}
			/>

			<Box className="pagination-footer">
				<Box className="items-per-page">
					<span>Items per page:</span>
					<Select
						className="page-size"
						isSearchable={false}
						options={[
							{ label: "6", value: "6" },
							{ label: "12", value: "12" },
							{ label: "24", value: "24" },
						]}
						value={String(pageSize)}
						onChange={(v) => {
							setPageSize(Number(v));
							setOffset(0);
						}}
					/>
				</Box>

				<Pagination
					totalPages={totalPages}
					pageSize={pageSize}
					offset={offset}
					setOffset={setOffset}
				/>

				<Box className="showing-info">
					Showing {Math.min(offset + 1, total)}-
					{Math.min(offset + pageSize, total)} of {total} properties
				</Box>
			</Box>
		</PropertiesWrapperStyled>
	);
}

export default memo(PropertiesWrapper);
