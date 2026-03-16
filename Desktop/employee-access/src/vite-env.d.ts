/// <reference types="vite/client" />

declare module '*.css' {
	const cssContent: string;
	export default cssContent;
}
