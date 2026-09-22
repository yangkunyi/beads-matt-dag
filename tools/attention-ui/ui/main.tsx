import "./styles.css";
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { App, type PageAttention } from "./App.tsx";

const dataEl = document.getElementById("attention-data");
const root = document.getElementById("root");
if (dataEl && root) {
	const attention = JSON.parse(dataEl.textContent || "{}") as PageAttention;
	hydrateRoot(root, createElement(App, { attention }));
}
