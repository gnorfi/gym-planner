//-------------------------------------------------------
// Hilfsfunktionen
//-------------------------------------------------------
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function fmt(mins) {
    mins = (mins % 1440 + 1440) % 1440;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTime(t) {
    if (!t || !t.includes(":")) return null;
    const [h, m] = t.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
}

function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("vis");
    setTimeout(() => t.classList.remove("vis"), 1500);
}

//-------------------------------------------------------
// Globaler State
//-------------------------------------------------------
const state = {
    reverseMode: false,
    cardio: true,
    sauna: false,
    saunaOnly: false,
    result: null,
    activePicker: null,
    activeSetter: null,
    pickerMin: 0,
    pickerMax: 0,
    pickerStep: 1
};

const SETTINGS_KEY = "gymplanner_settings_v3";

let settings = {
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

//-------------------------------------------------------
// Settings laden
//-------------------------------------------------------
function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) settings = { ...settings, ...JSON.parse(raw) };
    } catch {}
}

//-------------------------------------------------------
// Picker Sheet
//-------------------------------------------------------
function openPicker(title, current, min, max, step, setter) {
    state.activeSetter = setter;
    state.pickerMin = min;
    state.pickerMax = max;
    state.pickerStep = step;

    $("#picker_title").textContent = title;
    $("#picker_input").value = current;
    $("#picker_sheet").style.display = "flex";
}

function closePicker() {
    $("#picker_sheet").style.display = "none";
}

$("#picker_ok").addEventListener("click", () => {
    const v = parseInt($("#picker_input").value, 10);
    if (Number.isFinite(v) && v >= state.pickerMin && v <= state.pickerMax) {
        state.activeSetter(v);
        calculate();
    }
    closePicker();
});

//-------------------------------------------------------
// Button-Styles
//-------------------------------------------------------
function setBtnActive(btn, active) {
    btn.classList.toggle("btn-active", active);
    btn.classList.toggle("btn-inactive", !active);
}

//-------------------------------------------------------
// UI: Sauna-Sessions Builder
//-------------------------------------------------------
function buildSaunaUI(count, dur, relax) {
    const wrap = $("#sauna_sessions");
    wrap.innerHTML = "";

    if (!state.sauna || count <= 1) {
        wrap.style.display = "none";
        return;
    }

    wrap.style.display = "block";

    for (let i = 1; i <= count; i++) {
        const row = document.createElement("div");
        row.className = "s_row";

        row.innerHTML = `
            <div style="width:48%;">
                <label class="lbl_small">Gang ${i} – Sauna</label>
                <button id="s_dur_btn_${i}" class="picker_btn">Wählen…</button>
                <span id="s_dur_val_${i}" class="picker_val">${dur}</span>
            </div>
            <div style="width:48%;">
                <label class="lbl_small">Gang ${i} – Relax</label>
                <button id="s_rel_btn_${i}" class="picker_btn">Wählen…</button>
                <span id="s_rel_val_${i}" class="picker_val">${relax}</span>
            </div>
        `;
        wrap.appendChild(row);

        // Picker
        $(`#s_dur_btn_${i}`).addEventListener("click", () =>
            openPicker(
                `Sauna Gang ${i}`,
                parseInt($(`#s_dur_val_${i}`).textContent),
                5, 25, 1,
                v => $(`#s_dur_val_${i}`).textContent = v
            )
        );

        $(`#s_rel_btn_${i}`).addEventListener("click", () =>
            openPicker(
                `Relax Gang ${i}`,
                parseInt($(`#s_rel_val_${i}`).textContent),
                0, 25, 1,
                v => $(`#s_rel_val_${i}`).textContent = v
            )
        );
    }
}

//-------------------------------------------------------
// Sauna-Daten sammeln
//-------------------------------------------------------
function getSaunaData() {
    if (!state.sauna) return { count: 0, sessions: [] };

    const count = parseInt($("#sauna_count_val").textContent, 10) || 1;
    const baseS = parseInt($("#sauna_dur_val").textContent, 10);
    const baseR = parseInt($("#relax_dur_val").textContent, 10);

    if (count === 1) {
        return { count: 1, sessions: [{ sauna: baseS, relax: baseR }] };
    }

    const arr = [];
    for (let i = 1; i <= count; i++) {
        const sd = parseInt($(`#s_dur_val_${i}`).textContent, 10);
        const rl = parseInt($(`#s_rel_val_${i}`).textContent, 10);
        arr.push({ sauna: sd, relax: rl });
    }
    return { count, sessions: arr };
}

//-------------------------------------------------------
// Forward-Mode
//-------------------------------------------------------
function calculateForward() {
    const start = parseTime($("#time_start").value);
    const end = parseTime($("#time_end").value);
    if (start == null || end == null) return renderError("Ungültige Zeitangabe.");

    let total = end - start;
    if (total <= 0) total += 1440;

    const s = settings;
    const sd = getSaunaData();

    const before = s.driveTo + s.changeBefore;
    let after = s.showerAfter + s.changeAfter + s.driveBack;

    if (state.sauna) {
        let saunaTotal = s.preSaunaShower;
        sd.sessions.forEach(x => {
            saunaTotal += x.sauna + s.postSaunaShower + x.relax;
        });
        after += saunaTotal;
    }

    const trainingBudget = total - before - after;
    if (trainingBudget <= 0) return renderError("Zu wenig Zeit.");

    let strength = 0, cardio = 0, pause = 0;

    if (!state.cardio) {
        strength = trainingBudget;
    } else {
        const raw = parseInt($("#ratio_slider").value, 10);
        const cardRaw = 100 - raw;

        const usable = trainingBudget - s.breakBetween;
        strength = Math.round(usable * (raw / 100));
        cardio = usable - strength;
        pause = s.breakBetween;
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

//-------------------------------------------------------
// Reverse-Mode
//-------------------------------------------------------
function calculateReverse() {
    const trainTotal = parseInt($("#rev_train_val").textContent, 10) || 60;
    const s = settings;
    const sd = getSaunaData();

    const before = s.driveTo + s.changeBefore;
    let after = s.showerAfter + s.changeAfter + s.driveBack;

    let saunaBlock = 0;
    if (state.sauna) {
        saunaBlock = s.preSaunaShower;
        sd.sessions.forEach(ss => {
            saunaBlock += ss.sauna + s.postSaunaShower + ss.relax;
        });
    }

    let strength = 0, cardio = 0, pause = 0;

    if (!state.saunaOnly) {
        if (!state.cardio) {
            strength = trainTotal;
        } else {
            const raw = parseInt($("#ratio_slider").value, 10);
            const usable = trainTotal - s.breakBetween;
            strength = Math.round(usable * (raw / 100));
            cardio = usable - strength;
            pause = s.breakBetween;
        }
    }

    const block = before + strength + cardio + pause + saunaBlock + after;

    let anchorStart = parseTime($("#time_start").value);
    let start = anchorStart ?? parseTime($("#time_end").value) - block;
    let end = start + block;

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
        trainTotal
    };

    renderPlan();
}

//-------------------------------------------------------
// Dispatcher
//-------------------------------------------------------
function calculate() {
    if (state.reverseMode) calculateReverse();
    else calculateForward();
}

//-------------------------------------------------------
// Error Renderer
//-------------------------------------------------------
function renderError(msg) {
    $("#plan_output").innerHTML = `<div class="error_box">${msg}</div>`;
    $("#copy_wrap").style.display = "none";
    state.result = null;
}

//-------------------------------------------------------
// Plan Renderer
//-------------------------------------------------------
function renderPlan() {
    const r = state.result;
    const s = settings;
    const sd = r.sauna;

    let t = r.start;
    const steps = [];

    function H(lbl) { steps.push({ h: true, lbl }); }
    function A(lbl) { steps.push({ time: fmt(t), lbl }); }

    function inc(m) { t += m; }

    // Start
    H("Start");
    A("Abfahrt"); inc(s.driveTo);
    A("Ankunft im Gym"); inc(s.changeBefore);

    // Training
    if (r.strength + r.cardio > 0) {
        H("Training");
        if (r.strength > 0) {
            A("Beginn Kraft"); inc(r.strength);
            A("Ende Kraft");
        }
        if (r.pause > 0) {
            inc(r.pause);
            A("Pause Kraft/Cardio");
        }
        if (r.cardio > 0) {
            A("Beginn Cardio"); inc(r.cardio);
            A("Ende Cardio");
        }
    }

    // Sauna
    if (state.sauna && sd.count > 0) {
        H("Sauna");
        A("Abduschen vor Sauna"); inc(s.preSaunaShower);

        sd.sessions.forEach((x, i) => {
            const n = sd.count === 1 ? "" : ` ${i + 1}`;
            A(`Beginn Saunagang${n}`); inc(x.sauna);
            A(`Ende Saunagang${n}`);
            A(`Abduschen nach Saunagang${n}`); inc(s.postSaunaShower);
            A(`Beginn Relax${n}`); inc(x.relax);
            A(`Ende Relax${n}`);
        });
    }

    // Abschluss
    H("Abschluss");
    A("Duschen nach Training"); inc(s.showerAfter);
    A("Anziehen"); inc(s.changeAfter);
    A("Abfahrt nach Hause"); inc(s.driveBack);
    A("Zuhause");

    let html = "";

    steps.forEach(st => {
        if (st.h) {
            html += `<div class="tl_head">${st.lbl}</div>`;
        } else {
            html += `<div class="tl_item"><span class="tm">${st.time}</span><span class="lbl">${st.lbl}</span></div>`;
        }
    });

    $("#plan_output").innerHTML = html;

    state.copyText = steps
        .map(x => x.h ? `\n# ${x.lbl}` : `${x.time} ${x.lbl}`)
        .join("\n")
        .trim();

    $("#copy_wrap").style.display = "block";
}

//-------------------------------------------------------
// Copy
//-------------------------------------------------------
$("#copy_btn").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(state.copyText);
        showToast("Plan kopiert");
    } catch {
        showToast("Fehler beim Kopieren");
    }
});

//-------------------------------------------------------
// Toggles
//-------------------------------------------------------
$("#btn_reverse").addEventListener("click", () => {
    state.reverseMode = !state.reverseMode;
    setBtnActive($("#btn_reverse"), state.reverseMode);

    $("#main_times").style.display = state.reverseMode ? "none" : "block";
    $("#rev_block").style.display = state.reverseMode ? "block" : "none";

    calculate();
});

$("#btn_cardio").addEventListener("click", () => {
    state.cardio = !state.cardio;
    setBtnActive($("#btn_cardio"), state.cardio);
    calculate();
});

$("#btn_sauna").addEventListener("click", () => {
    state.sauna = !state.sauna;
    setBtnActive($("#btn_sauna"), state.sauna);

    $("#sauna_inline_wrap").style.display = state.sauna ? "block" : "none";
    $("#btn_sauna_only").style.display = state.sauna ? "block" : "none";

    calculate();
});

$("#btn_sauna_only").addEventListener("click", () => {
    state.saunaOnly = !state.saunaOnly;
    setBtnActive($("#btn_sauna_only"), state.saunaOnly);
    calculate();
});

//-------------------------------------------------------
// Ratio Slider
//-------------------------------------------------------
$("#ratio_slider").addEventListener("input", () => {
    const v = $("#ratio_slider").value;
    $("#ratio_lbl").textContent = `Kraft ${v}% / Cardio ${100 - v}%`;
    calculate();
});

//-------------------------------------------------------
// Picker Bindings für Inline Sauna
//-------------------------------------------------------
$("#btn_sauna_dur").addEventListener("click", () => {
    openPicker("Saunadauer", parseInt($("#sauna_dur_val").textContent, 10), 5, 25, 1,
        v => $("#sauna_dur_val").textContent = v
    );
});

$("#btn_relax_dur").addEventListener("click", () => {
    openPicker("Relaxdauer", parseInt($("#relax_dur_val").textContent, 10), 0, 25, 1,
        v => $("#relax_dur_val").textContent = v
    );
});

$("#btn_sauna_count").addEventListener("click", () => {
    openPicker("Saunagänge", parseInt($("#sauna_count_val").textContent, 10), 1, 5, 1,
        v => {
            $("#sauna_count_val").textContent = v;
            buildSaunaUI(v,
                parseInt($("#sauna_dur_val").textContent, 10),
                parseInt($("#relax_dur_val").textContent, 10)
            );
        }
    );
});

//-------------------------------------------------------
// Reverse Trainingszeit Picker
//-------------------------------------------------------
$("#rev_train_btn").addEventListener("click", () => {
    openPicker("Trainingszeit", parseInt($("#rev_train_val").textContent, 10) || 60, 5, 300, 5,
        v => $("#rev_train_val").textContent = v
    );
});

//-------------------------------------------------------
// Settings Sheet Buttons
//-------------------------------------------------------
function bindSettingButton(btnId, valId, title, min, max, step, key) {
    $(btnId).addEventListener("click", () => {
        openPicker(title, settings[key], min, max, step,
            v => {
                settings[key] = v;
                $(valId).textContent = v;
            }
        );
    });
}

bindSettingButton("#set_driveTo_btn",      "#set_driveTo_val",      "Fahrt ins Gym", 0, 60, 1, "driveTo");
bindSettingButton("#set_driveBack_btn",    "#set_driveBack_val",    "Heimfahrt", 0, 60, 1, "driveBack");
bindSettingButton("#set_changeBefore_btn", "#set_changeBefore_val", "Umziehen vor Training", 1, 10, 1, "changeBefore");
bindSettingButton("#set_changeAfter_btn",  "#set_changeAfter_val",  "Umziehen nach Training", 1, 10, 1, "changeAfter");
bindSettingButton("#set_break_btn",        "#set_break_val",        "Pause Kraft/Cardio", 1, 10, 1, "breakBetween");
bindSettingButton("#set_saunaDur_btn",     "#set_saunaDur_val",     "Saunadauer", 5, 25, 1, "saunaDuration");
bindSettingButton("#set_relaxDur_btn",     "#set_relaxDur_val",     "Relaxdauer", 0, 25, 1, "relaxDuration");
bindSettingButton("#set_preShower_btn",    "#set_preShower_val",    "Abduschen vor Sauna", 0, 5, 1, "preSaunaShower");
bindSettingButton("#set_postShower_btn",   "#set_postShower_val",   "Abduschen nach Sauna", 0, 5, 1, "postSaunaShower");
bindSettingButton("#set_showerAfter_btn",  "#set_showerAfter_val",  "Duschen nach Training", 0, 10, 1, "showerAfter");

//-------------------------------------------------------
// Einstellungen öffnen/schließen
//-------------------------------------------------------
$("#btn_settings").addEventListener("click", () => {
    const p = $("#settings_panel");
    const active = p.style.display === "block";
    p.style.display = active ? "none" : "block";
    setBtnActive($("#btn_settings"), !active);

    if (!active) p.scrollIntoView({ behavior: "smooth" });
});

$("#save_settings").addEventListener("click", () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    showToast("Einstellungen gespeichert");
    calculate();
});

//-------------------------------------------------------
// Version Panel
//-------------------------------------------------------
$("#btn_versions").addEventListener("click", () => {
    const p = $("#version_panel");
    const a = p.style.display === "block";
    p.style.display = a ? "none" : "block";
    setBtnActive($("#btn_versions"), !a);

    if (!a) {
        p.innerHTML = `
            <div>Version 2.0</div>
            <div>- Komplett neue Struktur</div>
            <div>- iOS Wheel Picker</div>
            <div>- Reverse/Forward Modes</div>
            <div>- Mehrere Saunagänge</div>
            <div>- Settings komplett neu</div>
            <div>- Copy Funktion</div>
        `;
        p.scrollIntoView({ behavior: "smooth" });
    }
});

//-------------------------------------------------------
// Haupt-Berechnen
//-------------------------------------------------------
$("#btn_calc").addEventListener("click", calculate);

//-------------------------------------------------------
// Init
//-------------------------------------------------------
function init() {
    loadSettings();

    // Settings Werte setzen
    $("#set_driveTo_val").textContent      = settings.driveTo;
    $("#set_driveBack_val").textContent    = settings.driveBack;
    $("#set_changeBefore_val").textContent = settings.changeBefore;
    $("#set_changeAfter_val").textContent  = settings.changeAfter;
    $("#set_break_val").textContent        = settings.breakBetween;
    $("#set_saunaDur_val").textContent     = settings.saunaDuration;
    $("#set_relaxDur_val").textContent     = settings.relaxDuration;
    $("#set_preShower_val").textContent    = settings.preSaunaShower;
    $("#set_postShower_val").textContent   = settings.postSaunaShower;
    $("#set_showerAfter_val").textContent  = settings.showerAfter;

    // Ratio Default
    $("#ratio_lbl").textContent = "Kraft 70% / Cardio 30%";

    // Standard Inline Werte
    $("#sauna_dur_val").textContent = settings.saunaDuration;
    $("#relax_dur_val").textContent = settings.relaxDuration;
    $("#sauna_count_val").textContent = 1;
    $("#rev_train_val").textContent = 90;

    // Default-Zeiten
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    $("#time_start").value = fmt(m + 15);
    $("#time_end").value = fmt(m + 15 + 150);

    calculate();
}

init();
