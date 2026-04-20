"use client";
import { memo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box } from "../../../../components";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadObject } from "./utils";

interface Props {
	url: string;
	height?: string;
	width?: string;
}

const FbxPreview = ({ url, height, width }: Props) => {
	const PlayerCanvasRef = useCallback(
		(canvasNode: HTMLCanvasElement) => {
			if (!canvasNode) return;

			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera(
				75,
				canvasNode.clientWidth / canvasNode.clientHeight,
				0.1,
				1000,
			);

			const renderer = new THREE.WebGLRenderer({
				canvas: canvasNode,
				antialias: true,
				alpha: true,
			});
			const controls = new OrbitControls(camera, renderer.domElement);
			const observePoint = new THREE.Vector3(0, 1, 0);
			// const backgroundColor = new THREE.Color("#191919");

			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshBasicMaterial({ color: "inherit" });
			const cube = new THREE.Mesh(geometry, material);
			// scene.add(cube);

			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;

			if (window) controls.listenToKeyEvents(window);
			controls.minDistance = 1;
			controls.maxDistance = 10;
			controls.maxPolarAngle = Math.PI / 2;
			controls.target = observePoint;
			// renderer.setClearColor(backgroundColor, 1);
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			camera.position.z = 5;

			const light = new THREE.AmbientLight(0xffffff, 7.5);
			scene.add(light);

			loadObject(url)
				.then((obj) => {
					scene.add(obj);
				})
				.catch((err) => {
					void err;
				});

			const resizeRendererToCanvasSize = () => {
				const rendererCanvas = renderer.domElement;
				const { clientWidth: width, clientHeight: height } =
					rendererCanvas;
				const needResize =
					canvasNode.width !== width || canvasNode.height !== height;
				if (needResize) renderer.setSize(width, height, false);
				return needResize;
			};

			const render = () => {
				if (resizeRendererToCanvasSize()) {
					const canvas = renderer.domElement;
					const aspect = canvas.clientWidth / canvas.clientHeight;
					camera.aspect = aspect;
					camera.updateProjectionMatrix();
				}

				renderer.render(scene, camera);
				requestAnimationFrame(render);
			};

			// requestAnimationFrame(render);
			render();
		},
		[url],
	);

	return (
		<Box
			$grid
			$centerV
			$w={width ?? "100%"}
			$h={height ?? "100%"}
			$borderR="inherit"
		>
			<canvas
				style={{
					width: width ?? "100%",
					height: height ?? "100%",
					borderRadius: "inherit",
					background: "transparent",
				}}
				ref={(canvasNode: HTMLCanvasElement) =>
					PlayerCanvasRef(canvasNode)
				}
			/>
		</Box>
	);
};

export default memo(FbxPreview);
