import {
  state, activateTool, addText, addRect, addCircle, addImage, deleteSelected,
  clearCanvas, undo, redo, layer, downloadPNG, printCanvas, setPreset, setCustomSize,
  applyProperties
} from "./main.js";

const icon = {
  brush: "✎", text: "T", rect: "▭", circle: "○", image: "▧", eraser: "⌫",
  undo: "↶", redo: "↷"
};

export function createUI() {
  return `
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center font-black">PS</div>
        <div><h1 class="font-black leading-tight">Poster Studio</h1><p class="text-[10px] text-slate-500">Draw • Design • Print</p></div>
      </div>
      <div class="flex items-center gap-1 sm:gap-2">
        <button id="undo" class="px-3 py-2 rounded-lg hover:bg-slate-100" title="Undo">${icon.undo}</button>
        <button id="redo" class="px-3 py-2 rounded-lg hover:bg-slate-100" title="Redo">${icon.redo}</button>
        <button id="clear" class="hidden sm:block px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">Clear</button>
        <button id="download" class="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">Download</button>
        <button id="print" class="hidden sm:block px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">Print</button>
      </div>
    </header>

    <main class="workspace grid md:grid-cols-[88px_1fr_280px] pb-20 md:pb-0">
      <aside class="hidden md:flex flex-col items-center gap-2 p-3 bg-white border-r border-slate-200">
        ${toolButtons()}
      </aside>

      <section class="canvas-stage relative flex items-center justify-center overflow-hidden p-4 sm:p-7 bg-slate-200">
        <div class="canvas-shell bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-300" id="canvasContainer">
          <canvas id="posterCanvas"></canvas>
        </div>
      </section>

      <aside class="hidden md:block bg-white border-l border-slate-200 p-4 overflow-y-auto">
        ${propertiesPanel()}
      </aside>
    </main>

    <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 p-2">
      <div class="flex items-center justify-around">${toolButtons(true)}</div>
    </div>

    <div id="mobileProps" class="hidden md:hidden fixed bottom-[66px] left-2 right-2 z-40 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-h-[55vh] overflow-y-auto">
      ${propertiesPanel(true)}
    </div>
  </div>`;
}

function toolButtons(mobile=false) {
  const cls = "tool-btn rounded-xl p-2 sm:p-3 flex flex-col items-center gap-1 text-slate-600 transition";
  const buttons = [
    ["select","↖","Select"],["brush",icon.brush,"Draw"],["text",icon.text,"Text"],
    ["rect",icon.rect,"Rectangle"],["circle",icon.circle,"Circle"],["image",icon.image,"Image"],["eraser",icon.eraser,"Eraser"]
  ];
  return buttons.map(([id,ic,label]) => `<button class="${cls}" data-tool="${id}" title="${label}"><span class="text-xl font-bold">${ic}</span><span class="text-[10px]">${label}</span></button>`).join("");
}

function propertiesPanel(mobile=false) {
  return `
  <div class="flex items-center justify-between mb-4">
    <h2 class="font-bold">Properties</h2>
    ${mobile ? '<button id="closeMobileProps" class="text-slate-500">✕</button>' : ''}
  </div>
  <div class="space-y-4">
    <label class="block text-xs font-semibold">Canvas format
      <select id="preset" class="mt-1 w-full border rounded-lg p-2 bg-white">
        <option value="a4">A4 Portrait</option><option value="square">1080 × 1080</option><option value="landscape">A4 Landscape</option><option value="custom">Custom</option>
      </select>
    </label>
    <div id="customSize" class="hidden grid grid-cols-2 gap-2">
      <input id="customW" type="number" min="200" max="3000" value="794" class="border rounded-lg p-2" placeholder="Width">
      <input id="customH" type="number" min="200" max="3000" value="1123" class="border rounded-lg p-2" placeholder="Height">
      <button id="applySize" class="col-span-2 bg-slate-900 text-white rounded-lg py-2">Apply size</button>
    </div>
    <label class="block text-xs font-semibold">Color
      <div class="flex gap-2 mt-1"><input id="color" type="color" value="#111827" class="w-12 h-10 rounded cursor-pointer"><input id="hex" value="#111827" class="flex-1 border rounded-lg px-2" maxlength="7"></div>
    </label>
    <label class="block text-xs font-semibold">Brush size <input id="brushSize" type="range" min="1" max="80" value="6" class="w-full"><span id="brushValue">6 px</span></label>
    <label class="block text-xs font-semibold">Opacity <input id="opacity" type="range" min="0.05" max="1" step="0.05" value="1" class="w-full"><span id="opacityValue">100%</span></label>
    <label class="block text-xs font-semibold">Font
      <select id="fontFamily" class="mt-1 w-full border rounded-lg p-2"><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Courier New</option><option>Trebuchet MS</option><option>Impact</option></select>
    </label>
    <label class="block text-xs font-semibold">Font size <input id="fontSize" type="range" min="10" max="180" value="42" class="w-full"><span id="fontValue">42 px</span></label>
    <div class="grid grid-cols-2 gap-2">
      <button id="front" class="border rounded-lg py-2 hover:bg-slate-50">Bring forward</button>
      <button id="back" class="border rounded-lg py-2 hover:bg-slate-50">Send backward</button>
      <button id="delete" class="col-span-2 bg-red-50 text-red-700 rounded-lg py-2 hover:bg-red-100">Delete selected</button>
    </div>
    ${mobile ? '<button id="openMobileProps" class="w-full border rounded-lg py-2 mt-1">Close properties</button>' : ''}
  </div>`;
}

export function bindUI() {
  document.querySelectorAll("[data-tool]").forEach(btn => btn.addEventListener("click", () => {
    const tool = btn.dataset.tool;
    if (tool === "text") addText();
    else if (tool === "rect") addRect();
    else if (tool === "circle") addCircle();
    else if (tool === "image") document.querySelector("#imageInput").click();
    else activateTool(tool);
    document.querySelectorAll("[data-tool]").forEach(x => x.classList.toggle("active", x.dataset.tool === tool));
    if (window.innerWidth < 768) document.querySelector("#mobileProps").classList.remove("hidden");
  }));

  document.querySelector("#imageInput").addEventListener("change", e => {
    if (e.target.files[0]) addImage(e.target.files[0]);
    e.target.value = "";
  });
  document.querySelector("#undo").addEventListener("click", undo);
  document.querySelector("#redo").addEventListener("click", redo);
  document.querySelector("#clear").addEventListener("click", clearCanvas);
  document.querySelector("#download").addEventListener("click", downloadPNG);
  document.querySelector("#print").addEventListener("click", printCanvas);

  const bindProps = root => {
    const q = id => root.querySelector("#"+id);
    const sync = () => applyProperties({
      color: q("hex").value,
      brushSize: q("brushSize").value,
      opacity: q("opacity").value,
      fontFamily: q("fontFamily").value,
      fontSize: q("fontSize").value
    });
    q("color").addEventListener("input", e => { q("hex").value=e.target.value; sync(); });
    q("hex").addEventListener("input", e => { if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { q("color").value=e.target.value; sync(); }});
    q("brushSize").addEventListener("input", e => { q("brushValue").textContent=e.target.value+" px"; sync(); });
    q("opacity").addEventListener("input", e => { q("opacityValue").textContent=Math.round(e.target.value*100)+"%"; sync(); });
    q("fontFamily").addEventListener("change", sync);
    q("fontSize").addEventListener("input", e => { q("fontValue").textContent=e.target.value+" px"; sync(); });
    q("preset").addEventListener("change", e => {
      q("customSize").classList.toggle("hidden", e.target.value !== "custom");
      if (e.target.value !== "custom") setPreset(e.target.value);
    });
    q("applySize").addEventListener("click", () => setCustomSize(q("customW").value, q("customH").value));
    q("front").addEventListener("click", () => layer("front"));
    q("back").addEventListener("click", () => layer("back"));
    q("delete").addEventListener("click", deleteSelected);
    const close=q("closeMobileProps"); if(close) close.addEventListener("click",()=>qMobile().classList.add("hidden"));
    const open=q("openMobileProps"); if(open) open.addEventListener("click",()=>qMobile().classList.add("hidden"));
  };
  const desktop=document.querySelector("aside.md\\:block");
  if (desktop) bindProps(desktop);
  bindProps(document.querySelector("#mobileProps"));

  window.addEventListener("keydown", e => {
    if ((e.key==="Delete" || e.key==="Backspace") && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) deleteSelected();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="z") { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="y") { e.preventDefault(); redo(); }
  });
  window.addEventListener("poster-selection", () => {
    const obj=state.canvas.getActiveObject();
    const panel=document.querySelector("#mobileProps");
    if (window.innerWidth < 768 && obj) panel.classList.remove("hidden");
  });
}
function qMobile(){ return document.querySelector("#mobileProps"); }
