import { Canvas, Rect, Circle, IText, FabricImage, PencilBrush } from "fabric";
import "./style.css";
import { createUI, bindUI } from "./ui.js";

export const state = {
  canvas: null,
  tool: "select",
  color: "#111827",
  brushSize: 6,
  opacity: 1,
  fontFamily: "Arial",
  fontSize: 42,
  history: [],
  historyIndex: -1,
  restoring: false,
  canvasPreset: "a4"
};

const presets = {
  a4: { width: 794, height: 1123, label: "A4 Portrait" },
  square: { width: 1080, height: 1080, label: "1080 × 1080" },
  landscape: { width: 1123, height: 794, label: "A4 Landscape" }
};

function snapshot() {
  if (!state.canvas || state.restoring) return;
  const json = JSON.stringify(state.canvas.toJSON());
  state.history = state.history.slice(0, state.historyIndex + 1);
  if (state.history[state.history.length - 1] !== json) {
    state.history.push(json);
    state.historyIndex++;
  }
}

export async function restore(index) {
  if (!state.canvas || index < 0 || index >= state.history.length) return;
  state.restoring = true;
  await state.canvas.loadFromJSON(JSON.parse(state.history[index]));
  state.canvas.renderAll();
  state.historyIndex = index;
  state.restoring = false;
}

export function undo() { return restore(state.historyIndex - 1); }
export function redo() { return restore(state.historyIndex + 1); }

export function setPreset(key) {
  const p = presets[key] || presets.a4;
  state.canvasPreset = key;
  state.canvas.setDimensions({ width: p.width, height: p.height });
  state.canvas.renderAll();
  snapshot();
  fitCanvasToWorkspace();
}

export function setCustomSize(width, height) {
  const w = Math.max(200, Math.min(3000, Number(width) || 794));
  const h = Math.max(200, Math.min(3000, Number(height) || 1123));
  state.canvas.setDimensions({ width: w, height: h });
  state.canvas.renderAll();
  snapshot();
  fitCanvasToWorkspace();
}

export function fitCanvasToWorkspace() {
  const wrap = document.querySelector(".canvas-stage");
  if (!wrap || !state.canvas) return;
  const maxW = Math.max(240, wrap.clientWidth - 28);
  const maxH = Math.max(240, wrap.clientHeight - 28);
  const scale = Math.min(maxW / state.canvas.getWidth(), maxH / state.canvas.getHeight(), 1);
  state.canvas.setZoom(scale);
  state.canvas.setDimensions({
    width: state.canvas.getWidth() * scale,
    height: state.canvas.getHeight() * scale
  }, { backstoreOnly: false });
  state.canvas.calcOffset();
}

function setBrush() {
  state.canvas.isDrawingMode = true;
  state.canvas.freeDrawingBrush = new PencilBrush(state.canvas);
  state.canvas.freeDrawingBrush.width = state.brushSize;
  state.canvas.freeDrawingBrush.color = state.color;
  state.canvas.selection = false;
}

export function activateTool(tool) {
  state.tool = tool;
  if (tool === "brush") {
    setBrush();
  } else if (tool === "eraser") {
    state.canvas.isDrawingMode = false;
    state.canvas.selection = true;
  } else {
    state.canvas.isDrawingMode = false;
    state.canvas.selection = true;
  }
}

export function addText() {
  const text = new IText("Double-click to edit", {
    left: state.canvas.getWidth() / 2 - 130,
    top: state.canvas.getHeight() / 2 - 25,
    fill: state.color,
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    opacity: state.opacity,
    originX: "center",
    originY: "center"
  });
  state.canvas.add(text);
  state.canvas.setActiveObject(text);
  state.canvas.renderAll();
  snapshot();
}

export function addRect() {
  const r = new Rect({
    left: state.canvas.getWidth()/2 - 100, top: state.canvas.getHeight()/2 - 70,
    width: 200, height: 140, rx: 12, ry: 12,
    fill: state.color, opacity: state.opacity
  });
  state.canvas.add(r); state.canvas.setActiveObject(r); state.canvas.renderAll(); snapshot();
}

export function addCircle() {
  const c = new Circle({
    left: state.canvas.getWidth()/2 - 75, top: state.canvas.getHeight()/2 - 75,
    radius: 75, fill: state.color, opacity: state.opacity
  });
  state.canvas.add(c); state.canvas.setActiveObject(c); state.canvas.renderAll(); snapshot();
}

export function addImage(file) {
  const reader = new FileReader();
  reader.onload = async e => {
    const img = await FabricImage.fromURL(e.target.result);
    const max = Math.min(state.canvas.getWidth(), state.canvas.getHeight()) * .55;
    const scale = Math.min(max / img.width, max / img.height, 1);
    img.set({
      left: state.canvas.getWidth()/2,
      top: state.canvas.getHeight()/2,
      originX: "center", originY: "center", opacity: state.opacity
    });
    img.scale(scale);
    state.canvas.add(img); state.canvas.setActiveObject(img); state.canvas.renderAll(); snapshot();
  };
  reader.readAsDataURL(file);
}

export function applyProperties(values) {
  state.color = values.color;
  state.brushSize = Number(values.brushSize);
  state.opacity = Number(values.opacity);
  state.fontFamily = values.fontFamily;
  state.fontSize = Number(values.fontSize);
  const obj = state.canvas.getActiveObject();
  if (!obj) {
    if (state.canvas.freeDrawingBrush) {
      state.canvas.freeDrawingBrush.width = state.brushSize;
      state.canvas.freeDrawingBrush.color = state.color;
    }
    return;
  }
  if ("fill" in obj) obj.set("fill", state.color);
  obj.set("opacity", state.opacity);
  if (obj.type === "i-text" || obj.type === "text") {
    obj.set({ fontFamily: state.fontFamily, fontSize: state.fontSize });
  }
  state.canvas.renderAll();
  snapshot();
}

export function deleteSelected() {
  const obj = state.canvas.getActiveObject();
  if (!obj) return;
  state.canvas.remove(obj);
  state.canvas.discardActiveObject();
  state.canvas.renderAll();
  snapshot();
}

export function clearCanvas() {
  if (!confirm("Clear the entire poster?")) return;
  state.canvas.clear();
  state.canvas.backgroundColor = "#ffffff";
  state.canvas.renderAll();
  snapshot();
}

export function layer(direction) {
  const obj = state.canvas.getActiveObject();
  if (!obj) return;
  if (direction === "front") state.canvas.bringObjectForward(obj);
  else state.canvas.sendObjectBackwards(obj);
  state.canvas.renderAll();
  snapshot();
}

export function downloadPNG() {
  const data = state.canvas.toDataURL({ format: "png", multiplier: 2 });
  const a = document.createElement("a");
  a.href = data; a.download = "poster-studio.png"; a.click();
}

export function printCanvas() {
  state.canvas.discardActiveObject();
  state.canvas.renderAll();
  window.print();
}

function init() {
  document.querySelector("#app").innerHTML = createUI();
  const el = document.querySelector("#posterCanvas");
  state.canvas = new Canvas(el, {
    width: presets.a4.width,
    height: presets.a4.height,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true,
    stopContextMenu: true
  });
  state.canvas.upperCanvasEl.style.touchAction = "none";
  state.canvas.on("object:modified", snapshot);
  state.canvas.on("path:created", snapshot);
  state.canvas.on("selection:created", () => window.dispatchEvent(new Event("poster-selection")));
  state.canvas.on("selection:updated", () => window.dispatchEvent(new Event("poster-selection")));
  state.canvas.on("selection:cleared", () => window.dispatchEvent(new Event("poster-selection")));
  snapshot();
  bindUI();
  fitCanvasToWorkspace();
  window.addEventListener("resize", fitCanvasToWorkspace);
}
init();
