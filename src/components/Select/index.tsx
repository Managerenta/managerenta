"use client";
import { useMemo } from "react";
import ReactSelect, {
	type GroupBase,
	type OptionsOrGroups,
	type StylesConfig,
} from "react-select";

export interface ISelectOption {
	label: string;
	value: string;
}

export interface ISelectOptionGroup {
	label: string;
	options: ISelectOption[];
}

type OptionOrGroup = ISelectOption | ISelectOptionGroup;

interface IProps {
	options: ReadonlyArray<OptionOrGroup>;
	value?: string | string[] | null;
	onChange: (value: string) => void;
	onChangeMulti?: (value: string[]) => void;
	placeholder?: string;
	isMulti?: boolean;
	isDisabled?: boolean;
	isClearable?: boolean;
	isSearchable?: boolean;
	id?: string;
	className?: string;
}

/**
 * Project-wide dropdown. Every select element in the app uses this component so
 * the look stays consistent and theme-aware (it reads the same CSS custom
 * properties as the rest of the UI, so light/dark mode just works).
 */
const styles: StylesConfig<ISelectOption, boolean, GroupBase<ISelectOption>> = {
	control: (base, state) => ({
		...base,
		minHeight: 44,
		background: "var(--Surface-Card)",
		borderRadius: "var(--mr-radius-sm)",
		borderColor: state.isFocused
			? "var(--mr-color-border-focus)"
			: "var(--Border-Subtle)",
		boxShadow: state.isFocused
			? "0 0 0 3px var(--mr-color-brand-soft)"
			: "none",
		fontSize: "var(--mr-fs-md)",
		cursor: "pointer",
		transition:
			"border-color var(--mr-dur-fast), box-shadow var(--mr-dur-fast)",
		":hover": { borderColor: "var(--mr-color-border-strong)" },
	}),
	valueContainer: (base) => ({ ...base, padding: "2px 12px" }),
	placeholder: (base) => ({ ...base, color: "var(--mr-color-text-subtle)" }),
	singleValue: (base) => ({ ...base, color: "var(--Text-Primary)" }),
	input: (base) => ({ ...base, color: "var(--Text-Primary)" }),
	indicatorSeparator: (base) => ({
		...base,
		background: "var(--Border-Subtle)",
	}),
	dropdownIndicator: (base) => ({
		...base,
		color: "var(--mr-color-text-subtle)",
		":hover": { color: "var(--Text-Primary)" },
	}),
	menu: (base) => ({
		...base,
		background: "var(--Surface-Card)",
		border: "1px solid var(--Border-Subtle)",
		borderRadius: "var(--mr-radius-sm)",
		boxShadow: "var(--mr-shadow-lg)",
		overflow: "hidden",
		zIndex: 30,
	}),
	menuPortal: (base) => ({ ...base, zIndex: 9999 }),
	option: (base, state) => ({
		...base,
		fontSize: "var(--mr-fs-md)",
		cursor: "pointer",
		color: state.isSelected
			? "var(--mr-color-brand-on)"
			: "var(--Text-Primary)",
		background: state.isSelected
			? "var(--mr-color-brand)"
			: state.isFocused
				? "var(--mr-color-subtle)"
				: "transparent",
		":active": { background: "var(--mr-color-brand-soft)" },
	}),
	multiValue: (base) => ({
		...base,
		background: "var(--mr-color-brand-soft)",
		borderRadius: "var(--mr-radius-xs)",
	}),
	multiValueLabel: (base) => ({ ...base, color: "var(--mr-color-brand)" }),
	multiValueRemove: (base) => ({
		...base,
		color: "var(--mr-color-brand)",
		":hover": {
			background: "var(--mr-color-brand)",
			color: "var(--mr-color-brand-on)",
		},
	}),
};

export default function Select({
	options,
	value,
	onChange,
	onChangeMulti,
	placeholder = "Select…",
	isMulti = false,
	isDisabled = false,
	isClearable = false,
	isSearchable = true,
	id,
	className,
}: IProps) {
	// Options may be a flat list or grouped ({ label, options }); flatten so a
	// value can be resolved back to its option regardless of grouping.
	const flatOptions = useMemo<ISelectOption[]>(
		() => options.flatMap((o) => ("options" in o ? o.options : [o])),
		[options],
	);

	const selected = useMemo(() => {
		if (isMulti) {
			const values = Array.isArray(value) ? value : [];
			return flatOptions.filter((o) => values.includes(o.value));
		}
		return flatOptions.find((o) => o.value === value) ?? null;
	}, [flatOptions, value, isMulti]);

	return (
		<ReactSelect<ISelectOption, boolean, GroupBase<ISelectOption>>
			inputId={id}
			className={className}
			classNamePrefix="mr-select"
			options={
				options as OptionsOrGroups<
					ISelectOption,
					GroupBase<ISelectOption>
				>
			}
			value={selected}
			isMulti={isMulti}
			isDisabled={isDisabled}
			isClearable={isClearable}
			isSearchable={isSearchable}
			placeholder={placeholder}
			menuPortalTarget={
				typeof document !== "undefined" ? document.body : undefined
			}
			styles={styles}
			onChange={(next) => {
				if (isMulti) {
					const arr = (next as ISelectOption[]) ?? [];
					onChangeMulti?.(arr.map((o) => o.value));
				} else {
					onChange((next as ISelectOption | null)?.value ?? "");
				}
			}}
		/>
	);
}
