import {
  state,
  activateTool,
  addText,
  addRect,
  addCircle,
  addImage,
  deleteSelected,
  clearCanvas,
  undo,
  redo,
  layer,
  downloadPNG,
  printCanvas,
  setPreset,
  setCustomSize,
  applyProperties
} from "./main.js";

const icons = {
  select: "↖",
  brush: "✎",
  text: "T",
  rect: "▭",
  circle: "○",
  image: "▧",
  eraser: "⌫",
  undo: "↶",
  redo: "↷"
};

export function createUI() {
  return `
    <div class="min-h-screen bg-slate-100 text-slate-900">
      <header class="h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between gap-3 px-3 sm:px-5 sticky top-0 z-30">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center font-black shadow-sm">PS</div>
          <div class="min-w-0">
            <h1 class="font-black leading-tight truncate">Poster Studio</h1>
            <p class="text-[10px] text-slate-500">Draw • Design • Print</p>
          </div>
        </div>

        <div class="flex items-center gap-1 sm:gap-2">
          <button id="undo" class="px-3 py-2 rounded-lg hover:bg-slate-100 disabled:cursor-not-allowed" title="Undo">${icons.undo}</button>
          <button id="redo" class="px-3 py-2 rounded-lg hover:bg-slate-100 disabled:cursor-not-allowed" title="Redo">${icons.redo}</button>
          <button id="clear" class="hidden sm:block px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">Clear</button>
          <button id="download" class="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">Download</button>
          <button id="print" class="hidden sm:block px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">Print</button>
        </div>
      </header>

      <main class="workspace grid md:grid-cols-[88px_minmax(0,1fr)_292px] pb-20 md:pb-0">
        <aside class="hidden md:flex flex-col items-center gap-2 p-3 bg-white border-r border-slate-200">
          ${toolButtons()}
        </aside>

        <section class="canvas-stage flex items-center justify-center overflow-hidden p-4 sm:p-7 bg-slate-200">
          <div id="canvasContainer" class="canvas-shell bg-white border border-slate-300 rounded-xl shadow-paper">
            <canvas id="posterCanvas"></canvas>
          </div>
        </section>

        <aside class="hidden md:block bg-white border-l border-slate-200 p-4 overflow-y-auto panel-scroll">
          ${propertiesPanel(false)}
        </aside>
      </main>

      <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 p-2">
        <div class="mobile-tool-scroll flex items-center justify-start gap-1">
          ${toolButtons(true)}
        </div>
      </div>

      <div id="mobileProps" class="hidden md:hidden fixed bottom-[72px] left-2 right-2 z-40 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-h-[58dvh] overflow-y-auto">
        ${propertiesPanel(true)}
      </div>
    </div>
  `;
}

function toolButtons() {
  const buttons = [
    ["select", icons.select, "Select"],
    ["brush", icons.brush, "Draw"],
    ["text", icons.text, "Text"],
    ["rect", icons.rect, "Rectangle"],
    ["circle", icons.circle, "Circle"],
    ["image", icons.image, "Image"],
    ["eraser", icons.eraser, "Eraser"]
  ];

  return buttons.map(([id, icon, label]) => `
    <button class="tool-btn rounded-xl p-2.5 w-16 flex flex-col items-center gap-1 text-slate-600 transition"
            data-tool="${id}"
            title="${label}"
            aria-label="${label}">
      <span class="text-xl font-bold">${icon}</span>
      <span class="text-[10px]">${label}</span>
    </button>
  `).join("");
}

function propertiesPanel(mobile) {
  return `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="font-bold">Properties</h2>
        <p class="text-[11px] text-slate-500">Canvas + selected object</p>
      </div>
      ${mobile ? '<button id="closeMobileProps" class="text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100">✕</button>' : ""}
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold">Canvas format</label>
        <select id="${mobile ? "mobilePreset" : "preset"}" class="mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white">
          <option value="a4">A4 Portrait</option>
          <option value="square">1080 × 1080</option>
          <option value="landscape">A4 Landscape</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div id="${mobile ? "mobileCustomSize" : "customSize"}" class="hidden grid grid-cols-2 gap-2">
        <input id="${mobile ? "mobileCustomW" : "customW"}" type="number" min="200" max="3000" value="794" class="border border-slate-300 rounded-lg p-2" placeholder="Width">
        <input id="${mobile ? "mobileCustomH" : "customH"}" type="number" min="200" max="3000" value="1123" class="border border-slate-300 rounded-lg p-2" placeholder="Height">
        <button id="${mobile ? "mobileApplySize" : "applySize"}" class="col-span-2 bg-slate-900 text-white rounded-lg py-2 hover:bg-slate-800">Apply size</button>
      </div>

      <div>
        <label class="block text-xs font-semibold">Color</label>
        <div class="flex gap-2 mt-1">
          <input id="${mobile ? "mobileColor" : "color"}" type="color" value="#0f172a" class="w-12 h-10 rounded cursor-pointer border border-slate-300">
          <input id="${mobile ? "mobileHex" : "hex"}" value="#0f172a" class="flex-1 border border-slate-300 rounded-lg px-2 uppercase" maxlength="7" aria-label="Hex color">
        </div>
        <p class="text-[10px] text-slate-400 mt-1">Hex color; RGB is handled by the native picker.</p>
      </div>

      <label class="block text-xs font-semibold">
        <span class="flex justify-between"><span>Brush size</span><span id="${mobile ? "mobileBrushValue" : "brushValue"}" class="range-value text-slate-500">6 px</span></span>
        <input id="${mobile ? "mobileBrushSize" : "brushSize"}" type="range" min="1" max="80" value="6" class="w-full accent-slate-900">
      </label>

      <label class="block text-xs font-semibold">
        <span class="flex justify-between"><span>Opacity</span><span id="${mobile ? "mobileOpacityValue" : "opacityValue"}" class="range-value text-slate-500">100%</span></span>
        <input id="${mobile ? "mobileOpacity" : "opacity"}" type="range" min="0.05" max="1" step="0.05" value="1" class="w-full accent-slate-900">
      </label>

      <label class="block text-xs font-semibold">
        Font
        <select id="${mobile ? "mobileFontFamily" : "fontFamily"}" class="mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white">
          <option>Arial</option>
          <option>Georgia</option>
          <option>Verdana</option>
          <option>Courier New</option>
          <option>Trebuchet MS</option>
          <option>Impact</option>
        </select>
      </label>

      <label class="block text-xs font-semibold">
        <span class="flex justify-between"><span>Font size</span><span id="${mobile ? "mobileFontValue" : "fontValue"}" class="range-value text-slate-500">42 px</span></span>
        <input id="${mobile ? "mobileFontSize" : "fontSize"}" type="range" min="10" max="180" value="42" class="w-full accent-slate-900">
      </label>

      <div class="grid grid-cols-2 gap-2">
        <button id="${mobile ? "mobileFront" : "front"}" class="border border-slate-300 rounded-lg py-2 hover:bg-slate-50">Bring forward</button>
        <button id="${mobile ? "mobileBack" : "back"}" class="border border-slate-300 rounded-lg py-2 hover:bg-slate-50">Send backward</button>
        <button id="${mobile ? "mobileDelete" : "delete"}" class="col-span-2 bg-red-50 text-red-700 rounded-lg py-2 hover:bg-red-100">Delete selected</button>
      </div>

      ${mobile ? '<button id="closeMobilePropsBottom" class="w-full border border-slate-300 rounded-lg py-2">Close</button>' : ""}
    </div>
  `;
}

function bindToolButtons() {
  document.querySelectorAll("[data-tool]").forEach(button => {
    button.addEventListener("click", async () => {
      const tool = button.dataset.tool;

      if (tool === "text") {
        activateTool("select");
        addText();
      } else if (tool === "rect") {
        activateTool("select");
        addRect();
      } else if (tool === "circle") {
        activateTool("select");
        addCircle();
      } else if (tool === "image") {
        document.querySelector("#imageInput").click();
      } else {
        activateTool(tool);
      }

      document.querySelectorAll("[data-tool]").forEach(item => {
        item.classList.toggle("active", item.dataset.tool === tool);
      });

      if (window.innerWidth < 768) {
        document.querySelector("#mobileProps")?.classList.remove("hidden");
      }
    });
  });
}

function readProps(root, prefix = "") {
  const id = value => root.querySelector("#" + (prefix ? prefix + value : value));
  return {
    color: id("color")?.value || state.color,
    brushSize: id("brushSize")?.value || state.brushSize,
    opacity: id("opacity")?.value || state.opacity,
    fontFamily: id("fontFamily")?.value || state.fontFamily,
    fontSize: id("fontSize")?.value || state.fontSize
  };
}

function bindPropertyPanel(root, prefix = "", mobile = false) {
  if (!root) return;

  const q = name => root.querySelector("#" + (prefix ? prefix + name : name));
  const sync = () => applyProperties(readProps(root, prefix));

  q("color")?.addEventListener("input", event => {
    const hex = q("hex");
    if (hex) hex.value = event.target.value;
    sync();
  });

  q("hex")?.addEventListener("input", event => {
    const value = event.target.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      const color = q("color");
      if (color) color.value = value;
      sync();
    }
  });

  q("brushSize")?.addEventListener("input", event => {
    const output = q("brushValue");
    if (output) output.textContent = `${event.target.value} px`;
    sync();
  });

  q("opacity")?.addEventListener("input", event => {
    const output = q("opacityValue");
    if (output) output.textContent = `${Math.round(Number(event.target.value) * 100)}%`;
    sync();
  });

  q("fontFamily")?.addEventListener("change", sync);

  q("fontSize")?.addEventListener("input", event => {
    const output = q("fontValue");
    if (output) output.textContent = `${event.target.value} px`;
    sync();
  });

  const preset = q("preset");
  preset?.addEventListener("change", event => {
    const custom = q("customSize");
    if (custom) custom.classList.toggle("hidden", event.target.value !== "custom");
    if (event.target.value !== "custom") setPreset(event.target.value);
  });

  q("applySize")?.addEventListener("click", () => {
    setCustomSize(q("customW").value, q("customH").value);
  });

  q("front")?.addEventListener("click", () => layer("front"));
  q("back")?.addEventListener("click", () => layer("back"));
  q("delete")?.addEventListener("click", deleteSelected);

  if (mobile) {
    q("closeMobileProps")?.addEventListener("click", () => document.querySelector("#mobileProps")?.classList.add("hidden"));
    q("closeMobilePropsBottom")?.addEventListener("click", () => document.querySelector("#mobileProps")?.classList.add("hidden"));
  }
}

function bindToolbarActions() {
  document.querySelector("#imageInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (file) await addImage(file);
    event.target.value = "";
  });

  document.querySelector("#undo").addEventListener("click", async () => {
    await undo();
    window.dispatchEvent(new Event("history-state-change"));
  });

  document.querySelector("#redo").addEventListener("click", async () => {
    await redo();
    window.dispatchEvent(new Event("history-state-change"));
  });

  document.querySelector("#clear").addEventListener("click", clearCanvas);
  document.querySelector("#download").addEventListener("click", downloadPNG);
  document.querySelector("#print").addEventListener("click", printCanvas);
}

function bindKeyboardShortcuts() {
  window.addEventListener("keydown", async event => {
    const tag = document.activeElement?.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (!typing && (event.key === "Delete" || event.key === "Backspace")) {
      deleteSelected();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      await undo();
      window.dispatchEvent(new Event("history-state-change"));
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      await redo();
      window.dispatchEvent(new Event("history-state-change"));
    }
  });
}

export function bindUI() {
  bindToolButtons();
  bindToolbarActions();

  const desktop = document.querySelector("aside.hidden.md\\:block");
  bindPropertyPanel(desktop, "", false);
  bindPropertyPanel(document.querySelector("#mobileProps"), "mobile", true);

  bindKeyboardShortcuts();

  window.addEventListener("poster-selection", () => {
    const hasSelection = Boolean(state.canvas.getActiveObject());
    const mobile = document.querySelector("#mobileProps");

    if (window.innerWidth < 768 && mobile && hasSelection) {
      mobile.classList.remove("hidden");
    }
  });
}
