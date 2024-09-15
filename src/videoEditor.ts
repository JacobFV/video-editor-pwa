import { customElement, property, state } from "lit/decorators.js";
import { LitElement, html, css } from "lit";
import { createFFmpeg } from "@ffmpeg/ffmpeg";

@customElement("video-editor")
export class VideoEditor extends LitElement {
  @state() sequences: any[] = [];
  @state() selectedSequence: any | null = null;
  @property({
    type: String,
    reflect: true,
    attribute: "theme",
  })
  theme = localStorage.getItem("theme") || "light";
  @state() currentTime = 0;
  @state() isPlaying = false;
  private ffmpeg: any;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      --primary-color: #4a90e2;
      --secondary-color: #50c878;
      --bg-color: #f5f7fa;
      --text-color: #333333;
      --border-color: #e0e0e0;
    }

    :host([theme="dark"]) {
      --primary-color: #3a7bd5;
      --secondary-color: #3cb371;
      --bg-color: #2c3e50;
      --text-color: #ecf0f1;
      --border-color: #4a4a4a;
    }

    #preview {
      flex: 1;
      min-height: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: var(--bg-color);
      border-bottom: 1px solid var(--border-color);
    }

    #previewCanvas {
      max-width: 95%;
      max-height: 95%;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    #controls {
      padding: 15px;
      background-color: var(--bg-color);
      border-bottom: 1px solid var(--border-color);
    }

    #controls svg {
      width: 20px;
      height: 20px;
      margin: 0 20px;
      cursor: pointer;
      fill: var(--primary-color);
      transition: fill 0.2s ease;
    }

    #controls svg:hover {
      fill: var(--secondary-color);
    }

    #timeline {
      height: 120px;
      overflow-x: auto;
      overflow-y: hidden;
      display: flex;
      background-color: var(--bg-color);
      padding: 15px;
      border-top: 1px solid var(--border-color);
      -webkit-overflow-scrolling: touch;
    }

    .sequence {
      flex-shrink: 0;
      width: 120px;
      height: 90px;
      margin-right: 15px;
      background-color: var(--primary-color);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      font-size: 14px;
      text-align: center;
      padding: 5px;
      transition: transform 0.2s ease;
    }

    .sequence:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .sequence.selected {
      border: 2px solid var(--secondary-color);
      box-shadow: 0 0 0 2px var(--secondary-color);
    }

    .sequence.dragging {
      opacity: 0.5;
      transform: scale(1.05);
    }

    .drop-indicator {
      width: 4px;
      height: 90px;
      background-color: var(--secondary-color);
      position: absolute;
      transition: left 0.2s ease;
    }

    #fileInput {
      display: none;
    }

    #themeToggle {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--text-color);
      transition: color 0.2s ease;
    }

    #themeToggle:hover {
      color: var(--primary-color);
    }

    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
    }

    #timeCursor {
      position: absolute;
      top: 0;
      width: 2px;
      height: 100%;
      background-color: red;
      pointer-events: none;
    }

    #timeIndicator {
      position: absolute;
      top: -20px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 12px;
      pointer-events: none;
    }
  `;

  constructor() {
    super();
    this.sequences = [];
    this.selectedSequence = null;
    this.theme = localStorage.getItem("theme") || "light";
    this.currentTime = 0;
    this.isPlaying = false;
    this.loadProjectFromLocalStorage();
    this.ffmpeg = createFFmpeg({ log: true });
    this.initFFmpeg();
  }

  async initFFmpeg() {
    try {
      await this.ffmpeg.load();
      console.log("FFmpeg is ready!");
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
    }
  }

  render() {
    return html`
      <div id="preview">
        <canvas id="previewCanvas"></canvas>
      </div>
      <div id="controls">
        <svg @click=${this.playPause} viewBox="0 0 24 24">
          <path
            d="${this.isPlaying
              ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z"
              : "M8 5v14l11-7z"}"
          />
        </svg>
        <svg @click=${this.undo} viewBox="0 0 24 24">
          <path
            d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
          />
        </svg>
        <svg @click=${this.addClip} viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        <svg @click=${this.save} viewBox="0 0 24 24">
          <path
            d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
          />
        </svg>
        <svg @click=${this.share} viewBox="0 0 24 24">
          <path
            d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
          />
        </svg>
      </div>
      <div
        id="timeline"
        @dragover=${this.timelineDragOver}
        @dragleave=${this.timelineDragLeave}
        @touchmove=${this.timelineTouchMove}
        @touchend=${this.timelineTouchEnd}
      >
        ${this.sequences.map(
          (seq, index) => html`
            <div
              class="sequence ${this.selectedSequence === seq
                ? "selected"
                : ""}"
              @click=${() => this.selectSequence(seq)}
              draggable="true"
              @dragstart=${(e: DragEvent) => this.dragStart(e, index)}
              @dragend=${this.dragEnd}
              @dragover=${(e: DragEvent) => this.dragOver(e, index)}
              @drop=${(e: DragEvent) => this.drop(e, index)}
              @touchstart=${(e: TouchEvent) => this.touchStart(e, index)}
              @touchmove=${(e: TouchEvent) => this.touchMove(e, index)}
              @touchend=${(e: TouchEvent) => this.touchEnd(e, index)}
            >
              ${seq.type}: ${seq.name}
            </div>
          `
        )}
        <div class="drop-indicator" style="display: none;"></div>
        <div
          id="timeCursor"
          style="left: ${(this.currentTime / this.getTotalDuration()) * 100}%"
        ></div>
        <div
          id="timeIndicator"
          style="left: calc(${(this.currentTime / this.getTotalDuration()) *
          100}% + 10px)"
        >
          ${this.formatTime(this.currentTime)}
        </div>
      </div>
      <input
        type="file"
        id="fileInput"
        @change=${this.handleFileInput}
        accept="image/*,video/*"
        multiple
      />
      <button id="themeToggle" @click=${this.toggleTheme}>
        ${this.theme === "light"
          ? html`<svg viewBox="0 0 24 24">
              <path
                d="M10 2c-1.82 0-3.53.5-5 1.35C7.99 5.08 10 8.3 10 12s-2.01 6.92-5 8.65C6.47 21.5 8.18 22 10 22c5.52 0 10-4.48 10-10S15.52 2 10 2z"
              />
            </svg>`
          : html`<svg viewBox="0 0 24 24">
              <path
                d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"
              />
            </svg>`}
      </button>
    `;
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", this.theme);
    this.requestUpdate();
  }

  playPause() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  startPlayback() {
    this.playbackInterval = setInterval(() => {
      this.currentTime += 0.1;
      if (this.currentTime >= this.getTotalDuration()) {
        this.currentTime = 0;
        this.stopPlayback();
      }
      this.requestUpdate();
    }, 100);
  }

  stopPlayback() {
    this.isPlaying = false;
    clearInterval(this.playbackInterval);
    this.requestUpdate();
  }

  getTotalDuration() {
    // For simplicity, let's assume each sequence is 5 seconds long
    return this.sequences.length * 5;
  }

  formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  undo() {
    console.log("Undo");
    if (this.sequences.length > 0) {
      this.sequences.pop();
      this.saveProjectToLocalStorage();
      this.requestUpdate();
    }
  }

  addClip() {
    const fileInput = this.shadowRoot.getElementById("fileInput");
    fileInput.click();
  }

  save() {
    console.log("Save");
    this.saveProjectToLocalStorage();
    // Implement additional save logic using FFmpeg.wasm if needed
  }

  share() {
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator
        .share({
          title: "My Video Project",
          text: "Check out my awesome video project!",
          url: window.location.href,
        })
        .then(() => {
          console.log("Successfully shared");
        })
        .catch((error) => {
          console.log("Error sharing:", error);
          this.showSharePopup();
        });
    } else {
      this.showSharePopup();
    }
  }

  showSharePopup() {
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent("Check out my awesome video project!");
    const shareTitle = encodeURIComponent("My Video Project");

    const shareOptions = [
      {
        name: "Email",
        url: `mailto:?subject=${shareTitle}&body=${shareText}%0A${shareUrl}`,
        icon: "📧",
      },
      { name: "SMS", url: `sms:?body=${shareText}%20${shareUrl}`, icon: "💬" },
      {
        name: "Twitter",
        url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
        icon: "🐦",
      },
      {
        name: "Facebook",
        url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
        icon: "👍",
      },
      {
        name: "LinkedIn",
        url: `https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}&summary=${shareText}`,
        icon: "💼",
      },
    ];

    const popupContent = shareOptions
      .map(
        (option) =>
          `<a href="${option.url}" target="_blank" rel="noopener noreferrer" class="share-option">
                        <span class="share-icon">${option.icon}</span>
                        <span class="share-name">${option.name}</span>
                    </a>`
      )
      .join("");

    const popup = document.createElement("div");
    popup.innerHTML = `
                    <div class="share-popup-overlay">
                        <div class="share-popup">
                            <button class="close-button">&times;</button>
                            <h3>Share via</h3>
                            <div class="share-options">
                                ${popupContent}
                            </div>
                        </div>
                    </div>
                `;

    const style = document.createElement("style");
    style.textContent = `
                    .share-popup-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                    }
                    .share-popup {
                        background: white;
                        padding: 20px;
                        border-radius: 10px;
                        max-width: 300px;
                        text-align: center;
                        position: relative;
                    }
                    .close-button {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                    }
                    .share-options {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 10px;
                        margin-top: 15px;
                    }
                    .share-option {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-decoration: none;
                        color: #333;
                        width: 60px;
                    }
                    .share-icon {
                        font-size: 24px;
                        margin-bottom: 5px;
                    }
                    .share-name {
                        font-size: 12px;
                    }
                `;

    popup
      .querySelector(".close-button")
      .addEventListener("click", () => popup.remove());
    document.head.appendChild(style);
    document.body.appendChild(popup);
  }

  selectSequence(seq) {
    this.selectedSequence = seq;
    this.requestUpdate();
  }

  dragStart(e: DragEvent, index: number) {
    this.draggedElement = e.target as HTMLElement;
    this.draggedIndex = index;
    e.dataTransfer.setData("text/plain", index.toString());
    e.target.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    this.startAutoScroll();
  }

  dragEnd(e: DragEvent) {
    this.draggedElement = null;
    this.draggedIndex = null;
    e.target.classList.remove("dragging");
    this.hideDropIndicator();
    this.stopAutoScroll();
  }

  timelineDragOver(e: DragEvent) {
    e.preventDefault();
    const timeline = e.currentTarget;
    const dropIndicator = timeline.querySelector(".drop-indicator");
    const timelineRect = timeline.getBoundingClientRect();
    const x = e.clientX - timelineRect.left;
    dropIndicator.style.display = "block";
    dropIndicator.style.left = `${x}px`;

    this.updateAutoScroll(e.clientX);
  }

  timelineDragLeave(e: DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      this.hideDropIndicator();
    }
  }

  timelineTouchMove(e: TouchEvent) {
    e.preventDefault(); // Prevent scrolling
  }

  timelineTouchEnd(e: TouchEvent) {
    this.hideDropIndicator();
  }

  dragOver(e: DragEvent, index: number) {
    e.preventDefault();
    const dropIndicator = this.shadowRoot.querySelector(".drop-indicator");
    const sequenceElement = e.currentTarget;
    const sequenceRect = sequenceElement.getBoundingClientRect();
    const x = sequenceRect.left + sequenceRect.width / 2;
    dropIndicator.style.left = `${x}px`;

    this.updateAutoScroll(e.clientX);
  }

  drop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    const sourceIndex = this.draggedIndex;
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      const [movedItem] = this.sequences.splice(sourceIndex, 1);
      this.sequences.splice(targetIndex, 0, movedItem);
      this.saveProjectToLocalStorage();
      this.requestUpdate();
    }
    this.hideDropIndicator();
    this.stopAutoScroll();
  }

  startAutoScroll() {
    this.autoScrollInterval = setInterval(() => {
      const timeline = this.shadowRoot.getElementById("timeline");
      if (this.autoScrollDirection === "left") {
        timeline.scrollLeft -= 5;
      } else if (this.autoScrollDirection === "right") {
        timeline.scrollLeft += 5;
      }
    }, 16); // ~60fps
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
    this.autoScrollDirection = null;
  }

  updateAutoScroll(clientX: number) {
    const timeline = this.shadowRoot.getElementById("timeline");
    const timelineRect = timeline.getBoundingClientRect();
    const scrollThreshold = 50; // pixels from edge to start scrolling

    if (clientX < timelineRect.left + scrollThreshold) {
      this.autoScrollDirection = "left";
    } else if (clientX > timelineRect.right - scrollThreshold) {
      this.autoScrollDirection = "right";
    } else {
      this.autoScrollDirection = null;
    }
  }

  touchStart(e: TouchEvent, index: number) {
    this.draggedIndex = index;
    this.draggedElement = e.target;
    e.target.classList.add("dragging");
    this.startAutoScroll();
  }

  touchMove(e: TouchEvent, index: number) {
    e.preventDefault();
    const touch = e.touches[0];
    const timeline = this.shadowRoot.getElementById("timeline");
    const dropIndicator = timeline.querySelector(".drop-indicator");
    const timelineRect = timeline.getBoundingClientRect();
    const x = touch.clientX - timelineRect.left;
    dropIndicator.style.display = "block";
    dropIndicator.style.left = `${x}px`;

    this.updateAutoScroll(touch.clientX);

    // Find the new target index
    const sequences = Array.from(timeline.querySelectorAll(".sequence"));
    const targetIndex = sequences.findIndex((seq) => {
      const rect = seq.getBoundingClientRect();
      return touch.clientX < rect.left + rect.width / 2;
    });

    if (targetIndex !== -1 && targetIndex !== this.draggedIndex) {
      this.moveSequence(this.draggedIndex, targetIndex);
    }
  }

  touchEnd(e: TouchEvent, targetIndex: number) {
    if (this.draggedElement) {
      this.draggedElement.classList.remove("dragging");
    }
    this.draggedElement = null;
    this.draggedIndex = null;
    this.hideDropIndicator();
    this.stopAutoScroll();
  }

  moveSequence(fromIndex: number, toIndex: number) {
    const [movedItem] = this.sequences.splice(fromIndex, 1);
    this.sequences.splice(toIndex, 0, movedItem);
    this.draggedIndex = toIndex;
    this.saveProjectToLocalStorage();
    this.requestUpdate();
  }

  hideDropIndicator() {
    const dropIndicator = this.shadowRoot.querySelector(".drop-indicator");
    if (dropIndicator) {
      dropIndicator.style.display = "none";
    }
  }

  handleFileInput(e: Event) {
    const files = e.target.files;
    for (let file of files) {
      const type = file.type.startsWith("image/") ? "image" : "video";
      this.sequences.push({ type, name: file.name, file });
    }
    this.saveProjectToLocalStorage();
    this.requestUpdate();
  }

  saveProjectToLocalStorage() {
    const projectData = {
      sequences: this.sequences.map((seq) => ({
        type: seq.type,
        name: seq.name,
        // We can't store File objects in localStorage, so we'll just save metadata
      })),
    };
    localStorage.setItem("videoEditorProject", JSON.stringify(projectData));
  }

  loadProjectFromLocalStorage() {
    const savedProject = localStorage.getItem("videoEditorProject");
    if (savedProject) {
      const projectData = JSON.parse(savedProject);
      this.sequences = projectData.sequences;
    }
  }
}
