"use client";
import React, { Children, type ReactNode } from "react";

interface ShowProps {
	children: ReactNode;
}

interface ShowChildProps {
	when?: boolean;
}

export default function Show(props: ShowProps) {
	let when: ReactNode | null = null;
	let otherwise: ReactNode | null = null;

	Children.forEach(props.children, (children) => {
		if (React.isValidElement(children)) {
			const childProps = children.props as ShowChildProps;
			if (childProps.when) {
				when = children;
			} else {
				otherwise = children;
			}
		}
	});

	return when || otherwise;
}

// Show.displayName = "Show";
Show.When = ({
	isTrue,
	children,
}: {
	isTrue: boolean;
	children: React.ReactNode;
}) => isTrue && children;

// Show.displayName = "Show";
Show.Else = ({
	render,
	children,
}: {
	render?: React.ReactNode;
	children?: React.ReactNode;
}) => render || children || undefined;
