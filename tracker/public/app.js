(() => {
  "use strict";

  const STORAGE_KEYS = {
    sessions: "nba-tracker-sessions-v2",
    lastSession: "nba-tracker-last-session-v2",
    settings: "nba-tracker-settings-v1"
  };

  const state = {
    sheets: { characters: [], monsters: [] },
    session: null,
    effectTemplates: [],
    _effectEditingFor: null,
    settings: {
      lightTheme: false,
      compactCards: false
    },
    toastTimer: null
  };

  const dom = {};

  function query(id) {
    return document.getElementById(id);
  }

  function init() {
    cacheDom();
    bindGlobalEvents();
    loadSettings();
    applySettings();
    fetchSheets();
    fetchEffectTemplates();
    restoreLastSession();
    handleActionParam();
  }

  async function fetchEffectTemplates() {
    try {
      const res = await fetch('effects.json');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) state.effectTemplates = data;
    } catch (_) { /* ignore */ }
  }

  function cacheDom() {
    Object.assign(dom, {
      menuPlaceholder: query("menu-placeholder"),
      sessionView: query("session-view"),
      sessionNameDisplay: query("session-name-display"),
      sessionBreadcrumb: query("session-breadcrumb"),
      turnNumber: query("turn-number"),
      pendingSortIndicator: query("pending-sort-indicator"),
      allyContainer: query("ally-card-container"),
      enemyContainer: query("enemy-card-container"),
      allyCount: query("ally-count"),
      enemyCount: query("enemy-count"),
      turnOrderBar: query("turn-order-bar"),
      endTurnBtn: query("end-turn-btn"),
      loadSheetBtn: query("load-sheet-btn"),
      openMenuBtn: query("open-menu-btn"),
      menuOverlay: query("menu-overlay"),
      createModal: query("create-session-modal"),
      createForm: query("create-session-form"),
      createNameInput: query("create-session-name"),
      loadModal: query("load-session-modal"),
      savedSessionList: query("saved-session-list"),
      importInput: query("import-session-input"),
      settingsModal: query("settings-modal"),
      sheetPickerModal: query("sheet-picker-modal"),
      sheetSearchInput: query("sheet-search-input"),
      characterSheetList: query("character-sheet-list"),
      monsterSheetList: query("monster-sheet-list"),
      sheetDetailModal: query("sheet-detail-modal"),
      sheetDetailContent: query("sheet-detail-content"),
      toast: query("toast"),
      themeToggle: query("theme-toggle"),
      compactToggle: query("compact-toggle")
    });
  }

  function bindGlobalEvents() {
    document.addEventListener("click", handleDocumentClick);
    dom.openMenuBtn.addEventListener("click", () => openOverlay(dom.menuOverlay));
    dom.createForm.addEventListener("submit", handleCreateSessionSubmit);
    dom.endTurnBtn.addEventListener("click", handleEndTurn);
    dom.loadSheetBtn.addEventListener("click", openSheetPicker);
    dom.sheetSearchInput.addEventListener("input", debounce(renderSheetLists, 150));
    dom.allyContainer.addEventListener("input", handleCardInput);
    dom.enemyContainer.addEventListener("input", handleCardInput);
    dom.allyContainer.addEventListener("click", handleCardClick);
    dom.enemyContainer.addEventListener("click", handleCardClick);
    dom.turnOrderBar.addEventListener("click", handleTurnOrderClick);
    dom.importInput.addEventListener("change", handleImportSession);
    dom.themeToggle.addEventListener("change", handleThemeToggle);
    dom.compactToggle.addEventListener("change", handleCompactToggle);
    document.addEventListener('change', handleGlobalChange);
    document.addEventListener('submit', handleGlobalSubmit);
  }

  function handleDocumentClick(event) {
    const action = event.target.getAttribute("data-menu-action");
    if (action) {
      handleMenuAction(action);
      return;
    }

    if (event.target.matches("[data-close-overlay]")) {
      const overlay = event.target.closest(".overlay");
      if (overlay) closeOverlay(overlay);
    }

    if (event.target === dom.sheetPickerModal && !event.target.closest(".overlay-card")) {
      closeOverlay(dom.sheetPickerModal);
    }
  }

  function handleMenuAction(action) {
    switch (action) {
      case "create":
        closeAllOverlays();
        openOverlay(dom.createModal);
        dom.createNameInput.focus();
        break;
      case "load":
        populateSavedSessions();
        closeAllOverlays();
        openOverlay(dom.loadModal);
        break;
      case "settings":
        syncSettingsToggles();
        closeAllOverlays();
        openOverlay(dom.settingsModal);
        break;
      case "convert":
        triggerConversion();
        break;
      default:
        break;
    }
  }

  function closeAllOverlays() {
    document.querySelectorAll(".overlay").forEach(overlay => overlay.classList.add("hidden"));
  }

  function openOverlay(element) {
    element.classList.remove("hidden");
  }

  function closeOverlay(element) {
    element.classList.add("hidden");
  }

  async function fetchSheets() {
    try {
      const response = await fetch("/api/sheets");
      if (!response.ok) {
        throw new Error(`Failed to fetch sheets (${response.status})`);
      }
      const data = await response.json();
      state.sheets.characters = Array.isArray(data.characters) ? data.characters : [];
      state.sheets.monsters = Array.isArray(data.monsters) ? data.monsters : [];
    } catch (error) {
      console.error(error);
      showToast("Unable to load sheet library. Please verify the server can read the Characters and Monsters folders.");
    }
  }

  function handleCreateSessionSubmit(event) {
    event.preventDefault();
    const name = dom.createNameInput.value.trim();
    if (!name) {
      dom.createNameInput.reportValidity();
      return;
    }
    const sessions = getStoredSessions();
    if (sessions[name]) {
      const overwrite = window.confirm(`A session named "${name}" already exists. Overwrite it?`);
      if (!overwrite) return;
    }

    const session = hydrateSession(createEmptySession(name));
    state.session = session;
    persistSession();
    updateActiveView();
    closeOverlay(dom.createModal);
    showToast(`Session "${name}" created.`);
  }

  function createEmptySession(name) {
    const now = new Date().toISOString();
    return {
      name,
      createdAt: now,
      updatedAt: now,
      turn: 1,
      allies: [],
      enemies: [],
      turnOrder: [],
      pendingSort: false
    };
  }

  function updateActiveView() {
    const hasSession = Boolean(state.session);
    dom.menuPlaceholder.classList.toggle("hidden", hasSession);
    dom.sessionView.classList.toggle("hidden", !hasSession);
    dom.endTurnBtn.disabled = !hasSession;
    dom.loadSheetBtn.disabled = !hasSession;

    if (!hasSession) {
      dom.sessionBreadcrumb.textContent = "No session loaded";
      dom.turnOrderBar.innerHTML = "<p>No participants yet.</p>";
      dom.turnOrderBar.classList.add("empty");
      return;
    }

    dom.sessionBreadcrumb.textContent = `Session: ${state.session.name}`;
    dom.sessionNameDisplay.textContent = state.session.name;
    dom.turnNumber.textContent = String(state.session.turn);

    renderTrackers();
    renderTurnOrderBar();
    updateCounts();
    updatePendingSortIndicator();
  }

  function renderTrackers() {
    renderTrackerColumn(dom.allyContainer, state.session.allies);
    renderTrackerColumn(dom.enemyContainer, state.session.enemies);
  }

  function renderTrackerColumn(container, items) {
    container.innerHTML = "";
    if (!items.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-card";
      placeholder.textContent = "No entries yet.";
      container.appendChild(placeholder);
      return;
    }

    items.forEach(item => {
      container.appendChild(buildTrackerCard(item));
    });
  }

  function buildTrackerCard(entry) {
    const card = document.createElement("article");
    card.className = `tracker-card ${entry.role}`;
    card.dataset.instanceId = entry.instanceId;

    const header = document.createElement("header");
    const title = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = entry.name;
    title.appendChild(name);

    const meta = document.createElement("span");
    const metaParts = [];
    if (entry.tier !== null && entry.tier !== undefined) metaParts.push(`Tier ${entry.tier}`);
    if (entry.race) metaParts.push(entry.race);
    meta.className = "type-tag";
    meta.textContent = metaParts.join(" � ") || entry.category;

    header.appendChild(title);
    header.appendChild(meta);

  // Removed inline Details toggle button; card body click will toggle collapse.

  const statGrid = document.createElement("div");
  statGrid.className = "stat-grid";

    const deltas = computeEffectDeltas(entry);
    statGrid.appendChild(buildStatInput(entry, "hp", withDeltaLabel("HP", deltas.HP)));
    statGrid.appendChild(buildStatInput(entry, "resource", entry.stats.resourceLabel || "MP"));
    statGrid.appendChild(buildEditableNumber(entry, "spd", withDeltaLabel("SPD", deltas.SPD)));
    statGrid.appendChild(buildStatDisplay(withDeltaLabel("MV", deltas.MV), formatNumber(applyDelta(entry.stats.mv, deltas.MV))));
    statGrid.appendChild(buildStatDisplay(withDeltaLabel("AC", deltas.AC), formatNumber(applyDelta(entry.stats.ac, deltas.AC))));
  // Effects section
  const effectsWrap = document.createElement("div");
  effectsWrap.className = "effects-wrap";
  const effectsHeader = document.createElement("div");
  effectsHeader.className = "effects-header";
  const effectsTitle = document.createElement("span");
  effectsTitle.textContent = "Effects";
  const addEffectBtn = document.createElement("button");
  addEffectBtn.type = "button";
  addEffectBtn.className = "ghost";
  addEffectBtn.dataset.action = "add-effect";
  addEffectBtn.textContent = "+";
  effectsHeader.appendChild(effectsTitle);
  effectsHeader.appendChild(addEffectBtn);
  const effectsList = document.createElement("div");
  effectsList.className = "effects-list";
  entry.effects.forEach(effect => effectsList.appendChild(buildEffectBadge(effect)));
  effectsWrap.appendChild(effectsHeader);
  effectsWrap.appendChild(effectsList);

  // Collapsible extended info
  const collapse = document.createElement("div");
  collapse.className = "card-collapse hidden";
  collapse.dataset.section = "extra";
  collapse.appendChild(buildInfoSection(entry));

  const footer = document.createElement("div");
    footer.className = "card-footer";

    const toggle = document.createElement("label");
    toggle.className = "complete-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.action = "toggle-complete";
    checkbox.checked = Boolean(entry.hasActed);
    toggle.appendChild(checkbox);
    const toggleText = document.createElement("span");
    toggleText.textContent = "Turn done";
    toggle.appendChild(toggleText);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "ghost";
    viewBtn.dataset.action = "view-sheet";
    viewBtn.textContent = "Detail";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ghost";
    removeBtn.dataset.action = "remove-entry";
    removeBtn.textContent = "Remove";

    actions.appendChild(viewBtn);
    actions.appendChild(removeBtn);

    footer.appendChild(toggle);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(statGrid);
  card.appendChild(effectsWrap);
  card.appendChild(collapse);
  card.appendChild(footer);

    if (!entry.hasActed) {
      card.classList.remove("complete");
    } else {
      card.classList.add("complete");
    }

    return card;
  }

  function buildInfoSection(entry) {
    const wrap = document.createElement("div");
    wrap.className = "info-grid";
    const core = document.createElement("div");
    core.className = "info-block";
    const coreTitle = document.createElement("h4"); coreTitle.textContent = "Core Attributes"; core.appendChild(coreTitle);
    const coreList = document.createElement("div"); coreList.className = "info-stats";
    const coreDeltas = computeEffectDeltas(entry).core || {};
    Object.entries(entry.core || {}).forEach(([k,v]) => {
      const up = k.toUpperCase();
      const delta = coreDeltas[up] || 0;
      const effective = applyDelta(v, delta);
      const row = document.createElement('span');
      if (delta) {
        const sign = delta > 0 ? '+' : '';
        row.innerHTML = `${k}: <strong class="${delta>0?'delta-pos':'delta-neg'}">${effective}</strong> <small class="delta">(base ${v} ${sign}${delta})</small>`;
      } else {
        row.textContent = `${k}: ${v ?? '-'}`;
      }
      coreList.appendChild(row);
    });
    core.appendChild(coreList);
    const info = document.createElement("div"); info.className = "info-block";
    const infoTitle = document.createElement("h4"); infoTitle.textContent = "Character Info"; info.appendChild(infoTitle);
    const infoBody = document.createElement("div"); infoBody.className = "info-stats";
    infoBody.innerHTML = [
      entry.race ? `<span>Race: ${entry.race}</span>`: "",
      entry.tier != null ? `<span>Tier: ${entry.tier}</span>`: ""
    ].filter(Boolean).join("");
    info.appendChild(infoBody);
    // Effective stats block (includes effect deltas)
    const eff = document.createElement('div');
    eff.className = 'info-block';
    const effTitle = document.createElement('h4'); effTitle.textContent = 'Effective Stats'; eff.appendChild(effTitle);
    const effBody = document.createElement('div'); effBody.className = 'info-stats';
    const d = computeEffectDeltas(entry);
    const rows = [
      ['HP', entry.stats.hp, d.HP],
      [entry.stats.resourceLabel || 'MP', entry.stats.resource, d.MP],
      ['SPD', entry.stats.spd, d.SPD],
      ['MV', entry.stats.mv, d.MV],
      ['AC', entry.stats.ac, d.AC]
    ];
    effBody.innerHTML = rows.map(([label, base, delta]) => {
      const effective = applyDelta(base, delta);
      if (delta) {
        const sign = delta > 0 ? '+' : '';
        return `<span>${label}: ${effective} <small class="delta">(base ${base} ${sign}${delta})</small></span>`;
      }
      return `<span>${label}: ${effective}</span>`;
    }).join('');
    eff.appendChild(effBody);

    wrap.appendChild(core);
    wrap.appendChild(info);
    wrap.appendChild(eff);
    return wrap;
  }

  function buildEffectBadge(effect) {
    const badge = document.createElement('span');
    badge.className = 'effect-badge';
    badge.dataset.effectId = effect.id;
    const text = document.createElement('span');
    let targetText = '';
    if (Array.isArray(effect.targets)) {
      targetText = effect.targets.map(t => `${t.stat}${t.delta>=0?'+':''}${t.delta}`).join(',');
    } else if (effect.stat) {
      targetText = `${effect.stat}${effect.delta>=0?'+':''}${effect.delta}`;
    }
    text.textContent = `${effect.label}${targetText ? ' ('+targetText+')' : ''}`;
    const turnsBtn = document.createElement('button');
    turnsBtn.type = 'button'; turnsBtn.className = 'ghost'; turnsBtn.dataset.action = 'edit-effect-turns'; turnsBtn.dataset.effectId = effect.id; turnsBtn.textContent = `${effect.turns}t`;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'ghost'; remove.dataset.action = 'remove-effect'; remove.dataset.effectId = effect.id; remove.textContent = 'x';
    badge.appendChild(text);
    badge.appendChild(turnsBtn);
    badge.appendChild(remove);
    return badge;
  }

  function buildStatInput(entry, field, label) {
    const wrapper = document.createElement("div");
    wrapper.className = "stat-group";
    const title = document.createElement("label");
    title.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.dataset.action = "update-stat";
    input.dataset.field = field;
    if (field === "hp") {
      input.value = Number.isFinite(entry.stats.hp) ? entry.stats.hp : 0;
    } else {
      input.value = Number.isFinite(entry.stats.resource) ? entry.stats.resource : 0;
    }
    wrapper.appendChild(title);
    wrapper.appendChild(input);
    return wrapper;
  }

  function buildEditableNumber(entry, field, label) {
    const wrapper = document.createElement("div");
    wrapper.className = "stat-group";
    const title = document.createElement("label");
    title.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    input.dataset.action = "update-dynamic";
    input.dataset.field = field;
    input.value = Number.isFinite(entry.stats[field]) ? entry.stats[field] : 0;
    wrapper.appendChild(title);
    wrapper.appendChild(input);
    return wrapper;
  }

  function buildStatDisplay(label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "stat-group";
    const title = document.createElement("label");
    title.textContent = label;
    const span = document.createElement("span");
    span.textContent = value;
    if (/Δ/.test(label)) span.classList.add("delta-applied");
    wrapper.appendChild(title);
    wrapper.appendChild(span);
    return wrapper;
  }

  function withDeltaLabel(base, delta) {
    if (!delta || delta === 0) return base;
    const sign = delta > 0 ? "+" : "";
    return `${base} (Δ${sign}${delta})`;
  }

  function applyDelta(value, delta) {
    if (!delta) return value;
    const base = Number(value) || 0;
    return base + delta;
  }

  function computeEffectDeltas(entry) {
    const result = { HP: 0, MP: 0, SPD: 0, MV: 0, AC: 0, core: {} };
    (entry.effects || []).forEach(effect => {
      if (Array.isArray(effect.targets)) {
        effect.targets.forEach(t => applyTarget(t));
      } else if (effect.stat) { // legacy structure
        applyTarget({ stat: effect.stat, delta: effect.delta });
      }
    });
    function applyTarget(t) {
      if (!t || !t.stat || !Number.isFinite(t.delta)) return;
      const key = t.stat.toUpperCase();
      switch (key) {
        case 'HP': result.HP += t.delta; break;
        case 'MP': case 'RESOURCE': result.MP += t.delta; break;
        case 'SPD': result.SPD += t.delta; break;
        case 'AC': result.AC += t.delta; break;
        default: result.core[key] = (result.core[key] || 0) + t.delta; break;
      }
    }
    if (result.SPD) {
      const newMv = computeMovement(applyDelta(entry.stats.spd, result.SPD));
      result.MV = Number(newMv.toFixed(2)) - entry.stats.mv;
    }
    Object.keys(result).forEach(k => { if (k !== 'core' && !result[k]) result[k] = 0; });
    return result;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  function handleCardInput(event) {
    const target = event.target;
  if (!target.matches("[data-action='update-stat'],[data-action='update-dynamic']")) return;
    const card = target.closest(".tracker-card");
    if (!card) return;
    const entry = findEntry(card.dataset.instanceId);
    if (!entry) return;

    const field = target.dataset.field;
    const value = Number(target.value);
    if (!Number.isFinite(value) || value < 0) {
      target.value = field === "hp" ? entry.stats.hp : entry.stats.resource;
      return;
    }

    if (target.dataset.action === 'update-stat') {
      if (field === "hp") {
        entry.stats.hp = value;
      } else {
        entry.stats.resource = value;
      }
      entry.updatedAt = new Date().toISOString();
      persistSession();
    } else if (target.dataset.action === 'update-dynamic') {
      if (field === 'spd') {
        entry.stats.spd = value;
        entry.stats.mv = computeMovement(value);
        // Flag pending sort; only recompute immediately on first turn for initial order clarity
        state.session.pendingSort = true;
        if (state.session.turn === 1) {
          recomputeTurnOrder(true);
        }
        updatePendingSortIndicator();
      }
      entry.updatedAt = new Date().toISOString();
      persistSession();
    }
  }

  function handleCardClick(event) {
    const target = event.target;
    const card = target.closest(".tracker-card");
    if (!card) return;
    const entry = findEntry(card.dataset.instanceId);
    if (!entry) return;

    if (target.matches("[data-action='toggle-complete']")) {
      entry.hasActed = target.checked;
      card.classList.toggle("complete", entry.hasActed);
      persistSession();
      return;
    }

    if (target.matches("[data-action='view-sheet']")) {
      openSheetDetail(entry);
      return;
    }

    // Clicking on card unused areas toggles collapse (not on buttons or inputs)
    if (!target.closest('.card-actions') && !target.closest('.stat-group') && !target.closest('.complete-toggle') && target.closest('.tracker-card')) {
      if (!target.matches('[data-action]') && !target.closest('button')) {
        const collapse = card.querySelector('.card-collapse');
        if (collapse) collapse.classList.toggle('hidden');
      }
    }

    if (target.matches("[data-action='add-effect']")) { openEffectEditor(entry.instanceId); return; }

    if (target.matches("[data-action='remove-effect']")) {
      const id = target.dataset.effectId;
      entry.effects = entry.effects.filter(e => e.id !== id);
      persistSession();
      updateActiveView();
      return;
    }

    if (target.matches("[data-action='edit-effect-turns']")) {
      const effectId = target.dataset.effectId;
      const effect = entry.effects.find(e => e.id === effectId);
      if (!effect) return;
      const raw = window.prompt("New turns remaining", effect.turns);
      if (raw === null) return;
      const val = parseInt(raw, 10);
      if (Number.isFinite(val) && val > 0) {
        effect.turns = val;
        persistSession();
        updateActiveView();
      }
      return;
    }

    if (target.matches("[data-action='remove-entry']")) {
      removeEntry(entry.instanceId);
      return;
    }

    // Removed automatic sheet detail opening on generic card click.
    return;
  }

  function handleTurnOrderClick(event) {
    const card = event.target.closest(".turn-order-card");
    if (!card) return;
    const entry = findEntry(card.dataset.instanceId);
    if (entry) {
      openSheetDetail(entry);
    }
  }

  function handleEndTurn() {
    if (!state.session) return;
    const participants = getAllParticipants();
    if (!participants.length) {
      showToast("Add allies or enemies before ending a turn.");
      return;
    }

    const pending = participants.filter(entity => !entity.hasActed);
    if (pending.length) {
      pending.forEach(entity => highlightEntry(entity.instanceId));
      showToast("All cards must be marked as done before ending the turn.");
      return;
    }

    state.session.turn += 1;
    participants.forEach(entity => {
      entity.hasActed = false;
      // Apply HP/MP deltas before decrementing effect durations
      const deltas = computeEffectDeltas(entity);
      if (deltas.HP) {
        entity.stats.hp = Math.max(0, entity.stats.hp + deltas.HP);
      }
      if (deltas.MP) {
        entity.stats.resource = Math.max(0, entity.stats.resource + deltas.MP);
      }
      entity.effects = entity.effects.filter(effect => {
        effect.turns -= 1;
        return effect.turns > 0;
      });
    });

    // Recompute at the end of each turn, applying any SPD changes made during the turn.
    recomputeTurnOrder(true);
    persistSession();
    updateActiveView();
    showToast(`Turn advanced to ${state.session.turn}.`);
  }

  function recomputeTurnOrder(force = false) {
    if (!state.session) return;
    if (!force && !state.session.pendingSort) return;

    const ordered = getAllParticipants().slice().sort((a, b) => {
      const spdDiff = (b.stats.spd ?? 0) - (a.stats.spd ?? 0);
      if (spdDiff !== 0) return spdDiff;
      const dexDiff = (b.core?.DEX ?? 0) - (a.core?.DEX ?? 0);
      if (dexDiff !== 0) return dexDiff;
      return a.name.localeCompare(b.name);
    });

    state.session.turnOrder = ordered.map(entity => entity.instanceId);
    state.session.pendingSort = false;
  }

  function handleActionParam() {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (!action) return;
      if (action === 'create') {
        openOverlay(dom.createModal);
        dom.createNameInput?.focus();
      } else if (action === 'load') {
        populateSavedSessions();
        openOverlay(dom.loadModal);
      }
    } catch (_) { /* ignore */ }
  }

  function renderTurnOrderBar() {
    if (!state.session) return;
    const container = dom.turnOrderBar;
    container.innerHTML = "";
    const order = state.session.turnOrder.length ? state.session.turnOrder : getAllParticipants().map(entity => entity.instanceId);
    if (!order.length) {
      container.classList.add("empty");
      container.innerHTML = "<p>No participants yet.</p>";
      return;
    }

    container.classList.remove("empty");
    order.forEach((id, index) => {
      const entity = findEntry(id);
      if (!entity) return;
      const card = document.createElement("article");
      card.className = `turn-order-card ${entity.role}`;
      card.dataset.instanceId = entity.instanceId;

      const name = document.createElement("div");
      name.className = "order-name";
      name.textContent = entity.name;

      const meta = document.createElement("div");
      meta.className = "order-meta";
      meta.textContent = `SPD ${formatNumber(entity.stats.spd)} � MV ${formatNumber(entity.stats.mv)}`;

      const indicator = document.createElement("div");
      indicator.className = "order-meta";
      indicator.textContent = `${capitalize(entity.role)} � ${entity.hasActed ? "Done" : "Waiting"}`;

      card.appendChild(name);
      card.appendChild(meta);
      card.appendChild(indicator);

      if (!entity.hasActed && index === 0) {
        card.classList.add("active");
      }

      container.appendChild(card);
    });
  }

  function updateCounts() {
    dom.allyCount.textContent = String(state.session.allies.length);
    dom.enemyCount.textContent = String(state.session.enemies.length);
  }

  function updatePendingSortIndicator() {
    if (!state.session) return;
    dom.pendingSortIndicator.classList.toggle("hidden", !state.session.pendingSort);
  }

  function openSheetPicker() {
    if (!state.session) {
      showToast("Create or load a session first.");
      return;
    }
    dom.sheetSearchInput.value = "";
    renderSheetLists();
    closeAllOverlays();
    openOverlay(dom.sheetPickerModal);
  }

  function renderSheetLists() {
    const query = dom.sheetSearchInput.value.trim().toLowerCase();
    renderSheetList(dom.characterSheetList, state.sheets.characters, query);
    renderSheetList(dom.monsterSheetList, state.sheets.monsters, query);
  }

  function renderSheetList(container, sheets, query) {
    container.innerHTML = "";
    if (!sheets.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "menu-note";
      placeholder.textContent = "No sheets detected.";
      container.appendChild(placeholder);
      return;
    }

    const filtered = sheets.filter(sheet => {
      if (!query) return true;
      const haystack = [sheet.name, sheet.race, sheet.rawContent].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    if (!filtered.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "menu-note";
      placeholder.textContent = "No matches.";
      container.appendChild(placeholder);
      return;
    }

    filtered.forEach(sheet => {
      container.appendChild(buildSheetEntry(sheet));
    });
  }

  function buildSheetEntry(sheet) {
    const entry = document.createElement("article");
    entry.className = "sheet-entry";
    entry.dataset.sheetId = sheet.id;
    entry.dataset.category = sheet.category ?? inferCategory(sheet.sourcePath);

    const header = document.createElement("header");
    const title = document.createElement("h4");
    title.textContent = sheet.name || sheet.id;
    const tier = sheet.tier !== null && sheet.tier !== undefined ? `Tier ${sheet.tier}` : "";
    const race = sheet.race || "";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = [tier, race].filter(Boolean).join(" � ");
    header.appendChild(title);
    header.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const addAlly = document.createElement("button");
    addAlly.type = "button";
    addAlly.className = "secondary";
    addAlly.dataset.action = "add-sheet";
    addAlly.dataset.role = "ally";
    addAlly.textContent = "Add as Ally";

    const addEnemy = document.createElement("button");
    addEnemy.type = "button";
    addEnemy.className = "ghost";
    addEnemy.dataset.action = "add-sheet";
    addEnemy.dataset.role = "enemy";
    addEnemy.textContent = "Add as Enemy";

    actions.appendChild(addAlly);
    actions.appendChild(addEnemy);

    entry.appendChild(header);
    entry.appendChild(actions);

    entry.addEventListener("click", event => {
      const role = event.target.getAttribute("data-role");
      if (!role) return;
      addSheetToSession(sheet, role);
    });

    return entry;
  }

  function inferCategory(sourcePath) {
    if (!sourcePath) return "character";
    return sourcePath.toLowerCase().includes("monsters") ? "monster" : "character";
  }

  function addSheetToSession(sheet, role) {
    if (!state.session) {
      showToast("Create or load a session first.");
      return;
    }

    const entity = instantiateEntry(sheet, role);
    if (role === "ally") {
      state.session.allies.push(entity);
    } else {
      state.session.enemies.push(entity);
    }

    state.session.turnOrder.push(entity.instanceId);
    state.session.pendingSort = true;
    state.session.updatedAt = new Date().toISOString();
    persistSession();
    updateActiveView();
    updatePendingSortIndicator();
    showToast(`${entity.name} added as ${role}.`);
  }

  function instantiateEntry(sheet, role) {
    const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    const instanceId = `${sheet.id}-${randomId}`;
    const hpDefault = firstFinite(sheet.combat?.hp?.max, sheet.combat?.hp?.current, 0);
    const resourceDefault = firstFinite(sheet.combat?.resource?.max, sheet.combat?.resource?.current, 0);
    return {
      instanceId,
      sheetId: sheet.id,
      category: sheet.category ?? inferCategory(sheet.sourcePath),
      role,
      name: sheet.name || sheet.id,
      race: sheet.race || "",
      tier: sheet.tier ?? null,
      core: sheet.core || {},
      combat: sheet.combat || {},
      stats: {
        hp: hpDefault,
        resource: resourceDefault,
        resourceLabel: sheet.combat?.resource?.label || "MP",
        spd: firstFinite(sheet.combat?.spd, 0),
        mv: computeMovement(firstFinite(sheet.combat?.spd, 0)),
        ac: firstFinite(sheet.combat?.ac, 0)
      },
      hasActed: false,
      effects: [], // { id, label, stat, delta, turns }
      rawContent: sheet.rawContent || "",
      sourcePath: sheet.sourcePath || "",
      addedAt: new Date().toISOString()
    };
  }

  function computeMovement(speed) {
    const spd = Number(speed) || 0;
    return Math.round((spd / 3) * 100) / 100;
  }

  function firstFinite(...values) {
    for (const value of values) {
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function removeEntry(instanceId) {
    if (!state.session) return;
    const prevCount = state.session.allies.length + state.session.enemies.length;
    state.session.allies = state.session.allies.filter(entry => entry.instanceId !== instanceId);
    state.session.enemies = state.session.enemies.filter(entry => entry.instanceId !== instanceId);
    state.session.turnOrder = state.session.turnOrder.filter(id => id !== instanceId);
    state.session.updatedAt = new Date().toISOString();
    if (prevCount !== state.session.allies.length + state.session.enemies.length) {
      persistSession();
      updateActiveView();
      showToast("Entry removed.");
    }
  }

  function highlightEntry(instanceId) {
    const card = document.querySelector(`.tracker-card[data-instance-id='${instanceId}']`);
    if (!card) return;
    card.classList.add("needs-attention");
    setTimeout(() => card.classList.remove("needs-attention"), 1000);
  }

  function findEntry(instanceId) {
    if (!state.session) return null;
    return state.session.allies.concat(state.session.enemies).find(entry => entry.instanceId === instanceId) || null;
  }

  function getAllParticipants() {
    if (!state.session) return [];
    return state.session.allies.concat(state.session.enemies);
  }

  function openSheetDetail(entry) {
    dom.sheetDetailContent.innerHTML = renderMarkdown(entry.rawContent || "");
    dom.sheetDetailModal.querySelector("#sheet-detail-title").textContent = entry.name;
    closeAllOverlays();
    openOverlay(dom.sheetDetailModal);
  }

  function getStoredSessions() {
    try {
      const payload = window.localStorage.getItem(STORAGE_KEYS.sessions);
      if (!payload) return {};
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.error("Failed to read sessions", error);
      return {};
    }
  }

  function saveSessionsMap(map) {
    window.localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(map));
  }

  // Persist the current session to localStorage. Accepts options:
  // { skipTimestamp: true } to avoid mutating updatedAt when simply restoring.
  function persistSession(options = {}) {
    if (!state.session) return;
    const { skipTimestamp = false } = options;
    const sessions = getStoredSessions();
    if (!skipTimestamp) {
      state.session.updatedAt = new Date().toISOString();
    }
    sessions[state.session.name] = state.session;
    saveSessionsMap(sessions);
    window.localStorage.setItem(STORAGE_KEYS.lastSession, state.session.name);
  }

  function populateSavedSessions() {
    const sessions = getStoredSessions();
    dom.savedSessionList.innerHTML = "";
    const names = Object.keys(sessions).sort((a, b) => b.localeCompare(a));
    if (!names.length) {
      const info = document.createElement("p");
      info.className = "menu-note";
      info.textContent = "No saved sessions yet.";
      dom.savedSessionList.appendChild(info);
      return;
    }

    names.forEach(name => {
      const session = sessions[name];
      dom.savedSessionList.appendChild(buildSavedSessionCard(session));
    });

    // Fetch server-side list (non-blocking augmentation)
    fetch('/api/sessions')
      .then(r => r.ok ? r.json() : null)
      .then(payload => {
        if (!payload || !Array.isArray(payload.sessions)) return;
        // Show server sessions not already in localStorage
        payload.sessions.forEach(s => {
          if (!sessions[s.name]) {
            const ghost = {
              name: s.name,
              updatedAt: s.updatedAt,
              turn: s.turn,
              allies: new Array(s.allies).fill(0),
              enemies: new Array(s.enemies).fill(0)
            };
            dom.savedSessionList.appendChild(buildSavedSessionCard(ghost));
          }
        });
      }).catch(() => {});
  }

  function buildSavedSessionCard(session) {
    const card = document.createElement("div");
    card.className = "saved-session-card";

    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = session.name;
    const meta = document.createElement("span");
    meta.className = "saved-session-meta";
    meta.textContent = `Updated ${formatDate(session.updatedAt)}`;
    header.appendChild(title);
    header.appendChild(meta);

    const allyCount = Array.isArray(session.allies) ? session.allies.length : 0;
    const enemyCount = Array.isArray(session.enemies) ? session.enemies.length : 0;
    const turnLabel = Number.isFinite(session.turn) ? session.turn : 1;
    const stats = document.createElement("div");
    stats.className = "saved-session-meta";
    stats.textContent = `${allyCount} allies � ${enemyCount} enemies � Turn ${turnLabel}`;

    const actions = document.createElement("div");
    actions.className = "saved-session-actions";

    const loadBtn = document.createElement("button");
    loadBtn.className = "primary";
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", () => {
      state.session = hydrateSession(deepClone(session));
      persistSession({ skipTimestamp: true });
      updateActiveView();
      closeOverlay(dom.loadModal);
      showToast(`Session "${session.name}" loaded.`);
    });

    const exportBtn = document.createElement("button");
    exportBtn.className = "secondary";
    exportBtn.textContent = "Export";
    exportBtn.addEventListener("click", () => exportSession(hydrateSession(deepClone(session))));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      const confirmed = window.confirm(`Delete session "${session.name}"? This cannot be undone.`);
      if (!confirmed) return;
      const map = getStoredSessions();
      delete map[session.name];
      saveSessionsMap(map);
      populateSavedSessions();
      if (state.session && state.session.name === session.name) {
        state.session = null;
        window.localStorage.removeItem(STORAGE_KEYS.lastSession);
        updateActiveView();
      }
      showToast("Session deleted.");
    });

    actions.appendChild(loadBtn);
    actions.appendChild(exportBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(stats);
    card.appendChild(actions);
    return card;
  }

  function exportSession(session) {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${session.name.replace(/[^a-z0-9-_]+/gi, "_") || "session"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImportSession(event) {
    const [file] = event.target.files || [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const session = JSON.parse(target.result);
        if (!session || !session.name) throw new Error("Invalid session file");
        const map = getStoredSessions();
        map[session.name] = session;
        saveSessionsMap(map);
        populateSavedSessions();
        showToast(`Session "${session.name}" imported.`);
      } catch (error) {
        console.error(error);
        showToast("Unable to import session file. Please check the format.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function restoreLastSession() {
    const lastName = window.localStorage.getItem(STORAGE_KEYS.lastSession);
    if (!lastName) return;
    const sessions = getStoredSessions();
    if (!sessions[lastName]) return;
  state.session = hydrateSession(deepClone(sessions[lastName]));
  // Do not touch updatedAt when just restoring automatically.
  persistSession({ skipTimestamp: true });
  updateActiveView();
  }

  function triggerConversion() {
    const mode = window.prompt("Convert mode: type 'all' for all sheets or enter comma separated IDs (e.g. ashtear,cermia). Cancel to abort.");
    if (mode === null) return; // cancelled
    let body = {};
    if (mode && mode.trim().toLowerCase() !== 'all') {
      const ids = mode.split(',').map(s => s.trim()).filter(Boolean);
      if (!ids.length) {
        showToast('No valid IDs provided.');
        return;
      }
      body.ids = ids;
    }
    fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(r => { if (!r.ok) throw new Error('Conversion failed'); return r.json(); })
      .then(payload => {
        if (!payload || !Array.isArray(payload.records)) throw new Error('Bad payload');
        downloadBlob(JSON.stringify(payload.records, null, 2), body.ids ? 'selected-sheets.json' : 'all-sheets.json', 'application/json');
        if (payload.summaryCsv) {
          downloadBlob(payload.summaryCsv, body.ids ? 'selected-summary.csv' : 'all-summary.csv', 'text/csv');
        }
        showToast(`Converted ${payload.count || payload.records.length} sheet(s).`);
      })
      .catch(err => {
        console.error(err);
        showToast('Unable to convert sheets on the server.');
      });
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      dom.toast.classList.add("hidden");
    }, 2600);
  }

  function formatDate(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function hydrateSession(session) {
    if (!session || typeof session !== "object") return createEmptySession("Unnamed Session");

    session.turn = Number.isFinite(session.turn) && session.turn > 0 ? session.turn : 1;
    session.pendingSort = Boolean(session.pendingSort);
    session.createdAt = session.createdAt || new Date().toISOString();
    session.updatedAt = session.updatedAt || session.createdAt;

    session.allies = Array.isArray(session.allies)
      ? session.allies.map(hydrateEntry)
      : [];
    session.enemies = Array.isArray(session.enemies)
      ? session.enemies.map(hydrateEntry)
      : [];

    const validIds = new Set(session.allies.concat(session.enemies).map(entry => entry.instanceId));
    session.turnOrder = Array.isArray(session.turnOrder)
      ? session.turnOrder.filter(id => validIds.has(id))
      : [];

    if (!session.turnOrder.length) {
      session.turnOrder = Array.from(validIds);
    }

    return session;
  }

  function hydrateEntry(entry) {
    const source = entry || {};
    const baseId = source.sheetId || "entry";
    const fallbackId = `${baseId}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

    const clone = {
      ...source,
      instanceId: source.instanceId || fallbackId,
      role: source.role === "enemy" ? "enemy" : "ally",
      category: source.category || inferCategory(source.sourcePath),
      name: source.name || baseId,
      core: source.core || {},
      combat: source.combat || {},
      rawContent: source.rawContent || "",
      addedAt: source.addedAt || new Date().toISOString()
    };

    const hp = firstFinite(
      source.stats?.hp,
      clone.combat?.hp?.current,
      clone.combat?.hp?.max,
      0
    );
    const resource = firstFinite(
      source.stats?.resource,
      clone.combat?.resource?.current,
      clone.combat?.resource?.max,
      0
    );
    const spd = firstFinite(source.stats?.spd, clone.combat?.spd, 0);
    const ac = firstFinite(source.stats?.ac, clone.combat?.ac, 0);
    const mv = Number.isFinite(source.stats?.mv) ? source.stats.mv : computeMovement(spd);

    clone.stats = {
      hp,
      resource,
      resourceLabel: source.stats?.resourceLabel || clone.combat?.resource?.label || "MP",
      spd,
      mv,
      ac
    };

    clone.hasActed = Boolean(source.hasActed);
    clone.effects = Array.isArray(source.effects) ? source.effects.filter(e => e && e.label).map(e => {
      if (e && !e.targets && e.stat) {
        return {
          id: e.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)),
          label: e.label,
          targets: [{ stat: e.stat, delta: Number.isFinite(e.delta) ? e.delta : 0 }],
          turns: Number.isFinite(e.turns) ? e.turns : 1
        };
      }
      return e;
    }) : [];
    return clone;
  }

  function loadSettings() {
    try {
      const payload = window.localStorage.getItem(STORAGE_KEYS.settings);
      if (!payload) return;
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === "object") {
        state.settings.lightTheme = Boolean(parsed.lightTheme);
        state.settings.compactCards = Boolean(parsed.compactCards);
      }
    } catch (error) {
      console.error("Unable to load settings", error);
    }
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  }

  function applySettings() {
    document.body.classList.toggle("light-theme", state.settings.lightTheme);
    document.body.classList.toggle("compact", state.settings.compactCards);
  }

  function syncSettingsToggles() {
    dom.themeToggle.checked = state.settings.lightTheme;
    dom.compactToggle.checked = state.settings.compactCards;
  }

  function handleThemeToggle(event) {
    state.settings.lightTheme = event.target.checked;
    applySettings();
    saveSettings();
  }

  function handleCompactToggle(event) {
    state.settings.compactCards = event.target.checked;
    applySettings();
    saveSettings();
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function deepClone(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (error) {
        console.warn("structuredClone failed, falling back to JSON clone", error);
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function openEffectEditor(instanceId) {
    const entry = findEntry(instanceId); if (!entry) return;
    state._effectEditingFor = instanceId;
    populateEffectTemplateSelect();
    const form = document.getElementById('effect-editor-form');
    if (form) form.reset();
    const nameInput = document.getElementById('effect-name-input');
    const turnsInput = document.getElementById('effect-turns-input');
    const targetsInput = document.getElementById('effect-targets-input');
    if (nameInput) nameInput.value = '';
    if (turnsInput) turnsInput.value = '2';
    if (targetsInput) targetsInput.value = '';
    closeAllOverlays();
    const modal = document.getElementById('effect-editor-modal');
    if (modal) openOverlay(modal);
  }

  function populateEffectTemplateSelect() {
    const sel = document.getElementById('effect-template-select');
    if (!sel) return;
    sel.innerHTML = '<option value="__custom">Custom...</option>' + state.effectTemplates.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
  }

  function handleGlobalChange(e) {
    if (e.target && e.target.id === 'effect-template-select') {
      const val = e.target.value;
      if (val === '__custom') return;
      const tpl = state.effectTemplates.find(t => t.id === val);
      if (!tpl) return;
      const nameInput = document.getElementById('effect-name-input');
      const turnsInput = document.getElementById('effect-turns-input');
      const targetsInput = document.getElementById('effect-targets-input');
      if (nameInput) nameInput.value = tpl.label;
      if (turnsInput) turnsInput.value = tpl.turns || 1;
      if (targetsInput) targetsInput.value = (tpl.targets || []).map(t => `${t.stat}:${t.delta>=0?'+':''}${t.delta}`).join('\n');
    }
  }

  function handleGlobalSubmit(e) {
    if (e.target && e.target.id === 'effect-editor-form') {
      e.preventDefault();
      const entry = findEntry(state._effectEditingFor);
      if (!entry) return;
      const name = document.getElementById('effect-name-input')?.value.trim();
      const turns = parseInt(document.getElementById('effect-turns-input')?.value, 10) || 1;
      const rawTargets = (document.getElementById('effect-targets-input')?.value || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
      const targets = rawTargets.map(line => {
        const idx = line.indexOf(':');
        if (idx === -1) return null;
        const stat = line.slice(0, idx).trim().toUpperCase();
        const deltaRaw = line.slice(idx + 1).trim();
        const delta = Number(deltaRaw);
        if (!stat || !Number.isFinite(delta)) return null;
        return { stat, delta };
      }).filter(Boolean);
      if (!name || !targets.length) { showToast('Name and at least one valid target required.'); return; }
      entry.effects.push({ id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2), label: name, targets, turns: Math.max(1, turns) });
      persistSession();
      updateActiveView();
      const modal = document.getElementById('effect-editor-modal');
      if (modal) closeOverlay(modal);
    }
  }

  function renderMarkdown(raw) {
    if (!raw) return '<em>No content</em>';
    const esc = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = esc
      .replace(/!\[\[([^\]]+)\]\]/g, (m, p1) => `<img src="${resolveImage(p1)}" alt="${p1}" class="sheet-img" />`)
      .replace(/\[\[([^\]|]+\.(?:png|jpg|jpeg|gif))\]\]/gi, (m,p1) => `<img src="${resolveImage(p1)}" alt="${p1}" class="sheet-img" />`);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^###\s+(.+)$/gm,'<h3>$1</h3>')
               .replace(/^##\s+(.+)$/gm,'<h2>$1</h2>')
               .replace(/^#\s+(.+)$/gm,'<h1>$1</h1>');
    html = html.replace(/^(?:- \s*.*(?:\n|$))+?/gm, block => '<ul>' + block.trim().split(/\n/).map(l=>l.replace(/^-\s*/,'')).map(li=>`<li>${li}</li>`).join('') + '</ul>');
    html = html.split(/\n{2,}/).map(p=> p.match(/^<h[1-3]|^<ul|<img|<p|<blockquote|<table|^<code/) ? p : `<p>${p.replace(/\n/g,'<br>')}</p>`).join('\n');
    return html;
  }

  function resolveImage(rel) {
    return rel.replace(/^\.\//,'');
  }

  document.addEventListener("DOMContentLoaded", init);
})();