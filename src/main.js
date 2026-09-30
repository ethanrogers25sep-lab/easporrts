import {
  Canvas,
  Rect,
  Circle,
  IText,
  FabricImage,
  PencilBrush,
  Control
} from "fabric";

import "./style.css";
import { createUI, bindUI } from "./ui.js";

export const state = {
  canvas: null,
  tool: "select",
  color: "#0f172a",
  brushSize: 6,
  opacity: 1,
  fontFamily: "Arial",
  fontSize: 42,
  logicalWidth: 794,
  logicalHeight: 1123,
  preset: "a4",
  history: [],
  historyIndex: -1,
  restoring: false,
  fitting: false,
  beforePrint: null
};

const presets = {
  a4: { width: 794, height: 1123, label: "A4 Portrait" },
  square: { width: 1080, height: 1080, label: "1080 × 1080" },
  landscape: { width: 1123, height: 794, label: "A4 Landscape" }
};

const deleteControl = new Control({
  x: 0.5,
  y: -0.5,
  offsetY: -22,
  offsetX: 8,
  cursorStyle: "pointer",
  mouseUpHandler: (_eventData, transform) => {
    const obj = transform.target;
    state.canvas.remove(obj);
    state.canvas.discardActiveObject();
    state.canvas.requestRenderAll();
    snapshot();
    return true;
  },
  render: (ctx, left, top) => {
    ctx.save();
    ctx.translate(left, top);
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 4);
    ctx.moveTo(4, -4);
    ctx.lineTo(-4, 4);
    ctx.stroke();
    ctx.restore();
  }
});

function decorateObject(obj) {
  if (!obj?.controls || obj.controls.deleteControl) return;
  obj.controls.deleteControl = deleteControl;
  obj.set({
    cornerColor: "#0f172a",
    cornerStrokeColor: "#fff",
    cornerSize: 12,
    touchCornerSize: 28,
    transparentCorners: false,
    borderColor: "#0f172a",
    borderScaleFactor: 1.5,
    padding: 4
  });
  obj.setCoords();
}

function snapshot() {
  if (!state.canvas || state.restoring) return;
  const json = JSON.stringify(state.canvas.toJSON());
  state.history = state.history.slice(0, state.historyIndex + 1);
  if (state.history[state.history.length - 1] !== json) {
    state.history.push(json);
    state.historyIndex = state.history.length - 1;
  }
}

export async function restore(index) {
  if (!state.canvas || index < 0 || index >= state.history.length) return;

  state.restoring = true;
  await state.canvas.loadFromJSON(JSON.parse(state.history[index]));
  state.canvas.getObjects().forEach(decorateObject);
  state.canvas.renderAll();
  state.historyIndex = index;
  state.restoring = false;
  fitCanvasToWorkspace();
}

export async function undo() {
  await restore(state.historyIndex - 1);
}

export async function redo() {
  await restore(state.historyIndex + 1);
}

function resizeLogicalCanvas(width, height, preset = "custom") {
  state.logicalWidth = Math.round(width);
  state.logicalHeight = Math.round(height);
  state.preset = preset;

  state.canvas.setDimensions(
    { width: state.logicalWidth, height: state.logicalHeight },
    { backstoreOnly: true }
  );

  fitCanvasToWorkspace();
  state.canvas.requestRenderAll();
  snapshot();
}

export function setPreset(key) {
  const preset = presets[key] || presets.a4;
  resizeLogicalCanvas(preset.width, preset.height, key);
}

export function setCustomSize(width, height) {
  const w = Math.max(200, Math.min(3000, Number(width) || 794));
  const h = Math.max(200, Math.min(3000, Number(height) || 1123));
  resizeLogicalCanvas(w, h, "custom");
}

export function fitCanvasToWorkspace() {
  if (!state.canvas || state.fitting) return;

  const wrap = document.querySelector(".canvas-stage");
  if (!wrap) return;

  state.fitting = true;

  const availableWidth = Math.max(220, wrap.clientWidth - 34);
  const availableHeight = Math.max(220, wrap.clientHeight - 34);
  const scale = Math.min(
    availableWidth / state.logicalWidth,
    availableHeight / state.logicalHeight,
    1
  );

  state.canvas.setZoom(scale);
  state.canvas.setDimensions(
    {
      width: state.logicalWidth * scale,
      height: state.logicalHeight * scale
    },
    { cssOnly: true }
  );
  state.canvas.calcOffset();
  state.canvas.requestRenderAll();

  state.fitting = false;
}

function configurePencilBrush() {
  const brush = new PencilBrush(state.canvas);
  brush.width = state.brushSize;
  brush.color = state.color;
  brush.strokeLineCap = "round";
  brush.strokeLineJoin = "round";
  state.canvas.freeDrawingBrush = brush;
}

function configureEraserBrush() {
  const eraser = new EraserBrush(state.canvas);
  eraser.width = state.brushSize;
  eraser.strokeLineCap = "round";
  eraser.strokeLineJoin = "round";
  state.canvas.freeDrawingBrush = eraser;
}

export function activateTool(tool) {
  state.tool = tool;

  if (tool === "brush") {
    configurePencilBrush();
    state.canvas.selection = false;
    state.canvas.isDrawingMode = true;
    state.canvas.discardActiveObject();
    state.canvas.requestRenderAll();
    return;
  }

  if (tool === "eraser") {
    configureEraserBrush();
    state.canvas.selection = false;
    state.canvas.isDrawingMode = true;
    state.canvas.discardActiveObject();
    state.canvas.requestRenderAll();
    return;
  }

  state.canvas.isDrawingMode = false;
  state.canvas.selection = true;
  state.canvas.defaultCursor = "default";
  state.canvas.requestRenderAll();
}

export function addText() {
  const text = new IText("Double-click to edit", {
    left: state.logicalWidth / 2,
    top: state.logicalHeight / 2,
    originX: "center",
    originY: "center",
    fill: state.color,
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    opacity: state.opacity
  });

  decorateObject(text);
  state.canvas.add(text);
  state.canvas.setActiveObject(text);
  state.canvas.renderAll();
  snapshot();
}

export function addRect() {
  const rect = new Rect({
    left: state.logicalWidth / 2 - 120,
    top: state.logicalHeight / 2 - 80,
    width: 240,
    height: 160,
    rx: 14,
    ry: 14,
    fill: state.color,
    opacity: state.opacity
  });

  decorateObject(rect);
  state.canvas.add(rect);
  state.canvas.setActiveObject(rect);
  state.canvas.renderAll();
  snapshot();
}

export function addCircle() {
  const circle = new Circle({
    left: state.logicalWidth / 2 - 90,
    top: state.logicalHeight / 2 - 90,
    radius: 90,
    fill: state.color,
    opacity: state.opacity
  });

  decorateObject(circle);
  state.canvas.add(circle);
  state.canvas.setActiveObject(circle);
  state.canvas.renderAll();
  snapshot();
}

export async function addImage(file) {
  if (!file) return;

  try {
    const url = await readFileAsDataURL(file);
    const image = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const maxSize = Math.min(state.logicalWidth, state.logicalHeight) * 0.55;
    const imageScale = Math.min(maxSize / image.width, maxSize / image.height, 1);

    image.set({
      left: state.logicalWidth / 2,
      top: state.logicalHeight / 2,
      originX: "center",
      originY: "center",
      opacity: state.opacity
    });

    image.scale(imageScale);
    decorateObject(image);

    state.canvas.add(image);
    state.canvas.setActiveObject(image);
    state.canvas.renderAll();
    snapshot();
  } catch (error) {
    console.error("Could not load image:", error);
    alert("That image could not be loaded.");
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

export function applyProperties(values) {
  state.color = values.color;
  state.brushSize = Number(values.brushSize);
  state.opacity = Number(values.opacity);
  state.fontFamily = values.fontFamily;
  state.fontSize = Number(values.fontSize);

  if (state.canvas.isDrawingMode && state.canvas.freeDrawingBrush) {
    state.canvas.freeDrawingBrush.width = state.brushSize;
    if (state.tool === "brush") {
      state.canvas.freeDrawingBrush.color = state.color;
    }
  }

  const obj = state.canvas.getActiveObject();

  if (!obj) {
    return;
  }

  if (typeof obj.set === "function" && "fill" in obj) {
    obj.set("fill", state.color);
  }

  obj.set("opacity", state.opacity);

  if (obj.type === "i-text" || obj.type === "textbox" || obj.type === "text") {
    obj.set({
      fontFamily: state.fontFamily,
      fontSize: state.fontSize
    });
  }

  obj.setCoords();
  state.canvas.requestRenderAll();
  snapshot();
}

export function deleteSelected() {
  const obj = state.canvas.getActiveObject();
  if (!obj) return;

  state.canvas.remove(obj);
  state.canvas.discardActiveObject();
  state.canvas.requestRenderAll();
  snapshot();
}

export function clearCanvas() {
  if (!confirm("Clear the entire poster?")) return;

  state.canvas.clear();
  state.canvas.backgroundColor = "#ffffff";
  state.canvas.isDrawingMode = false;
  state.canvas.selection = true;
  state.tool = "select";
  state.canvas.requestRenderAll();
  snapshot();
}

export function layer(direction) {
  const obj = state.canvas.getActiveObject();
  if (!obj) return;

  if (direction === "front") {
    state.canvas.bringObjectForward(obj);
  } else {
    state.canvas.sendObjectBackwards(obj);
  }

  state.canvas.requestRenderAll();
  snapshot();
}

export function downloadPNG() {
  state.canvas.discardActiveObject();
  state.canvas.requestRenderAll();

  const data = state.canvas.toDataURL({
    format: "png",
    multiplier: 2,
    enableRetinaScaling: true
  });

  const anchor = document.createElement("a");
  anchor.href = data;
  anchor.download = "poster-studio.png";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function printCanvas() {
  state.canvas.discardActiveObject();
  state.canvas.requestRenderAll();

  state.beforePrint = {
    zoom: state.canvas.getZoom(),
    cssWidth: state.canvas.getElement().style.width,
    cssHeight: state.canvas.getElement().style.height
  };

  state.canvas.setZoom(1);
  state.canvas.setDimensions(
    { width: state.logicalWidth, height: state.logicalHeight },
    { cssOnly: true }
  );
  state.canvas.calcOffset();
  state.canvas.requestRenderAll();

  const restoreAfterPrint = () => {
    window.removeEventListener("afterprint", restoreAfterPrint);

    if (state.beforePrint) {
      state.canvas.setZoom(state.beforePrint.zoom);
      state.canvas.setDimensions(
        {
          width: state.beforePrint.cssWidth || state.logicalWidth * state.beforePrint.zoom,
          height: state.beforePrint.cssHeight || state.logicalHeight * state.beforePrint.zoom
        },
        { cssOnly: true }
      );
      state.canvas.calcOffset();
      state.canvas.requestRenderAll();
      state.beforePrint = null;
      fitCanvasToWorkspace();
    }
  };

  window.addEventListener("afterprint", restoreAfterPrint);
  window.print();
}

function updateActionButtonState() {
  const undoButton = document.querySelector("#undo");
  const redoButton = document.querySelector("#redo");
  if (!undoButton || !redoButton) return;

  undoButton.disabled = state.historyIndex <= 0;
  redoButton.disabled = state.historyIndex >= state.history.length - 1;
  undoButton.classList.toggle("opacity-40", undoButton.disabled);
  redoButton.classList.toggle("opacity-40", redoButton.disabled);
}

function init() {
  document.querySelector("#app").innerHTML = createUI();

  const element = document.querySelector("#posterCanvas");

  state.canvas = new Canvas(element, {
    width: state.logicalWidth,
    height: state.logicalHeight,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true,
    stopContextMenu: true,
    fireRightClick: false,
    uniformScaling: false
  });

  state.canvas.upperCanvasEl.style.touchAction = "none";
  state.canvas.lowerCanvasEl.style.touchAction = "none";

  state.canvas.on("object:added", event => {
    decorateObject(event.target);
    snapshot();
  });

  state.canvas.on("object:removed", snapshot);
  state.canvas.on("object:modified", snapshot);
  state.canvas.on("path:created", event => {
    decorateObject(event.path);
    snapshot();
  });

  state.canvas.on("selection:created", () => window.dispatchEvent(new Event("poster-selection")));
  state.canvas.on("selection:updated", () => window.dispatchEvent(new Event("poster-selection")));
  state.canvas.on("selection:cleared", () => window.dispatchEvent(new Event("poster-selection")));

  bindUI();
  snapshot();
  updateActionButtonState();

  window.addEventListener("history-state-change", updateActionButtonState);
  window.addEventListener("resize", fitCanvasToWorkspace);

  fitCanvasToWorkspace();
}

init();
