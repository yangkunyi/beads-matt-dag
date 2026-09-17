import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { App, type PageOverview } from "./App.tsx";

const dataEl = document.getElementById("overview");
const root = document.getElementById("root");
if (dataEl && root) {
	const overview = JSON.parse(dataEl.textContent || '{"issues":[],"edges":[],"live":null,"commentEndpoint":null}') as PageOverview;
	hydrateRoot(root, createElement(App, { overview }));
}
