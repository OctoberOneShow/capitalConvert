/*
 * Minimal hand-written DOM / window / localStorage stub.
 *
 * Deliberately dependency-free (no jsdom): the project has no package.json and
 * the pet feature must not add dependencies. It implements only the surface
 * that assets/app.js touches at load time and that the pet companion uses.
 */
"use strict";

const vm = require("vm");

function createStyle() {
  const style = {
    _props: Object.create(null),
    setProperty(name, value) {
      style._props[name] = String(value);
    },
    getPropertyValue(name) {
      return style._props[name] === undefined ? "" : style._props[name];
    },
    removeProperty(name) {
      delete style._props[name];
    },
  };
  return style;
}

function createClassList(element) {
  return {
    add(...names) {
      names.forEach((name) => {
        String(name)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((part) => element._classes.add(part));
      });
    },
    remove(...names) {
      names.forEach((name) => element._classes.delete(name));
    },
    contains(name) {
      return element._classes.has(name);
    },
    toggle(name, force) {
      const shouldAdd = force === undefined ? !element._classes.has(name) : !!force;
      if (shouldAdd) element._classes.add(name);
      else element._classes.delete(name);
      return shouldAdd;
    },
    get value() {
      return Array.from(element._classes).join(" ");
    },
  };
}

class StubEvent {
  constructor(type, init) {
    this.type = type;
    this.defaultPrevented = false;
    Object.assign(this, init || {});
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {}
  stopImmediatePropagation() {}
}

class StubNode {
  constructor(ownerDocument, namespaceURI) {
    this.ownerDocument = ownerDocument;
    this.namespaceURI = namespaceURI || null;
    this.childNodes = [];
    this.parentNode = null;
    this._listeners = Object.create(null);
    this._classes = new Set();
    this.hidden = false;
    this.namespaceURI = namespaceURI || null;
  }

  get children() {
    return this.childNodes.filter((node) => node.nodeType === 1);
  }

  get firstChild() {
    return this.childNodes.length ? this.childNodes[0] : null;
  }

  get lastChild() {
    return this.childNodes.length
      ? this.childNodes[this.childNodes.length - 1]
      : null;
  }

  get classList() {
    if (!this._classList) this._classList = createClassList(this);
    return this._classList;
  }

  get className() {
    return this.classList.value;
  }

  set className(value) {
    this._classes = new Set(
      String(value)
        .split(/\s+/)
        .filter(Boolean),
    );
  }

  get textContent() {
    if (this.nodeType === 3) return this._text || "";
    return this.childNodes.map((node) => node.textContent).join("");
  }

  set textContent(value) {
    const text = new StubText(this.ownerDocument, value);
    this.childNodes = [text];
    text.parentNode = this;
  }

  get innerHTML() {
    return this._innerHTML || "";
  }

  set innerHTML(value) {
    this.childNodes = [];
    this._innerHTML = String(value);
  }

  appendChild(node) {
    if (!node) return node;
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore(node, reference) {
    const index = reference ? this.childNodes.indexOf(reference) : -1;
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    if (index === -1) this.childNodes.push(node);
    else this.childNodes.splice(index, 0, node);
    return node;
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node);
    if (index !== -1) this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  replaceChildren() {
    this.childNodes = [];
  }

  prepend(...nodes) {
    nodes
      .slice()
      .reverse()
      .forEach((node) => this.insertBefore(node, this.firstChild));
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  contains(node) {
    if (node === this) return true;
    return this.childNodes.some((child) => child.contains && child.contains(node));
  }

  addEventListener(type, handler) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter((fn) => fn !== handler);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    event.currentTarget = this;
    const handlers = (this._listeners[event.type] || []).slice();
    handlers.forEach((handler) => {
      if (typeof handler === "function") handler.call(this, event);
      else if (handler && typeof handler.handleEvent === "function") {
        handler.handleEvent(event);
      }
    });
    if (!event._noBubble && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    } else if (!event._noBubble && this.ownerDocument) {
      this.ownerDocument.dispatchEvent(event);
    }
    return !event.defaultPrevented;
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  blur() {
    if (this.ownerDocument && this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = null;
    }
  }

  select() {}
  setSelectionRange() {}

  getBoundingClientRect() {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  }

  get offsetWidth() {
    return 0;
  }

  get offsetHeight() {
    return 0;
  }

  get offsetTop() {
    return 0;
  }

  get offsetParent() {
    return null;
  }

  closest(selector) {
    let node = this;
    while (node && node.nodeType === 1) {
      if (node.matches(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const out = [];
    const visit = (node) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType !== 1) return;
        if (matchesSelector(child, selector)) out.push(child);
        visit(child);
      });
    };
    visit(this);
    return out;
  }

  getElementsByClassName(className) {
    return this.querySelectorAll("." + className);
  }
}

class StubText extends StubNode {
  constructor(ownerDocument, text) {
    super(ownerDocument);
    this.nodeType = 3;
    this.nodeName = "#text";
    this._text = String(text);
  }
}

class StubElement extends StubNode {
  constructor(ownerDocument, tagName, namespaceURI) {
    super(ownerDocument, namespaceURI);
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.nodeName = this.tagName;
    this._attributes = Object.create(null);
    this.style = createStyle();
    this.value = "";
    this.checked = false;
    this.type = "";
    this.dataset = {};
  }

  get id() {
    return this._attributes.id || "";
  }

  set id(value) {
    this._attributes.id = String(value);
  }

  getAttribute(name) {
    if (name === "class") return this.classList.value || null;
    if (name === "id") return this._attributes.id || null;
    return this._attributes[name] === undefined ? null : this._attributes[name];
  }

  setAttribute(name, value) {
    if (name === "class") {
      this.className = value;
      return;
    }
    if (name === "hidden") {
      this.hidden = true;
      return;
    }
    this._attributes[name] = String(value);
  }

  removeAttribute(name) {
    if (name === "class") {
      this._classes = new Set();
      return;
    }
    delete this._attributes[name];
  }

  hasAttribute(name) {
    if (name === "class") return this._classes.size > 0;
    if (name === "hidden") return !!this.hidden;
    return this._attributes[name] !== undefined;
  }

  click() {
    this.dispatchEvent(new StubEvent("click", { bubbles: true }));
  }

  /* Web Animations API stub: app.js uses element.animate() for page fx. */
  animate() {
    return {
      finished: Promise.resolve(),
      onfinish: null,
      cancel() {},
      play() {},
      pause() {},
      finish() {},
    };
  }

  getContext() {    const gradient = { addColorStop() {} };
    return new Proxy(
      {},
      {
        get(target, prop) {
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => gradient;
          }
          if (typeof prop === "string") {
            if (!(prop in target)) return () => {};
            return target[prop];
          }
          return undefined;
        },
        set() {
          return true;
        },
      },
    );
  }
}

/* --- selector support (tag / #id / .class / [attr] / [attr="v"] + descendant) --- */

const PART_RE =
  /\.([A-Za-z0-9_-]+)|#([A-Za-z0-9_-]+)|\[([A-Za-z0-9_:-]+)(?:([~|^$*]?=)"([^"]*)")?\]/g;

function matchesSimple(element, selector) {
  let source = selector.trim();
  if (!source) return false;
  const tagMatch = /^([A-Za-z][A-Za-z0-9-]*|\*)/.exec(source);
  if (tagMatch) {
    source = source.slice(tagMatch[0].length);
    if (tagMatch[1] !== "*" && element.tagName !== tagMatch[1].toUpperCase()) {
      return false;
    }
  }
  PART_RE.lastIndex = 0;
  let match;
  while ((match = PART_RE.exec(source)) !== null) {
    if (match[1] && !element.classList.contains(match[1])) return false;
    if (match[2] && element.id !== match[2]) return false;
    if (match[3]) {
      const actual = element.getAttribute(match[3]);
      if (actual === null) return false;
      if (match[4] === "=" && actual !== match[5]) return false;
    }
  }
  return true;
}

function matchesSelector(element, selector) {
  return String(selector)
    .split(",")
    .some((group) => {
      const parts = group.trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return false;
      if (!matchesSimple(element, parts[parts.length - 1])) return false;
      let node = element.parentNode;
      let index = parts.length - 2;
      while (node && index >= 0) {
        if (node.nodeType === 1 && matchesSimple(node, parts[index])) index -= 1;
        node = node.parentNode;
      }
      return index < 0;
    });
}

/* --- environment -------------------------------------------------- */

function createEnvironment(options) {
  const settings = Object.assign(
    {
      now: 1757000000000,
      url: "file:///C:/project/index.html",
      language: "en-US",
      motion: "full",
      theme: "dark",
      page: "formatter",
      store: null,
      storageMode: "normal", // normal | readonly | readwrite-throw | absent
      hidden: false,
      coarsePointer: false,
    },
    options || {},
  );

  const clock = { now: settings.now };
  const store = settings.store || new Map();

  const sandbox = {};
  const document = {
    nodeType: 9,
    readyState: "loading",
    title: "",
    activeElement: null,
    hidden: false,
    visibilityState: "visible",
    _listeners: Object.create(null),
    createElement: (tag) => new StubElement(document, tag),
    createElementNS: (ns, tag) => new StubElement(document, tag, ns),
    createTextNode: (text) => new StubText(document, text),
    createDocumentFragment: () => new StubElement(document, "fragment"),
    addEventListener(type, handler) {
      if (!document._listeners[type]) document._listeners[type] = [];
      document._listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      if (!document._listeners[type]) return;
      document._listeners[type] = document._listeners[type].filter(
        (fn) => fn !== handler,
      );
    },
    dispatchEvent(event) {
      const list = (document._listeners[event.type] || []).slice();
      list.forEach((handler) => handler.call(document, event));
      return !event.defaultPrevented;
    },
    getElementById(id) {
      const found = document.documentElement.querySelector("#" + id);
      return found || null;
    },
    querySelector(selector) {
      return document.documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return document.documentElement.querySelectorAll(selector);
    },
    getElementsByTagName(tag) {
      return document.documentElement.querySelectorAll(tag);
    },
  };
  document.documentElement = new StubElement(document, "html");
  document.documentElement.setAttribute("data-motion", settings.motion);
  document.documentElement.setAttribute("data-theme", settings.theme);
  document.documentElement.setAttribute("data-page", settings.page);
  document.head = new StubElement(document, "head");
  document.body = new StubElement(document, "body");
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);

  Object.defineProperty(document, "hidden", {
    get() {
      return !!sandbox.__documentHidden;
    },
    configurable: true,
  });

  const localStorage = (() => {
    if (settings.storageMode === "absent") return undefined;
    const api = {
      getItem(key) {
        if (settings.storageMode === "readonly") throw new Error("storage blocked");
        if (settings.storageMode === "readwrite-throw") {
          throw new Error("storage blocked");
        }
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        if (settings.storageMode !== "normal") throw new Error("storage blocked");
        store.set(key, String(value));
      },
      removeItem(key) {
        if (settings.storageMode !== "normal") throw new Error("storage blocked");
        store.delete(key);
      },
      clear() {
        if (settings.storageMode !== "normal") throw new Error("storage blocked");
        store.clear();
      },
      key(index) {
        return Array.from(store.keys())[index] || null;
      },
      get length() {
        return store.size;
      },
    };
    return api;
  })();

  const timers = createTimers(clock);

  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(clock.now);
      else super(...args);
    }
    static now() {
      return clock.now;
    }
  }

  const window = {
    document,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    setInterval: timers.setInterval,
    clearInterval: timers.clearInterval,
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    addEventListener(type, handler) {
      if (!window._listeners[type]) window._listeners[type] = [];
      window._listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      if (!window._listeners[type]) return;
      window._listeners[type] = window._listeners[type].filter((fn) => fn !== handler);
    },
    dispatchEvent(event) {
      const list = (window._listeners[event.type] || []).slice();
      list.forEach((handler) => handler.call(window, event));
      return !event.defaultPrevented;
    },
    _listeners: Object.create(null),
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    matchMedia(query) {
      return {
        matches:
          settings.coarsePointer && /pointer:\s*coarse/.test(query) ? true : false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      };
    },
    getComputedStyle() {
      return { getPropertyValue: () => "" };
    },
    navigator: null,
    location: null,
    localStorage,
    Date: FakeDate,
    setTimeoutMs: null,
  };
  window.window = window;
  window.self = window;
  window.globalThis = window;

  const location = {
    href: settings.url,
    pathname: settings.url.replace(/^[a-z]+:\/\/[^/]+/i, ""),
    search: "",
    hash: "",
    protocol: "file:",
    reload() {
      location.reloadCount += 1;
    },
    reloadCount: 0,
  };
  const navigator = {
    language: settings.language,
    languages: [settings.language],
    userAgent: "stub",
  };
  window.location = location;
  window.navigator = navigator;

  Object.assign(sandbox, {
    window,
    self: window,
    document,
    location,
    navigator,
    localStorage,
    Date: FakeDate,
    console,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Error,
    RegExp,
    Promise,
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
    undefined,
  });
  // app.js uses a few window members without the `window.` prefix.
  [
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "matchMedia",
    "getComputedStyle",
    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
  ].forEach((name) => {
    sandbox[name] = window[name];
  });
  sandbox.innerWidth = window.innerWidth;
  sandbox.innerHeight = window.innerHeight;
  sandbox.devicePixelRatio = window.devicePixelRatio;
  if (localStorage === undefined) sandbox.localStorage = undefined;

  vm.createContext(sandbox);

  const api = {
    sandbox,
    window,
    document,
    localStorage,
    store,
    clock,
    timers,
    Date: FakeDate,
    setHidden(value) {
      sandbox.__documentHidden = !!value;
      document.visibilityState = value ? "hidden" : "visible";
    },
    setMotion(level) {
      document.documentElement.setAttribute("data-motion", level);
    },
    setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
    },
    fireDocument(type) {
      document.dispatchEvent(new StubEvent(type));
    },
    fireWindow(type) {
      window.dispatchEvent(new StubEvent(type));
    },
    dispatch(target, type, init) {
      return target.dispatchEvent(new StubEvent(type, init));
    },
    load(appSource) {
      vm.runInContext(appSource, sandbox, { filename: "assets/app.js" });
    },
    /*
     * Fires DOMContentLoaded like a browser, but records the first init error
     * instead of rethrowing: app.js has pre-existing unguarded localStorage
     * reads (initTheme) that throw when storage access itself is blocked, and
     * those must not hide the pet result.
     */
    domReady() {
      document.readyState = "complete";
      try {
        document.dispatchEvent(new StubEvent("DOMContentLoaded"));
        api.initError = null;
      } catch (error) {
        api.initError = error;
      }
      return api.initError;
    },
    byId(id) {
      return document.getElementById(id);
    },
    queryAll(selector) {
      return document.querySelectorAll(selector);
    },
    readState() {
      const raw = store.get("capitalconvert-pet");
      return raw === undefined ? null : JSON.parse(raw);
    },
  };
  return api;
}

function createTimers(clock) {
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, due: clock.now + (Number(ms) || 0), interval: null });
      return id;
    },
    setInterval(fn, ms) {
      const id = nextId++;
      const every = Math.max(1, Number(ms) || 1);
      timers.set(id, { fn, due: clock.now + every, interval: every });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    clearInterval(id) {
      timers.delete(id);
    },
    advance(ms) {
      const target = clock.now + Number(ms);
      let guard = 0;
      for (;;) {
        let chosen = null;
        timers.forEach((timer, id) => {
          if (timer.due > target) return;
          if (!chosen || timer.due < chosen.timer.due || (timer.due === chosen.timer.due && id < chosen.id)) {
            chosen = { id, timer };
          }
        });
        if (!chosen) break;
        if (++guard > 200000) throw new Error("timer loop guard exceeded");
        clock.now = chosen.timer.due;
        if (chosen.timer.interval === null) timers.delete(chosen.id);
        else chosen.timer.due = clock.now + chosen.timer.interval;
        chosen.timer.fn();
      }
      clock.now = target;
    },
    pendingCount() {
      return timers.size;
    },
    pendingIntervals() {
      return Array.from(timers.values()).filter((timer) => timer.interval !== null).length;
    },
    pendingTimeouts() {
      return Array.from(timers.values()).filter((timer) => timer.interval === null).length;
    },
  };
}

module.exports = { createEnvironment, StubEvent };
