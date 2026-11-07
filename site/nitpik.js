var NitPik = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    __internals: () => __internals,
    createEmitter: () => createEmitter,
    default: () => index_default,
    destroy: () => destroy,
    generatePath: () => generateTreePath,
    generateSelector: () => generateSelector,
    getTextPreview: () => getTextPreview,
    init: () => init,
    parseScriptConfig: () => parseScriptConfig
  });

  // src/events.js
  function createEmitter() {
    const listeners2 = /* @__PURE__ */ new Map();
    return {
      on(event, fn) {
        if (!listeners2.has(event)) listeners2.set(event, /* @__PURE__ */ new Set());
        listeners2.get(event).add(fn);
      },
      off(event, fn) {
        const set = listeners2.get(event);
        if (set) set.delete(fn);
      },
      emit(event, data) {
        const set = listeners2.get(event);
        if (!set) return;
        Array.from(set).forEach(function(fn) {
          fn(data);
        });
      }
    };
  }

  // src/path.js
  var SECTION_TAGS = /* @__PURE__ */ new Set([
    "SECTION",
    "ARTICLE",
    "ASIDE",
    "NAV",
    "HEADER",
    "FOOTER",
    "MAIN"
  ]);
  var HEADING_SELECTOR = "h1,h2,h3,h4,h5,h6";
  function getTextPreview(el, maxLen) {
    const limit = maxLen === void 0 ? 40 : maxLen;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > limit ? text.slice(0, limit) + "..." : text;
  }
  function segmentLabel(node) {
    const el = node.element;
    const tag = el.tagName.toLowerCase();
    if (SECTION_TAGS.has(el.tagName)) {
      const heading = el.querySelector(HEADING_SELECTOR);
      if (heading) {
        const text = getTextPreview(heading);
        if (text) return "Section: " + text;
      }
    }
    const preview = getTextPreview(el);
    return preview ? tag + ": " + preview : tag;
  }
  function generateTreePath(node) {
    const segments = [];
    let current = node;
    while (current) {
      segments.unshift(segmentLabel(current));
      current = current.parent;
    }
    return segments.join(" > ");
  }
  function segmentFor(el) {
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return tag;
    const index = Array.prototype.indexOf.call(parent.children, el) + 1;
    return tag + ":nth-child(" + index + ")";
  }
  function buildSelector(el, depth) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement && parts.length < depth) {
      if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) {
        parts.unshift("#" + node.id);
        return parts.join(" > ");
      }
      parts.unshift(segmentFor(node));
      node = node.parentElement;
    }
    return parts.join(" > ");
  }
  function generateSelector(el) {
    for (let depth = 1; depth <= 64; depth++) {
      const sel = buildSelector(el, depth);
      try {
        if (document.querySelectorAll(sel).length === 1 && document.querySelector(sel) === el) return sel;
      } catch (e) {
      }
    }
    return buildSelector(el, 64);
  }

  // src/discovery.js
  var DEFAULT_MAX_ELEMENTS = 200;
  var ITEM_MIN_TEXT = 50;
  var SVG_MIN_WIDTH = 24;
  var SEMANTIC_SECTIONS = /* @__PURE__ */ new Set([
    "SECTION",
    "ARTICLE",
    "ASIDE",
    "NAV",
    "HEADER",
    "FOOTER",
    "MAIN"
  ]);
  var HEADING_RE = /^H[1-6]$/;
  var MEDIA_TAGS = /* @__PURE__ */ new Set(["IMG", "VIDEO", "IFRAME"]);
  var INLINE_TAGS = /* @__PURE__ */ new Set([
    "SPAN",
    "EM",
    "STRONG",
    "CODE",
    "SMALL",
    "SUB",
    "SUP",
    "MARK"
  ]);
  var CARD_PATTERN = /card|tile|feature|step|hero|cta/i;
  function textOf(el) {
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }
  function svgWidth(el) {
    const attr = parseFloat(el.getAttribute("width"));
    if (!isNaN(attr)) return attr;
    return el.getBoundingClientRect ? el.getBoundingClientRect().width : 0;
  }
  function matchesSelector(el, selector) {
    if (!selector) return false;
    try {
      return el.matches(selector);
    } catch (e) {
      return false;
    }
  }
  function isPassthroughDiv(el) {
    if (el.tagName !== "DIV") return false;
    if (el.id || el.className) return false;
    const attrs = el.attributes;
    for (let i = 0; i < attrs.length; i++) {
      if (attrs[i].name.startsWith("data-")) return false;
    }
    const childElements = el.children;
    return childElements.length === 1;
  }
  function isComponentBoundary(el, options) {
    if (!(el instanceof Element) || el.nodeType !== 1) return false;
    if (el.hasAttribute("data-nitpik-host")) return false;
    if (el.hasAttribute("data-nitpik")) return true;
    if (matchesSelector(el, options && options.include)) return true;
    const tag = el.tagName;
    if (INLINE_TAGS.has(tag)) return false;
    if (SEMANTIC_SECTIONS.has(tag)) return true;
    if (HEADING_RE.test(tag)) return true;
    if (MEDIA_TAGS.has(tag)) return true;
    if (tag === "SVG" || tag === "svg") return svgWidth(el) > SVG_MIN_WIDTH;
    if (tag === "BUTTON") return true;
    if (tag === "A") return textOf(el).length > 0;
    const cls = typeof el.className === "string" ? el.className : "";
    if (CARD_PATTERN.test(cls) && textOf(el).length > ITEM_MIN_TEXT) return true;
    if (tag === "LI" && textOf(el).length > ITEM_MIN_TEXT) return true;
    if (isPassthroughDiv(el)) return false;
    return false;
  }
  function toInfo(node) {
    const el = node.element;
    return {
      element: el,
      path: generateTreePath(node),
      selector: generateSelector(el),
      textPreview: getTextPreview(el),
      tagName: el.tagName
    };
  }
  function buildTree(root, options) {
    const opts = options || {};
    const max = opts.maxElements === void 0 ? DEFAULT_MAX_ELEMENTS : opts.maxElements;
    const roots = [];
    const nodeMap = /* @__PURE__ */ new Map();
    const ancestorStack = [];
    function walk(el) {
      if (nodeMap.size >= max) return;
      if (el.hasAttribute && el.hasAttribute("data-nitpik-ignore")) return;
      if (matchesSelector(el, opts.exclude)) return;
      const isBoundary = isComponentBoundary(el, opts);
      let stackEntry = null;
      if (isBoundary) {
        const parent = ancestorStack.length > 0 ? ancestorStack[ancestorStack.length - 1] : null;
        const node = {
          element: el,
          parent,
          children: [],
          depth: parent ? parent.depth + 1 : 0,
          info: null
        };
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
        nodeMap.set(el, node);
        ancestorStack.push(node);
        stackEntry = node;
      }
      const children2 = el.children;
      if (children2) {
        for (let i = 0; i < children2.length; i++) {
          if (nodeMap.size >= max) break;
          walk(children2[i]);
        }
      }
      if (stackEntry) {
        ancestorStack.pop();
      }
    }
    const children = root.children;
    for (let i = 0; i < children.length; i++) {
      walk(children[i]);
    }
    for (const node of nodeMap.values()) {
      node.info = toInfo(node);
    }
    return { roots, nodeMap };
  }
  function observeDOM(root, nodeMap, callback, options) {
    const opts = options || {};
    const max = opts.maxElements === void 0 ? DEFAULT_MAX_ELEMENTS : opts.maxElements;
    function removeNode(el) {
      const node = nodeMap.get(el);
      if (!node) return;
      nodeMap.delete(el);
      if (node.parent) {
        const idx = node.parent.children.indexOf(node);
        if (idx >= 0) node.parent.children.splice(idx, 1);
      }
      node.children.slice().forEach((child) => removeNode(child.element));
    }
    const observer = new MutationObserver((mutations) => {
      let removed = false;
      mutations.forEach((m) => m.removedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        walkRemoved(n);
        removed = true;
      }));
      const newNodes = [];
      mutations.forEach((m) => m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1 || !n.isConnected) return;
        walkForNew(n, newNodes);
      }));
      if (!newNodes.length) return;
      callback(newNodes);
    });
    function walkRemoved(el) {
      if (nodeMap.has(el)) removeNode(el);
      const children = el.children;
      if (children) {
        for (let i = 0; i < children.length; i++) walkRemoved(children[i]);
      }
    }
    function walkForNew(el, collected) {
      if (nodeMap.size >= max || collected.length + nodeMap.size >= max) return;
      if (!el.isConnected) return;
      if (el.hasAttribute && el.hasAttribute("data-nitpik-ignore")) return;
      if (matchesSelector(el, opts.exclude)) return;
      if (isComponentBoundary(el, opts) && !nodeMap.has(el)) {
        let parent = null;
        let walk = el.parentElement;
        while (walk && walk !== root) {
          if (nodeMap.has(walk)) {
            parent = nodeMap.get(walk);
            break;
          }
          walk = walk.parentElement;
        }
        const node = {
          element: el,
          parent,
          children: [],
          depth: parent ? parent.depth + 1 : 0,
          info: null
        };
        if (parent) parent.children.push(node);
        nodeMap.set(el, node);
        node.info = toInfo(node);
        collected.push(node);
      }
      const children = el.children;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          walkForNew(children[i], collected);
        }
      }
    }
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }

  // src/storage.js
  var SCHEMA_VERSION = "1";
  var STORAGE_PREFIX = "nitpik:";
  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }
  function copyText(text) {
    const clip = typeof navigator !== "undefined" && navigator.clipboard;
    if (clip && typeof clip.writeText === "function" && window.isSecureContext) {
      try {
        clip.writeText(text).catch(function() {
          fallbackCopy(text);
        });
        return;
      } catch (e) {
      }
    }
    fallbackCopy(text);
  }
  function formatMarkdown(comments) {
    return comments.map(function(c) {
      return "### " + c.path + "\n\n" + c.comment + "\n\n\u2014 " + c.reviewer + ", " + c.timestamp + "\n\n---";
    }).join("\n\n");
  }
  function createClipboardAdapter(emitter) {
    let count = 0;
    return {
      submit(data) {
        copyText("[" + data.path + "]: " + data.comment);
        count++;
        emitter.emit("comment", data);
      },
      get count() {
        return count;
      }
    };
  }
  function loadStored(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed && Array.isArray(parsed.comments) ? parsed.comments : [];
    } catch (e) {
      return [];
    }
  }
  function createCollectAdapter(emitter, options) {
    const key = STORAGE_PREFIX + (options.pageKey || "default");
    let comments = loadStored(key);
    function persist() {
      try {
        localStorage.setItem(key, exportJSON());
      } catch (e) {
      }
    }
    function exportJSON() {
      return JSON.stringify({ version: SCHEMA_VERSION, comments }, null, 2);
    }
    function exportMarkdown() {
      return formatMarkdown(comments);
    }
    return {
      submit(data) {
        comments.push(data);
        persist();
        emitter.emit("comment", data);
      },
      getComments() {
        return comments.slice();
      },
      exportMarkdown,
      exportJSON,
      download(format) {
        const isMd = format === "markdown" || format === "md";
        const blob = new Blob([isMd ? exportMarkdown() : exportJSON()], {
          type: isMd ? "text/markdown" : "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "nitpik-comments." + (isMd ? "md" : "json");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 0);
      },
      clear() {
        comments = [];
        try {
          localStorage.removeItem(key);
        } catch (e) {
        }
      },
      get count() {
        return comments.length;
      }
    };
  }
  function createCallbackAdapter(emitter) {
    let count = 0;
    return {
      submit(data) {
        if (typeof window.nitpikOnComment === "function") window.nitpikOnComment(data);
        else console.warn("NitPik: window.nitpikOnComment is not defined");
        count++;
        emitter.emit("comment", data);
      },
      get count() {
        return count;
      }
    };
  }
  function createApiAdapter(emitter, options) {
    let count = 0;
    return {
      submit(data) {
        if (!options.endpoint) {
          console.warn("NitPik: api mode requires an endpoint option");
        } else {
          const headers = { "Content-Type": "application/json" };
          if (options.apiKey) headers["X-API-Key"] = options.apiKey;
          fetch(options.endpoint, { method: "POST", headers, body: JSON.stringify(data) }).catch(function(err) {
            console.warn("NitPik: failed to POST comment", err);
          });
        }
        count++;
        emitter.emit("comment", data);
      },
      get count() {
        return count;
      }
    };
  }
  function createStorage(mode, emitter, options) {
    const opts = options || {};
    switch (mode) {
      case "clipboard":
        return createClipboardAdapter(emitter);
      case "collect":
        return createCollectAdapter(emitter, opts);
      case "callback":
        return createCallbackAdapter(emitter);
      case "api":
        return createApiAdapter(emitter, opts);
      default:
        throw new Error('NitPik: unknown storage mode "' + mode + '"');
    }
  }

  // src/styles.js
  var STYLES = `
:host { all: initial; --nitpik-color: #F59E0B; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; color: #1f2937; }
*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; cursor: pointer; }

[data-nitpik-trigger] {
  position: absolute; width: 24px; height: 24px; padding: 0; margin: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--nitpik-color); color: #fff; border: 0; border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.25); opacity: 0; transition: opacity .15s ease;
  z-index: 2147483000;
}
[data-nitpik-trigger].visible, [data-nitpik-trigger]:focus-visible, [data-nitpik-trigger]:hover { opacity: 1; }
[data-nitpik-trigger] svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
:focus-visible { outline: 2px solid #1f2937; outline-offset: 2px; }

[data-nitpik-popover] {
  position: fixed; width: 360px; max-width: 360px; background: #fff; border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.22); padding: 12px; z-index: 2147483600;
  border-top: 3px solid var(--nitpik-color);
}
[data-nitpik-popover] form { display: flex; flex-direction: column; gap: 8px; margin: 0; }
[data-nitpik-path] { font-size: 12px; color: #6b7280; word-break: break-word; }
[data-nitpik-popover] textarea {
  width: 100%; min-height: 80px; resize: vertical; font: inherit; padding: 8px;
  border: 1px solid #d1d5db; border-radius: 6px; color: inherit; background: #fff;
}
.nitpik-actions { display: flex; justify-content: flex-end; gap: 8px; }
.nitpik-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #1f2937; }
.nitpik-btn.primary { background: var(--nitpik-color); border-color: var(--nitpik-color); color: #1f2937; font-weight: 600; }

[data-nitpik-counter] {
  position: fixed; bottom: 16px; right: 16px; padding: 8px 14px; border: 0; border-radius: 999px;
  background: var(--nitpik-color); color: #1f2937; font-weight: 600; box-shadow: 0 2px 10px rgba(0,0,0,.25);
  z-index: 2147483500;
}
[data-nitpik-panel] {
  position: fixed; bottom: 60px; right: 16px; width: 320px; max-width: calc(100vw - 32px); max-height: 60vh;
  display: flex; flex-direction: column; background: #fff; border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.22); z-index: 2147483500; overflow: hidden;
}
[data-nitpik-panel] ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
[data-nitpik-panel] li { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
[data-nitpik-panel] li b { display: block; font-size: 12px; color: #6b7280; font-weight: 500; }
.nitpik-panel-actions { display: flex; gap: 6px; padding: 8px 12px; border-top: 1px solid #e5e7eb; }

[data-nitpik-toast] {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%); padding: 8px 16px;
  background: #1f2937; color: #fff; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.3);
  animation: nitpik-slide .25s ease-out; z-index: 2147483647;
}
@keyframes nitpik-slide { from { transform: translate(-50%, -150%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

@media (max-width: 480px) {
  [data-nitpik-popover] { width: 100%; max-width: 100%; left: 0 !important; border-radius: 10px 10px 0 0; }
}
[data-nitpik-highlight] {
  position: absolute; pointer-events: none;
  outline: 2px dashed var(--nitpik-color);
  outline-offset: 2px; border-radius: 4px;
  transition: top .1s ease-out, left .1s ease-out, width .1s ease-out, height .1s ease-out;
  z-index: 2147482999; display: none;
}

@media (prefers-reduced-motion: reduce) {
  [data-nitpik-toast] { animation: none; }
  [data-nitpik-trigger] { transition: none; }
  [data-nitpik-highlight] { transition: none; }
}
`;

  // src/ui.js
  var MAX_PATH = 80;
  var MAX_COMMENT_PREVIEW = 80;
  var TOAST_MS = 2e3;
  var ICON_PATH = "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.7.7 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var POPOVER_GAP = 8;
  var POPOVER_EST_HEIGHT = 200;
  var TRIGGER_SIZE = 24;
  function truncate(text, max) {
    return text.length > max ? text.slice(0, max) + "..." : text;
  }
  function h(tag, attrs = {}, text) {
    const el = document.createElement(tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  }
  function buildIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", ICON_PATH);
    svg.appendChild(p);
    return svg;
  }
  function createUI(options = {}) {
    const { color = "#F59E0B", onSubmit = () => {
    }, reviewer = "" } = options;
    let host = null;
    let root = null;
    let nodeMap = null;
    let triggerEl = null;
    let highlightEl = null;
    let activeNode = null;
    let popover = null;
    let counter = null;
    let panel = null;
    let comments = [];
    let reviewMode = false;
    let resizeObserver = null;
    const cleanups = [];
    const commented = /* @__PURE__ */ new Set();
    const ctl = {};
    function listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    }
    function findActiveNode(target) {
      if (!nodeMap) return null;
      let el = target;
      while (el && el !== document.body && el !== document.documentElement) {
        if (nodeMap.has(el)) return nodeMap.get(el);
        el = el.parentElement;
      }
      return null;
    }
    function positionTrigger(node) {
      if (!triggerEl || !node) return;
      const r = node.element.getBoundingClientRect();
      const half = TRIGGER_SIZE / 2;
      let top = r.top + window.scrollY - half;
      let left = r.right + window.scrollX - half;
      if (top < 0) top = 0;
      if (left < 0) left = 0;
      const vw = document.documentElement.clientWidth || window.innerWidth || 1024;
      if (left + TRIGGER_SIZE > vw + window.scrollX) left = vw + window.scrollX - TRIGGER_SIZE;
      triggerEl.style.top = `${top}px`;
      triggerEl.style.left = `${left}px`;
      triggerEl.style.opacity = "1";
      triggerEl.setAttribute("aria-label", `Comment on ${truncate(node.info.path, MAX_PATH)}`);
    }
    function positionHighlight(node) {
      if (!highlightEl || !node) return;
      const r = node.element.getBoundingClientRect();
      highlightEl.style.top = `${r.top + window.scrollY}px`;
      highlightEl.style.left = `${r.left + window.scrollX}px`;
      highlightEl.style.width = `${r.width}px`;
      highlightEl.style.height = `${r.height}px`;
      highlightEl.style.display = "block";
    }
    function hideUI() {
      if (triggerEl) {
        triggerEl.style.opacity = "0";
      }
      if (highlightEl) {
        highlightEl.style.display = "none";
      }
      activeNode = null;
    }
    function onMouseMove(e) {
      if (popover) return;
      const target = e.target;
      if (host && (target === host || host.contains(target))) return;
      processHover(target);
    }
    function processHover(target) {
      const node = findActiveNode(target);
      if (node === activeNode) return;
      if (!node) {
        hideUI();
        return;
      }
      activeNode = node;
      positionTrigger(node);
      positionHighlight(node);
    }
    function closePopover() {
      if (popover) popover.remove();
      popover = null;
    }
    function placePopover(el, anchor) {
      const r = anchor.getBoundingClientRect();
      const vh = window.innerHeight || 768;
      const vw = window.innerWidth || 1024;
      const below = r.bottom + POPOVER_GAP;
      const top = below + POPOVER_EST_HEIGHT > vh ? Math.max(POPOVER_GAP, r.top - POPOVER_EST_HEIGHT - POPOVER_GAP) : below;
      const left = Math.max(POPOVER_GAP, Math.min(r.left, vw - 360 - POPOVER_GAP));
      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
    }
    function openPopover() {
      if (!activeNode) return;
      closePopover();
      const node = activeNode;
      const { info } = node;
      popover = h("div", { "data-nitpik-popover": "", role: "dialog", "aria-label": "Add comment" });
      const form = h("form");
      const label = h("div", { "data-nitpik-path": "" }, truncate(info.path, MAX_PATH));
      const ta = h("textarea", { "aria-label": "Comment", placeholder: "Your feedback..." });
      const actions = h("div", { class: "nitpik-actions" });
      const cancel = h("button", { type: "button", class: "nitpik-btn", "data-nitpik-cancel": "" }, "Cancel");
      const submit = h("button", { type: "submit", class: "nitpik-btn primary" }, "Submit");
      actions.append(cancel, submit);
      form.append(label, ta, actions);
      popover.appendChild(form);
      root.appendChild(popover);
      placePopover(popover, info.element);
      cancel.addEventListener("click", closePopover);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const comment = ta.value.trim();
        if (!comment) {
          ta.focus();
          return;
        }
        const { path, selector, tagName, textPreview } = info;
        info.element.setAttribute("data-nitpik-commented", "");
        info.element.style.outline = `2px dashed ${color}`;
        commented.add(info.element);
        closePopover();
        onSubmit({ selector, path, tagName, textPreview, comment, reviewer, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      });
      ta.focus();
    }
    function onKeydown(e) {
      if (!popover) return;
      if (e.key === "Escape") {
        closePopover();
        return;
      }
      if (e.key !== "Tab") return;
      const f = [...popover.querySelectorAll("textarea, button")];
      const first = f[0];
      const last = f[f.length - 1];
      const active = root.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    function renderPanel() {
      if (panel) panel.remove();
      panel = h("div", { "data-nitpik-panel": "" });
      const ul = h("ul");
      comments.forEach((c) => {
        const li = h("li");
        li.append(h("b", {}, truncate(c.path || "", MAX_PATH)), h("span", {}, truncate(c.comment || "", MAX_COMMENT_PREVIEW)));
        ul.appendChild(li);
      });
      const actions = h("div", { class: "nitpik-panel-actions" });
      [["Export MD", "md"], ["Export JSON", "json"], ["Clear", "clear"]].forEach(([text, fmt]) => {
        const b = h("button", { type: "button", class: "nitpik-btn" }, text);
        b.addEventListener("click", () => ctl.onExport && ctl.onExport(fmt));
        actions.appendChild(b);
      });
      panel.append(ul, actions);
      root.appendChild(panel);
    }
    ctl.mount = function mount() {
      if (host) return;
      host = h("div", { "data-nitpik-host": "" });
      root = host.attachShadow({ mode: "open" });
      host.style.setProperty("--nitpik-color", color);
      root.appendChild(h("style", {}, STYLES));
      document.body.appendChild(host);
      listen(document, "mousemove", onMouseMove);
      listen(document, "keydown", onKeydown);
      listen(window, "scroll", () => {
        if (activeNode) {
          positionTrigger(activeNode);
          positionHighlight(activeNode);
        }
      });
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          if (activeNode) {
            positionTrigger(activeNode);
            positionHighlight(activeNode);
          }
        });
        resizeObserver.observe(document.body);
      }
    };
    ctl.setTree = function setTree(map) {
      nodeMap = map;
      if (!root) return;
      if (!triggerEl) {
        triggerEl = h("button", {
          type: "button",
          tabindex: "0",
          "data-nitpik-trigger": "",
          "aria-label": "Comment"
        });
        triggerEl.appendChild(buildIcon());
        triggerEl.style.opacity = "0";
        triggerEl.addEventListener("click", openPopover);
        root.appendChild(triggerEl);
      }
      if (!highlightEl) {
        highlightEl = h("div", { "data-nitpik-highlight": "" });
        root.appendChild(highlightEl);
      }
      if (reviewMode && triggerEl) triggerEl.classList.add("visible");
    };
    ctl.clearTree = function clearTree() {
      nodeMap = null;
      activeNode = null;
      if (triggerEl) triggerEl.style.opacity = "0";
      if (highlightEl) highlightEl.style.display = "none";
      closePopover();
    };
    ctl.showToast = function showToast(message) {
      if (!root) return;
      const toast = h("div", { "data-nitpik-toast": "", role: "status" }, message);
      root.appendChild(toast);
      const id = setTimeout(() => toast.remove(), TOAST_MS);
      cleanups.push(() => clearTimeout(id));
    };
    ctl.showCounter = function showCounter(count, list = []) {
      if (!root) return;
      comments = list;
      if (!counter) {
        counter = h("button", { type: "button", "data-nitpik-counter": "", "aria-label": "Show comments" });
        counter.addEventListener("click", () => {
          if (panel) {
            panel.remove();
            panel = null;
          } else renderPanel();
        });
        root.appendChild(counter);
      }
      counter.textContent = `${count} comment${count === 1 ? "" : "s"}`;
      if (panel) renderPanel();
    };
    ctl.setReviewMode = function setReviewMode(on) {
      reviewMode = !!on;
      if (triggerEl) triggerEl.classList.toggle("visible", reviewMode);
    };
    ctl.destroy = function destroy2() {
      cleanups.splice(0).forEach((fn) => fn());
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = null;
      commented.forEach((el) => {
        el.removeAttribute("data-nitpik-commented");
        el.style.outline = "";
      });
      commented.clear();
      closePopover();
      if (host) host.remove();
      host = root = popover = counter = panel = triggerEl = highlightEl = activeNode = null;
      nodeMap = null;
    };
    return ctl;
  }

  // src/index.js
  var REVIEWER_KEY = "nitpik:reviewer";
  var TOASTS = { clipboard: "Copied!", collect: "Comment saved", callback: "Comment sent", api: "Comment sent" };
  var ATTR_MAP = {
    mode: "data-mode",
    color: "data-color",
    position: "data-position",
    exclude: "data-exclude",
    include: "data-include",
    reviewer: "data-reviewer",
    endpoint: "data-endpoint",
    apiKey: "data-api-key"
  };
  function parseScriptConfig(script) {
    const cfg = {};
    if (!script) return cfg;
    Object.keys(ATTR_MAP).forEach((key) => {
      const v = script.getAttribute(ATTR_MAP[key]);
      if (v !== null && v !== "") cfg[key] = v;
    });
    const max = parseInt(script.getAttribute("data-max-elements"), 10);
    if (!isNaN(max)) cfg.maxElements = max;
    return cfg;
  }
  function findScript() {
    return document.currentScript || document.querySelector('script[src*="nitpik"]');
  }
  function readStoredReviewer() {
    try {
      return localStorage.getItem(REVIEWER_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function saveReviewer(name) {
    try {
      localStorage.setItem(REVIEWER_KEY, name);
    } catch (e) {
    }
  }
  var scriptEl = typeof document !== "undefined" ? document.currentScript : null;
  var scriptConfig = parseScriptConfig(scriptEl || (typeof document !== "undefined" ? document.querySelector('script[src*="nitpik"]') : null));
  var state = null;
  var listeners = [];
  function init(options) {
    if (state) {
      console.warn("NitPik: already initialized");
      return;
    }
    const opts = Object.assign({ mode: "clipboard" }, scriptConfig, options || {});
    const emitter = createEmitter();
    listeners.forEach((l) => emitter.on(l.event, l.fn));
    const storage = createStorage(opts.mode, emitter, {
      endpoint: opts.endpoint,
      apiKey: opts.apiKey,
      pageKey: opts.pageKey || (typeof location !== "undefined" ? location.pathname : void 0)
    });
    const reviewer = opts.reviewer || readStoredReviewer();
    function handleSubmit(data) {
      storage.submit(data);
      if (data && data.reviewer) saveReviewer(data.reviewer);
      ui.showToast(TOASTS[opts.mode] || "Comment saved");
      ui.showCounter(storage.count, storage.getComments ? storage.getComments() : []);
    }
    const ui = createUI({
      color: opts.color,
      reviewer,
      onSubmit: (data) => {
        handleSubmit(data);
      }
    });
    ui.onExport = (format) => {
      if (format === "clear") {
        if (storage.clear) storage.clear();
        ui.showCounter(storage.count, storage.getComments ? storage.getComments() : []);
        return void 0;
      }
      if (storage.download) storage.download(format);
      return void 0;
    };
    ui.mount();
    const discoveryOpts = { include: opts.include, exclude: opts.exclude, maxElements: opts.maxElements };
    const { nodeMap } = buildTree(document.body, discoveryOpts);
    ui.setTree(nodeMap);
    const stopDOM = observeDOM(document.body, nodeMap, () => {
      ui.setTree(nodeMap);
    }, discoveryOpts);
    state = { emitter, storage, ui, stopDOM, handleSubmit, onExport: ui.onExport };
  }
  function destroy() {
    if (!state) return;
    state.stopDOM();
    state.ui.destroy();
    state = null;
  }
  var api = {
    init,
    destroy,
    getComments() {
      return state && state.storage.getComments ? state.storage.getComments() : [];
    },
    exportMarkdown() {
      return state && state.storage.exportMarkdown ? state.storage.exportMarkdown() : "";
    },
    exportJSON() {
      return state && state.storage.exportJSON ? state.storage.exportJSON() : JSON.stringify({ comments: [] });
    },
    download(format) {
      if (state && state.storage.download) state.storage.download(format);
    },
    on(event, fn) {
      listeners.push({ event, fn });
      if (state) state.emitter.on(event, fn);
    },
    off(event, fn) {
      const i = listeners.findIndex((l) => l.event === event && l.fn === fn);
      if (i >= 0) listeners.splice(i, 1);
      if (state) state.emitter.off(event, fn);
    },
    get count() {
      return state ? state.storage.count : 0;
    }
  };
  var __internals = {
    submit(data) {
      if (state) state.handleSubmit(data);
    },
    exportAction(fmt) {
      return state ? state.onExport(fmt) : void 0;
    }
  };
  var index_default = api;
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.NitPik = api;
    if (scriptEl || findScript()) {
      const start = () => init();
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
      else start();
    }
  }
  return __toCommonJS(index_exports);
})();
NitPik = NitPik.default;
