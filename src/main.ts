import "./style.css";
import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { VideoEditor } from "./videoEditor";
import { render } from "lit";

// Replace the boilerplate content
render(
  html`<video-editor></video-editor>`,
  document.querySelector<HTMLDivElement>("#app")!
);
