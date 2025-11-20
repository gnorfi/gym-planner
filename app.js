// ---------------------------
// Bootstrap
// ---------------------------
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

let state = {
  reverseMode: false,
  reverseAnchor: "start",
  cardio: true,
  sauna: false,
  saunaOnly: false,
  versionPanelOpen: false,
  settingsOpen: false
};

let settings = {};
const SETTINGS_KEY = "gymplanner_settings_v2";

const defaultSettings = {
  driveTo: 10,
  driveBack: 10,
  changeBefore: 5,
  changeAfter: 5,
  breakBetween: 5,
  saunaDuration: 15,
  relaxDuration: 10,
  preSaunaShower: 2,
  postSaunaShower: 2,
  showerAfter: 5
};

// ---------------------------
// Helpers
// ---------------------------
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function toInt(v, fb) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fb;
}

function parseTime(str) {
  if (!str || !str.includes(":")) return null;
  const [h, m] = str.split(":").map(x => parseInt(x, 10));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function fmt(mins) {
  mins = (mins % 1440 + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getInt(el, fb = 0) {
  const v = parseInt(el.value, 10);
  return Number.isFinite(v) ? v : fb;
}

// ---------------------------
// Picker Builder
// ---------------------------
function buildPicker(selectEl, min, max, step = 1) {
  selectEl.innerHTML = "";
  for (let v = min; v <= max; v += step) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

function buildAllPickers() {
  buildPicker($("#rev_training"), 5, 300, 5);
  buildPicker($("#sauna_inline"), 5, 25, 1);
  buildPicker($("#relax_inline"), 0, 25, 1);
  buildPicker($("#sauna_count"), 1, 5, 1);

  buildPicker($("#set_driveTo"), 0, 60, 1);
  buildPicker($("#set_driveBack"), 0, 60, 1);
  buildPicker($("#set_changeBefore"), 1, 10, 1);
  buildPicker($("#set_changeAfter"), 1, 10, 1);
  buildPicker($("#set_breakBetween"), 1, 10, 1);
  buildPicker($("#set_saunaDuration"), 5, 25, 1);
  buildPicker($("#set_relaxDuration"), 0, 25, 1);
  buildPicker($("#set_preSauna"), 0, 5, 1);
  buildPicker($("#set_postSauna"), 0, 5, 1);
  buildPicker($("#set_showerAfter"), 0, 10, 1);
}

// ---------------------------
// Settings
// ---------------------------
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    settings = raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch {
    settings = { ...defaultSettings };
  }
  applySettingsToUI();
}

function saveSettings() {
  const s = {
    driveTo: toInt($("#set_driveTo").value, settings.driveTo),
    driveBack: toInt($("#set_driveBack").value, settings.driveBack),
    changeBefore: toInt($("#set_changeBefore").value, settings.changeBefore),
    changeAfter: toInt($("#set_changeAfter").value, settings.changeAfter),
    breakBetween: toInt($("#set_breakBetween").value, settings.breakBetween),
    saunaDuration: toInt($("#set_saunaDuration").value, settings.saunaDuration),
    relaxDuration: toInt($("#set_relaxDuration").value, settings.relaxDuration),
    preSaunaShower: toInt($("#set_preSauna").value, settings.preSaunaShower),
    postSaunaShower: toInt($("#set_postSauna").value, settings.postSaunaShower),
    showerAfter: toInt($("#set_showerAfter").value, settings.showerAfter)
  };

  settings = s;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applySettingsToUI() {
  $("#set_driveTo").value = settings.driveTo;
  $("#set_driveBack").value = settings.driveBack;
  $("#set_changeBefore").value = settings.changeBefore;
  $("#set_changeAfter").value = settings.changeAfter;
  $("#set_breakBetween").value = settings.breakBetween;
  $("#set_saunaDuration").value = settings.saunaDuration;
  $("#set_relaxDuration").value = settings.relaxDuration;
  $("#set_preSauna").value = settings.preSaunaShower;
  $("#set_postSauna").value = settings.postSaunaShower;
  $("#set_showerAfter").value = settings.showerAfter;
}

// ---------------------------
// Reverse UI
// ---------------------------
function syncReverseUI() {
  if (state.reverseMode) {
    $("#rev_block").style.display = "block";
    $("#main_times").style.display = "none";
  } else {
    $("#rev_block").style.display = "none";
    $("#main_times").style.display = "block";
  }
}

// ---------------------------
// Toggles
// ---------------------------
function toggleButton(btn, active) {
  if (active) {
    btn.classList.add("btn-active");
    btn.classList.remove("btn-inactive");
  } else {
    btn.classList.remove("btn-active");
    btn.classList.add("btn-inactive");
  }
}

$("#btn_reverse").addEventListener("click", () => {
  state.reverseMode = !state.reverseMode;
  toggleButton($("#btn_reverse"), state.reverseMode);
  syncReverseUI();
});

$("#btn_cardio").addEventListener("click", () => {
  state.cardio = !state.cardio;
  toggleButton($("#btn_cardio"), state.cardio);
});

$("#btn_sauna").addEventListener("click", () => {
  state.sauna = !state.sauna;
  toggleButton($("#btn_sauna"), state.sauna);
  $("#sauna_inline_wrap").style.display = state.sauna ? "flex" : "none";
});

// ---------------------------
// Settings panel
// ---------------------------
$("#btn_settings").addEventListener("click", () => {
  state.settingsOpen = !state.settingsOpen;
  toggleButton($("#btn_settings"), state.settingsOpen);

  if (state.settingsOpen) {
    $("#settings_panel").style.display = "block";
    setTimeout(() => {
      $("#settings_panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  } else {
    $("#settings_panel").style.display = "none";
  }
});

$("#save_settings").addEventListener("click", () => {
  saveSettings();
  showToast("Einstellungen gespeichert");
});

$("#reset_settings").addEventListener("click", () => {
  settings = { ...defaultSettings };
  applySettingsToUI();
  localStorage.removeItem(SETTINGS_KEY);
  showToast("Standardwerte geladen");
});

// ---------------------------
// Version panel
// ---------------------------
$("#btn_versions").addEventListener("click", () => {
  state.versionPanelOpen = !state.versionPanelOpen;
  toggleButton($("#btn_versions"), state.versionPanelOpen);

  if (state.versionPanelOpen) {
    $("#version_panel").style.display = "block";
    setTimeout(() => {
      $("#version_panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  } else {
    $("#version_panel").style.display = "none";
  }
});

// ---------------------------
// Sauna Data
// ---------------------------
function getSaunaData() {
  if (!state.sauna) return { count: 0, sessions: [] };

  const count = getInt($("#sauna_count"), 1);
  const baseSauna = getInt($("#sauna_dur"), settings.saunaDuration);
  const baseRelax = getInt($("#relax_dur"), settings.relaxDuration);

  if (count <= 1) {
    return {
      count: 1,
      sessions: [{ sauna: baseSauna, relax: baseRelax }]
    };
  }

  const arr = [];
  for (let i = 1; i <= count; i++) {
    arr.push({
      sauna: getInt($(`#s_dur_${i}`), baseSauna),
      relax: getInt($(`#s_rel_${i}`), baseRelax)
    });
  }

  return { count, sessions: arr };
}

// ---------------------------
// Calculate Dispatcher
// ---------------------------
function calculate() {
  if (state.reverseMode) return calculateReverse();
  return calculateForward();
}

// ---------------------------
// Forward Mode
// ---------------------------
function calculateForward() {
  const start = parseTime($("#time_start").value);
  const end = parseTime($("#time_end").value);

  if (start == null || end == null) {
    renderError("Bitte Zeiten im Format HH:MM eingeben.");
    return;
  }

  let total = end - start;
  if (total <= 0) total += 1440;

  const sd = getSaunaData();
  const s = settings;

  const before = s.driveTo + s.changeBefore;
  let after = s.showerAfter + s.changeAfter + s.driveBack;

  if (state.sauna && sd.count > 0) {
    let saunaTotal = s.preSaunaShower;
    sd.sessions.forEach(ss => {
      saunaTotal += ss.sauna + s.postSaunaShower + ss.relax;
    });
    after += saunaTotal;
  }

  const trainingBudget = total - before - after;
  if (trainingBudget <= 0) {
    renderError("Dein Zeitfenster ist zu knapp.");
    return;
  }

  let strength = 0;
  let cardio = 0;
  let pause = 0;

  if (!state.cardio) {
    strength = trainingBudget;
  } else {
    const raw = getInt($("#ratio_slider"), Math.floor(trainingBudget / 2));
    const cardioRaw = trainingBudget - raw;

    if (raw > 0 && cardioRaw > 0) pause = s.breakBetween;

    const usable = trainingBudget - pause;
    const r = raw / trainingBudget;

    strength = Math.round(usable * r);
    cardio = usable - strength;
  }

  state.result = {
    mode: "forward",
    start,
    end,
    strength,
    cardio,
    pause,
    sauna: sd
  };

  renderPlan();
}

// ---------------------------
// Reverse Mode
// ---------------------------
function calculateReverse() {
  const totalTrain = getInt($("#train_total"), 60);
  const sd = getSaunaData();
  const s = settings;

  const before = s.driveTo + s.changeBefore;
  let after = s.showerAfter + s.changeAfter + s.driveBack;

  let saunaBlock = 0;
  if (state.sauna && sd.count > 0) {
    saunaBlock = s.preSaunaShower;
    sd.sessions.forEach(ss => {
      saunaBlock += ss.sauna + s.postSaunaShower + ss.relax;
    });
  }

  let strength = 0;
  let cardio = 0;
  let pause = 0;

  if (!state.saunaOnly) {
    if (!state.cardio) {
      strength = totalTrain;
    } else {
      const raw = getInt($("#ratio_slider"), Math.floor(totalTrain / 2));
      const card = totalTrain - raw;

      if (raw > 0 && card > 0) pause = s.breakBetween;

      const usable = totalTrain - pause;
      const r = raw / totalTrain;

      strength = Math.round(usable * r);
      cardio = usable - strength;
    }
  }

  const planTotal = before + strength + cardio + pause + saunaBlock + after;

  let anchorStart = parseTime($("#time_start").value);
  let anchorEnd = parseTime($("#time_end").value);

  let start, end;

  if (state.reverseAnchor === "end" && anchorEnd != null) {
    end = anchorEnd;
    start = anchorEnd - planTotal;
  } else {
    if (anchorStart == null && anchorEnd != null) {
      end = anchorEnd;
      start = anchorEnd - planTotal;
      state.reverseAnchor = "end";
    } else if (anchorStart == null && anchorEnd == null) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      start = mins + 15;
      end = start + planTotal;
      state.reverseAnchor = "start";
    } else {
      start = anchorStart;
      end = start + planTotal;
      state.reverseAnchor = "start";
    }
  }

  $("#time_start").value = fmt(start);
  $("#time_end").value = fmt(end);

  state.result = {
    mode: "reverse",
    start,
    end,
    strength,
    cardio,
    pause,
    sauna: sd,
    trainTotal: totalTrain
  };

  renderPlan();
}

// ---------------------------
// Error Renderer
// ---------------------------
function renderError(msg) {
  $("#plan_output").innerHTML =
    `<div class="error_box">${msg}</div>`;
  $("#copy_wrap").style.display = "none";
  state.result = null;
}

// ---------------------------
// Render Plan
// ---------------------------
function renderPlan() {
  const r = state.result;
  if (!r) return;

  const s = settings;
  const sd = r.sauna;

  const steps = [];
  let t = r.start;

  function head(lbl) {
    steps.push({ header: true, label: lbl });
  }
  function add(lbl, g) {
    steps.push({ time: fmt(t), label: lbl, group: g || null });
  }
  function inc(min) {
    t += min;
  }

  head("Start");
  add("Abfahrt", "drive"); inc(s.driveTo);
  add("Ankunft im Gym", "drive"); inc(s.changeBefore);

  if (r.strength + r.cardio > 0) {
    head("Training");
    if (r.strength > 0) {
      add("Beginn Kraft", "strength"); inc(r.strength);
      add("Ende Kraft", "strength");
    }
    if (r.pause > 0) {
      inc(r.pause);
      add("Pause zwischen Kraft & Cardio", "pause");
    }
    if (r.cardio > 0) {
      add("Beginn Cardio", "cardio"); inc(r.cardio);
      add("Ende Cardio", "cardio");
    }
  }

  if (state.sauna && sd.count > 0) {
    head("Sauna");
    add("Abduschen vor Sauna", "sauna_pre"); inc(s.preSaunaShower);

    sd.sessions.forEach((session, i) => {
      const n = sd.count === 1 ? "" : ` ${i + 1}`;
      add(`Beginn Saunagang${n}`, `sauna_${i}`); inc(session.sauna);
      add(`Ende Saunagang${n}`, `sauna_${i}`);
      add(`Abduschen nach Saunagang${n}`, `sauna_after_${i}`); inc(s.postSaunaShower);
      add(`Beginn Relax${n}`, `relax_${i}`); inc(session.relax);
      add(`Ende Relax${n}`, `relax_${i}`);
    });
  }

  head("Abschluss");
  add("Duschen nach Training", "finish"); inc(s.showerAfter);
  add("Anziehen", "finish"); inc(s.changeAfter);
  add("Abfahrt nach Hause", "finish"); inc(s.driveBack);
  add("Zuhause", "finish");

  const summary = [];
  summary.push(`<div class="sum"><span>Start:</span><span>${fmt(r.start)}</span></div>`);
  summary.push(`<div class="sum"><span>Ende:</span><span>${fmt(r.end)}</span></div>`);

  if (!state.saunaOnly) {
    const tr = r.strength + r.cardio;
    summary.push(`<div class="sum"><span>Training gesamt:</span><span>${tr} min</span></div>`);
    summary.push(`<div class="sum"><span>Kraft / Cardio:</span><span>${r.strength} / ${r.cardio}</span></div>`);
  }

  if (state.sauna && sd.count > 0) {
    let st = 0;
    sd.sessions.forEach(x => st += x.sauna + x.relax);
    summary.push(`<div class="sum"><span>Sauna gesamt:</span><span>${st} min</span></div>`);
    summary.push(`<div class="sum"><span>Gänge:</span><span>${sd.count}</span></div>`);
  }

  let html = `<div class="output">${summary.join("")}<ul class="timeline">`;

  let pg = null;
  steps.forEach(step => {
    if (step.header) {
      html += `<li class="tl_head">${step.label}</li>`;
    } else {
      const gs = step.group !== pg ? " group_start" : "";
      pg = step.group;
      html += `<li class="tl_item${gs}"><span class="tm">${step.time}</span><span class="lbl">${step.label}</span></li>`;
    }
  });

  html += "</ul></div>";
  $("#plan_output").innerHTML = html;

  const copy = steps
    .map(st => st.header ? `\n# ${st.label}` : `${st.time} ${st.label}`)
    .join("\n")
    .trim();

  state.copyText = copy;
  $("#copy_wrap").style.display = "block";
}

// ---------------------------
// Copy to Clipboard
// ---------------------------
$("#copy_btn").addEventListener("click", async () => {
  if (!state.copyText) return;
  try {
    await navigator.clipboard.writeText(state.copyText);
    showToast("Plan kopiert");
  } catch {
    showToast("Kopieren nicht möglich");
  }
});

// ---------------------------
// Toast
// ---------------------------
let toastTimer = null;
function showToast(msg) {
  const box = $("#toast");
  box.textContent = msg;
  box.classList.add("vis");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    box.classList.remove("vis");
  }, 1800);
}

// ---------------------------
// Sauna UI Builder
// ---------------------------
function updateSaunaUI() {
  const c = getInt($("#sauna_count"), 1);
  const wrap = $("#sauna_sessions");
  wrap.innerHTML = "";

  if (!state.sauna || c <= 1) {
    wrap.style.display = "none";
    return;
  }

  for (let i = 1; i <= c; i++) {
    const row = document.createElement("div");
    row.className = "s_row";
    row.innerHTML =
      `Gang ${i}: ` +
      `<select id="s_dur_${i}" class="s_in"></select>` +
      `<select id="s_rel_${i}" class="s_in"></select>`;
    wrap.appendChild(row);

    buildPicker($(`#s_dur_${i}`), 5, 25, 1);
    buildPicker($(`#s_rel_${i}`), 0, 25, 1);

    $(`#s_dur_${i}`).value = settings.saunaDuration;
    $(`#s_rel_${i}`).value = settings.relaxDuration;

    $(`#s_dur_${i}`).addEventListener("input", calculate);
    $(`#s_rel_${i}`).addEventListener("input", calculate);
  }

  wrap.style.display = "block";
}

// ---------------------------
// Event Bindings
// ---------------------------
$("#reverse_btn").addEventListener("click", () => {
  state.reverseMode = !state.reverseMode;
  calculate();
});

$("#sauna_toggle").addEventListener("click", () => {
  state.sauna = !state.sauna;
  updateSaunaUI();
  calculate();
});

$("#cardio_toggle").addEventListener("click", () => {
  state.cardio = !state.cardio;
  calculate();
});

$("#sauna_only_toggle").addEventListener("click", () => {
  state.saunaOnly = !state.saunaOnly;
  calculate();
});

$("#ratio_slider").addEventListener("input", calculate);
$("#train_total").addEventListener("input", calculate);
$("#time_start").addEventListener("input", () => { state.reverseAnchor = "start"; calculate(); });
$("#time_end").addEventListener("input", () => { state.reverseAnchor = "end"; calculate(); });
$("#sauna_count").addEventListener("input", () => { updateSaunaUI(); calculate(); });

// ---------------------------
// Init
// ---------------------------
function initUI() {
  buildAllPickers();
  loadSettings();

  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  $("#time_start").value = fmt(m + 15);
  $("#time_end").value = fmt(m + 15 + 150);

  updateSaunaUI();
  calculate();
}

initUI();
