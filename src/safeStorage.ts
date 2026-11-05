// Polyfill in-memory Storage when running inside cross-origin iframes
// where third-party storage (window.localStorage / window.sessionStorage)
// throws SecurityError in strict browsers (Safari, Brave, Chrome Incognito, Firefox ETP).

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(String(key)) ? store.get(String(key))! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(String(key));
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  };
}

function ensureSafeBrowserStorage(prop: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") return;
  try {
    const storage = window[prop];
    const probeKey = "__commuaria_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
  } catch {
    const fallback = createMemoryStorage();
    try {
      Object.defineProperty(window, prop, {
        configurable: true,
        enumerable: true,
        get: () => fallback,
      });
    } catch {
      // Ignore if window property cannot be redefined
    }
  }
}

ensureSafeBrowserStorage("localStorage");
ensureSafeBrowserStorage("sessionStorage");
