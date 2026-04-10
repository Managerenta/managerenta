"use client";
import { memo, useMemo, useState } from "react";
import { FiGrid, FiList, FiSearch } from "react-icons/fi";
import { Box, Button, Input } from "@/components";
import { usePropertiesData } from "@/hooks";
import { PropertiesFilterStyled } from "./styled";

interface IProps {
	search: string;
	onSearchChange: (value: string) => void;
	filterType: string;
	onFilterChange: (value: string) => void;
	sortBy: string;
	onSortChange: (value: string) => void;
}

function PropertiesFilter({
	search,
	onSearchChange,
	filterType,
	onFilterChange,
	sortBy,
	onSortChange,
}: IProps) {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const { filterOptions, sortOptions } = usePropertiesData();

	const renderedFilterOptions = useMemo(() => {
		return filterOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [filterOptions]);

	const renderedSortOptions = useMemo(() => {
		return sortOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [sortOptions]);

	return (
		<PropertiesFilterStyled>
			<Box className="left-filters">
				<select
					className="filter-dropdown"
					value={filterType}
					onChange={(e) => onFilterChange(e.target.value)}
				>
					{renderedFilterOptions}
				</select>

				<Box className="search-bar">
					<FiSearch size={16} />
					<Input
						type="text"
						placeholder="Search properties..."
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
				</Box>
			</Box>

			<Box className="right-filters">
				<select
					className="sort-dropdown"
					value={sortBy}
					onChange={(e) => onSortChange(e.target.value)}
				>
					{renderedSortOptions}
				</select>

				<Box className="view-toggle">
					<Box
						className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
					>
						<Button
							type="button"
							title={<FiGrid size={18} />}
							handleClick={() => setViewMode("grid")}
						/>
					</Box>
					<Box
						className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
					>
						<Button
							type="button"
							title={<FiList size={18} />}
							handleClick={() => setViewMode("list")}
						/>
					</Box>
				</Box>
			</Box>
		</PropertiesFilterStyled>
	);
}

export default memo(PropertiesFilter);
