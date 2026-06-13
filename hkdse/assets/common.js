export const VALID_LIMITS = [5, 10, 20];
export const VALID_MODES = ["ordered", "random"];
export const STORAGE_SCHEMA_VERSION = 1;

export function normalizeTopic(value) {
  return String(value ?? "").trim();
}

export function normalizeSeed(value, fallback = "hkdse") {
  const seed = String(value ?? "").trim();
  return seed && seed.length <= 80 ? seed : fallback || "hkdse";
}

export function uniqueSorted(values, numeric = false) {
  return [...new Set(values)].sort(
    numeric ? (left, right) => Number(left) - Number(right) : undefined,
  );
}

export function parseUrlState(search, availableYears, availableTopics) {
  const params = new URLSearchParams(search);
  const years = new Set(availableYears.map(String));
  const topics = new Set(availableTopics);
  const rawYear = params.get("year") ?? "";
  const rawTopic = params.get("topic") ?? "";
  const rawLimit = Number(params.get("limit"));
  const rawMode = params.get("mode");
  const rawPage = Number(params.get("page"));
  const rawSeed = params.get("seed");

  return {
    year: years.has(rawYear) ? rawYear : "",
    topic: topics.has(rawTopic) ? rawTopic : "",
    limit: VALID_LIMITS.includes(rawLimit) ? rawLimit : 10,
    mode: VALID_MODES.includes(rawMode) ? rawMode : "ordered",
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    seed: normalizeSeed(rawSeed),
  };
}

export function stateToSearch(state) {
  const params = new URLSearchParams();
  if (state.year) params.set("year", state.year);
  if (state.topic) params.set("topic", state.topic);
  params.set("limit", String(state.limit));
  params.set("mode", state.mode);
  params.set("page", String(state.page));
  if (state.mode === "random") params.set("seed", state.seed);
  return `?${params.toString()}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function stableShuffle(items, seed) {
  const output = [...items];
  const random = seededRandom(seed);
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

export function filterAndPage(items, state) {
  const filtered = items.filter(
    (item) =>
      (!state.year || String(item.year) === state.year) &&
      (!state.topic || normalizeTopic(item.topic) === state.topic),
  );
  const ordered =
    state.mode === "random"
      ? stableShuffle(filtered, state.seed)
      : [...filtered].sort((left, right) => left.id.localeCompare(right.id));
  const pageCount = Math.max(1, Math.ceil(ordered.length / state.limit));
  const page = Math.min(Math.max(1, state.page), pageCount);
  const start = (page - 1) * state.limit;
  return {
    filtered: ordered,
    items: ordered.slice(start, start + state.limit),
    page,
    pageCount,
    total: ordered.length,
    start: ordered.length === 0 ? 0 : start + 1,
    end: Math.min(start + state.limit, ordered.length),
  };
}

export function createSafeStorage(storage) {
  const memory = new Map();
  let available = Boolean(storage);
  if (available) {
    try {
      const probe = "__assessments_hkdse_probe__";
      storage.setItem(probe, "1");
      storage.removeItem(probe);
    } catch {
      available = false;
    }
  }
  return {
    get available() {
      return available;
    },
    getItem(key) {
      if (!available) return memory.get(key) ?? null;
      try {
        return storage.getItem(key);
      } catch {
        available = false;
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      memory.set(key, value);
      if (!available) return;
      try {
        storage.setItem(key, value);
      } catch {
        available = false;
      }
    },
    removeItem(key) {
      memory.delete(key);
      if (!available) return;
      try {
        storage.removeItem(key);
      } catch {
        available = false;
      }
    },
  };
}

export function getBrowserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadSavedState(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.schemaVersion === STORAGE_SCHEMA_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(storage, key, value) {
  storage.setItem(
    key,
    JSON.stringify({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      ...value,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function resolveDataAsset(dataUrl, relativePath) {
  if (!relativePath) return null;
  const resolved = new URL(relativePath, dataUrl);
  const allowedMarker = "/hkdse/images/";
  if (!resolved.pathname.includes(allowedMarker)) {
    throw new Error(`Asset outside HKDSE allowlist: ${resolved.pathname}`);
  }
  return resolved.href;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-cache",
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

export function typesetCurrent(container) {
  if (globalThis.MathJax?.typesetPromise) {
    globalThis.MathJax.typesetPromise([container]).catch(() => {});
  }
}

export function fillSelect(select, values, allLabel) {
  select.replaceChildren(new Option(allLabel, ""));
  for (const value of values) {
    select.add(new Option(String(value), String(value)));
  }
}

export function setControlsFromState(controls, state) {
  controls.year.value = state.year;
  controls.topic.value = state.topic;
  controls.limit.value = String(state.limit);
  controls.mode.value = state.mode;
  controls.seed.value = state.seed;
  controls.seedField.hidden = state.mode !== "random";
}

export function readStateFromControls(controls, previousState) {
  const fallbackSeed = previousState.seed || "hkdse";
  return {
    year: controls.year.value,
    topic: controls.topic.value,
    limit: Number(controls.limit.value),
    mode: controls.mode.value,
    page: 1,
    seed: normalizeSeed(controls.seed.value, fallbackSeed),
  };
}

export function syncUrl(state, replace = false) {
  const method = replace ? "replaceState" : "pushState";
  history[method](null, "", stateToSearch(state));
}

export function renderPagination(container, result, onPage) {
  container.replaceChildren();
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "secondary";
  previous.textContent = "上一頁";
  previous.disabled = result.page <= 1;
  previous.addEventListener("click", () => onPage(result.page - 1));

  const label = document.createElement("span");
  label.setAttribute("aria-current", "page");
  label.textContent = `第 ${result.page} / ${result.pageCount} 頁`;

  const next = document.createElement("button");
  next.type = "button";
  next.className = "secondary";
  next.textContent = "下一頁";
  next.disabled = result.page >= result.pageCount;
  next.addEventListener("click", () => onPage(result.page + 1));

  container.append(previous, label, next);
}
