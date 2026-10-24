import { mountApp } from "./app.ts";
import "./style.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app");

if (document.body.dataset.smtMounted === "1") {
  window.location.reload();
} else {
  document.body.dataset.smtMounted = "1";
  mountApp(root);
}
