"use client";
import {
	Fragment,
	memo,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

interface IProps<T> {
	totalPages: number;
	size: number;
	setSize: (
		size: number | ((_size: number) => number),
	) => Promise<T[] | undefined>;
	children: ReactNode;
}

function InfinityScroll<T>({ size, setSize, totalPages, children }: IProps<T>) {
	const elementRef = useRef(null);
	const [hasMore, setHasMore] = useState<boolean>(true);

	const onIntersection = useCallback(
		(entries: IntersectionObserverEntry[]) => {
			const entry = entries.at(0);
			if (entry?.isIntersecting && hasMore) {
				setSize((size) => {
					const result = size + 1;
					return result;
				});
			}
		},
		[hasMore, setSize],
	);

	useEffect(() => {
		const options: IntersectionObserverInit = {
			threshold: 0.5,
		};

		const observer = new IntersectionObserver(onIntersection, options);
		if (observer && elementRef.current)
			observer.observe(elementRef.current);

		return () => {
			if (!observer) return;
			observer.disconnect();
		};
	}, [onIntersection]);

	useEffect(() => {
		if (size < totalPages) setHasMore(true);
		else setHasMore(false);
	}, [size, totalPages]);

	return (
		<Fragment>
			{children}
			<div ref={elementRef} />
		</Fragment>
	);
}

export default memo(InfinityScroll);
