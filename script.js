const applianceList = document.getElementById("applianceList");
const addCustomBtn = document.getElementById("addCustomBtn");
const runAnalysisBtn = document.getElementById("runAnalysisBtn");
const resetBtn = document.getElementById("resetBtn");

const monthlyCostEl = document.getElementById("monthlyCost");
const energyUseEl = document.getElementById("energyUse");
const comfortLevelEl = document.getElementById("comfortLevel");
const peakUsageEl = document.getElementById("peakUsage");
const impactLevelEl = document.getElementById("impactLevel");

const tariffChart = document.getElementById("tariffChart");
const applianceChart = document.getElementById("applianceChart");
const peakRiskList = document.getElementById("peakRiskList");

const currentCostEl = document.getElementById("currentCost");
const improvedCostEl = document.getElementById("improvedCost");
const currentSummaryEl = document.getElementById("currentSummary");
const improvedSummaryEl = document.getElementById("improvedSummary");
const monthlySavingsEl = document.getElementById("monthlySavings");
const peakReductionEl = document.getElementById("peakReduction");
const comfortChangeEl = document.getElementById("comfortChange");
const feedbackList = document.getElementById("feedbackList");

const adviceCard = document.getElementById("adviceCard");
const adviceTitle = document.getElementById("adviceTitle");
const adviceBadge = document.getElementById("adviceBadge");
const adviceText = document.getElementById("adviceText");
const adviceList = document.getElementById("adviceList");
const insightIcon = document.getElementById("insightIcon");

// (economic / environmental / behavioural mini-cards removed)

const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const toastOk = document.getElementById("toastOk");

const TARIFFS = {
    offPeak: 0.18,
    shoulder: 0.28,
    peak: 0.45,
};

const APPLIANCE_ICONS = {
    "air conditioner": "❄️",
    "washing machine": "🫧",
    lighting: "💡",
    lights: "💡",
    "water heater": "🚿",
    refrigerator: "🧊",
    fridge: "🧊",
    "cooktop / rice cooker": "🍚",
    heater: "🔥",
    tv: "📺",
    "custom appliance": "🔌",
};

const defaultAppliances = [
    {
        id: "a1",
        name: "Air conditioner",
        power: 1500,
        days: 7,
        start: "18:00",
        end: "23:00",
        comfortWeight: 18,
        removable: false,
        flexible: true,
    },
    {
        id: "a2",
        name: "Washing machine",
        power: 500,
        days: 3,
        start: "19:00",
        end: "20:00",
        comfortWeight: 4,
        removable: false,
        flexible: true,
    },
    {
        id: "a3",
        name: "Lighting",
        power: 120,
        days: 7,
        start: "18:00",
        end: "23:00",
        comfortWeight: 10,
        removable: false,
        flexible: false,
    },
    {
        id: "a4",
        name: "Water heater",
        power: 3000,
        days: 7,
        start: "06:00",
        end: "07:00",
        comfortWeight: 10,
        removable: false,
        flexible: false,
    },
    {
        id: "a5",
        name: "Refrigerator",
        power: 180,
        days: 7,
        start: "00:00",
        end: "23:59",
        comfortWeight: 22,
        removable: false,
        flexible: false,
    },
    {
        id: "a6",
        name: "Cooktop / Rice cooker",
        power: 1200,
        days: 7,
        start: "17:30",
        end: "18:30",
        comfortWeight: 12,
        removable: false,
        flexible: true,
    },
];

let customIdCounter = 100;
let appliances = JSON.parse(JSON.stringify(defaultAppliances));
let audioUnlocked = false;

// Billing period: "month" or "quarter". Multiplies $$ and kWh display globally.
let currentPeriod = "month";
const PERIOD_FACTOR = { month: 1, quarter: 3 };
function periodFactor() { return PERIOD_FACTOR[currentPeriod] || 1; }
function periodWord() { return currentPeriod === "quarter" ? "quarter" : "month"; }
function periodWordCap() { return currentPeriod === "quarter" ? "Quarterly" : "Monthly"; }
function fmtMoney(monthly) { return `$${(monthly * periodFactor()).toFixed(2)}`; }
function fmtKwh(monthly) { return `${(monthly * periodFactor()).toFixed(1)} kWh`; }

let toastTimer = null;
function showToast(message, type = "success") {
    toastText.textContent = message;
    toast.classList.remove("hidden", "toast-success", "toast-error");
    toast.classList.add(type === "error" ? "toast-error" : "toast-success");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3500);
}

function hideToast() {
    toast.classList.add("hidden");
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }
}

toastOk.addEventListener("click", hideToast);

function unlockAudio() {
    audioUnlocked = true;
}

document.addEventListener("click", unlockAudio, { once: true });

function playInsightSound(type) {
    if (!audioUnlocked) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notesByType = {
        good: [660, 880],
        mid: [520, 640],
        bad: [280, 220],
    };

    const notes = notesByType[type] || [520, 640];

    notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type === "bad" ? "sawtooth" : "sine";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.0001, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.06, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + index * 0.12 + 0.18,
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.2);
    });

    setTimeout(() => {
        if (ctx.state !== "closed") ctx.close();
    }, 800);
}

function getApplianceIcon(name) {
    const key = name.toLowerCase().trim();
    return APPLIANCE_ICONS[key] || "🔌";
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60)
        .toString()
        .padStart(2, "0");
    const m = Math.floor(normalized % 60)
        .toString()
        .padStart(2, "0");
    return `${h}:${m}`;
}

function getDurationMinutes(start, end) {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    if (endMin === startMin) return 24 * 60;
    if (endMin > startMin) return endMin - startMin;
    return 1440 - startMin + endMin;
}

function getTariffTypeByMinute(minute) {
    const hour = minute / 60;
    if (hour >= 22 || hour < 7) return "offPeak";
    if (hour >= 16 && hour < 21) return "peak";
    return "shoulder";
}

function calculateAppliance(appliance) {
    const durationMinutes = getDurationMinutes(appliance.start, appliance.end);
    const durationHours = durationMinutes / 60;
    const powerKw = appliance.power / 1000;

    let offPeakMinutes = 0;
    let shoulderMinutes = 0;
    let peakMinutes = 0;

    let current = timeToMinutes(appliance.start);

    for (let i = 0; i < durationMinutes; i++) {
        const tariff = getTariffTypeByMinute(current % 1440);
        if (tariff === "offPeak") offPeakMinutes++;
        if (tariff === "shoulder") shoulderMinutes++;
        if (tariff === "peak") peakMinutes++;
        current++;
    }

    const offPeakHours = offPeakMinutes / 60;
    const shoulderHours = shoulderMinutes / 60;
    const peakHours = peakMinutes / 60;

    const dailyKwh = powerKw * durationHours;
    const monthlyKwh = dailyKwh * appliance.days * 4.33;

    const monthlyOffPeakCost =
        powerKw * offPeakHours * TARIFFS.offPeak * appliance.days * 4.33;
    const monthlyShoulderCost =
        powerKw * shoulderHours * TARIFFS.shoulder * appliance.days * 4.33;
    const monthlyPeakCost =
        powerKw * peakHours * TARIFFS.peak * appliance.days * 4.33;

    const monthlyCost =
        monthlyOffPeakCost + monthlyShoulderCost + monthlyPeakCost;
    const peakRatio = durationHours > 0 ? peakHours / durationHours : 0;

    return {
        durationHours,
        monthlyKwh,
        monthlyCost,
        monthlyOffPeakCost,
        monthlyShoulderCost,
        monthlyPeakCost,
        peakRatio,
    };
}

function getComfortScore(calculated) {
    let score = 100;

    calculated.forEach(({ appliance, calc }) => {
        const name = appliance.name.toLowerCase();

        if (appliance.days === 0) {
            if (
                name.includes("air conditioner") ||
                name.includes("water heater") ||
                name.includes("lighting") ||
                name.includes("cooktop") ||
                name.includes("rice cooker")
            ) {
                score -= Math.round(appliance.comfortWeight * 0.55);
            }
        }

        if (
            name.includes("air conditioner") &&
            calc.durationHours < 3 &&
            appliance.days > 0
        )
            score -= 12;
        if (
            name.includes("lighting") &&
            calc.durationHours < 3 &&
            appliance.days > 0
        )
            score -= 6;
        if (
            name.includes("refrigerator") &&
            calc.durationHours < 20 &&
            appliance.days > 0
        )
            score -= 20;
    });

    return Math.max(40, Math.min(100, score));
}

function getImpactLevel(totalKwh) {
    if (totalKwh < 180) return "Low";
    if (totalKwh < 320) return "Moderate";
    return "High";
}

function renderAppliances() {
    applianceList.innerHTML = "";

    appliances.forEach((item) => {
        const calc = calculateAppliance(item);
        const icon = getApplianceIcon(item.name);

        const card = document.createElement("article");
        card.className = "appliance-card";
        card.dataset.cardId = item.id;

        card.innerHTML = `
      <div class="appliance-top">
        <div class="appliance-heading">
          <div class="appliance-icon" data-display="icon">${icon}</div>
          <div>
            <div class="appliance-name" data-display="name">${item.name}</div>
            <div class="appliance-meta">Set appliance details and schedule</div>
          </div>
        </div>
        <button
          class="remove-btn ${item.removable ? "" : "hidden-btn"}"
          data-action="remove"
          data-id="${item.id}"
          type="button"
        >
          Remove
        </button>
      </div>

      <div class="appliance-grid">
        <div class="field-group">
          <label>Appliance name</label>
          <input type="text" value="${item.name}" data-id="${item.id}" data-field="name" />
        </div>

        <div class="field-group">
          <label>Power (W)</label>
          <input type="number" min="1" step="1" value="${item.power}" data-id="${item.id}" data-field="power" />
        </div>

        <div class="field-group">
          <label>Days per week</label>
          <select data-id="${item.id}" data-field="days">
            ${[0, 1, 2, 3, 4, 5, 6, 7]
                .map(
                    (day) =>
                        `<option value="${day}" ${Number(item.days) === day ? "selected" : ""}>${day}</option>`,
                )
                .join("")}
          </select>
        </div>

        <div class="field-group">
          <label>Start time</label>
          <input type="time" value="${item.start}" data-id="${item.id}" data-field="start" />
        </div>

        <div class="field-group">
          <label>End time</label>
          <input type="time" value="${item.end}" data-id="${item.id}" data-field="end" />
        </div>

        <div class="field-group">
          <label>Comfort importance</label>
          <select data-id="${item.id}" data-field="comfortWeight">
            <option value="4" ${Number(item.comfortWeight) === 4 ? "selected" : ""}>Low</option>
            <option value="10" ${Number(item.comfortWeight) === 10 ? "selected" : ""}>Medium</option>
            <option value="18" ${Number(item.comfortWeight) === 18 ? "selected" : ""}>High</option>
            <option value="22" ${Number(item.comfortWeight) === 22 ? "selected" : ""}>Very high</option>
          </select>
        </div>
      </div>

      <div class="appliance-footer">
        <div class="footer-stat">
          Duration
          <strong data-stat="duration">${calc.durationHours.toFixed(2)} hrs</strong>
        </div>
        <div class="footer-stat">
          Energy / <span data-period-label>${periodWord()}</span>
          <strong data-stat="energy">${fmtKwh(calc.monthlyKwh)}</strong>
        </div>
        <div class="footer-stat">
          Cost / <span data-period-label>${periodWord()}</span>
          <strong data-stat="cost">${fmtMoney(calc.monthlyCost)}</strong>
        </div>
        <div class="footer-stat">
          Peak share
          <strong data-stat="peak">${Math.round(calc.peakRatio * 100)}%</strong>
        </div>
      </div>
    `;

        applianceList.appendChild(card);
    });
}

function updateAppliance(id, field, value) {
    appliances = appliances.map((item) => {
        if (item.id !== id) return item;

        if (["power", "days", "comfortWeight"].includes(field)) {
            return { ...item, [field]: Number(value) };
        }

        return { ...item, [field]: value };
    });

    updateApplianceCardStats(id, field);
    renderCurrentState();
}

function updateApplianceCardStats(id, changedField) {
    const item = appliances.find((a) => a.id === id);
    if (!item) return;
    const card = applianceList.querySelector(`[data-card-id="${id}"]`);
    if (!card) return;

    const calc = calculateAppliance(item);
    const dur = card.querySelector('[data-stat="duration"]');
    const energy = card.querySelector('[data-stat="energy"]');
    const cost = card.querySelector('[data-stat="cost"]');
    const peak = card.querySelector('[data-stat="peak"]');
    if (dur) dur.textContent = `${calc.durationHours.toFixed(2)} hrs`;
    if (energy) energy.textContent = fmtKwh(calc.monthlyKwh);
    if (cost) cost.textContent = fmtMoney(calc.monthlyCost);
    if (peak) peak.textContent = `${Math.round(calc.peakRatio * 100)}%`;

    if (changedField === "name") {
        const nameEl = card.querySelector('[data-display="name"]');
        const iconEl = card.querySelector('[data-display="icon"]');
        if (nameEl) nameEl.textContent = item.name;
        if (iconEl) iconEl.textContent = getApplianceIcon(item.name);
    }
}

function addCustomAppliance() {
    customIdCounter += 1;

    // Default to an active schedule so a newly added appliance immediately
    // appears in the cost breakdown and peak-risk summary. Users can still
    // set Days per week to 0 if they want to exclude it.
    appliances.push({
        id: `custom-${customIdCounter}`,
        name: `Custom appliance ${customIdCounter - 100}`,
        power: 800,
        days: 7,
        start: "19:00",
        end: "21:00",
        comfortWeight: 10,
        removable: true,
        flexible: true,
    });

    renderAppliances();
    renderCurrentState();
    showToast("Custom appliance added to charts");
}

function removeAppliance(id) {
    appliances = appliances.filter((item) => item.id !== id);
    renderAppliances();
    renderCurrentState();
}

function getCalculatedSet(sourceAppliances) {
    return sourceAppliances.map((appliance) => ({
        appliance,
        calc: calculateAppliance(appliance),
    }));
}

function summarizeState(sourceAppliances) {
    const calculated = getCalculatedSet(sourceAppliances);

    const totalCost = calculated.reduce(
        (sum, item) => sum + item.calc.monthlyCost,
        0,
    );
    const totalEnergy = calculated.reduce(
        (sum, item) => sum + item.calc.monthlyKwh,
        0,
    );
    const offPeakCost = calculated.reduce(
        (sum, item) => sum + item.calc.monthlyOffPeakCost,
        0,
    );
    const shoulderCost = calculated.reduce(
        (sum, item) => sum + item.calc.monthlyShoulderCost,
        0,
    );
    const peakCost = calculated.reduce(
        (sum, item) => sum + item.calc.monthlyPeakCost,
        0,
    );

    const totalWeightedPeakHours = calculated.reduce(
        (sum, item) =>
            sum +
            item.calc.durationHours * item.appliance.days * item.calc.peakRatio,
        0,
    );

    const totalWeightedHours = calculated.reduce(
        (sum, item) => sum + item.calc.durationHours * item.appliance.days,
        0,
    );

    const peakShare =
        totalWeightedHours > 0
            ? (totalWeightedPeakHours / totalWeightedHours) * 100
            : 0;
    const comfort = getComfortScore(calculated);
    const impact = getImpactLevel(totalEnergy);

    return {
        calculated,
        totalCost,
        totalEnergy,
        offPeakCost,
        shoulderCost,
        peakCost,
        peakShare,
        comfort,
        impact,
    };
}

// Only background / deferrable loads are safe to auto-shift to off-peak hours.
// Cooking, lighting, AC (for sleep), fridge and TV are tied to daily life rhythm
// and must NEVER be silently moved into the small hours.
const SHIFTABLE_NAME_KEYWORDS = [
    "washing",       // washing machine
    "laundry",
    "dishwasher",
    "dryer",
    "tumble",
    "ev charger",
    "electric vehicle",
    "pool pump",
    "pump",
    "irrigation",
    "robot vacuum",
];

function isAutoShiftable(name) {
    const n = String(name || "").toLowerCase();
    return SHIFTABLE_NAME_KEYWORDS.some((k) => n.includes(k));
}

function buildOptimizedPlan(sourceAppliances) {
    return sourceAppliances.map((item) => {
        const duration = getDurationMinutes(item.start, item.end);
        const peakHeavy =
            calculateAppliance(item).peakRatio > 0.35 &&
            item.flexible &&
            item.days > 0 &&
            isAutoShiftable(item.name);

        if (!peakHeavy) return { ...item };

        const newStart = 22 * 60;
        const newEnd = newStart + duration;

        return {
            ...item,
            start: minutesToTime(newStart),
            end: minutesToTime(newEnd),
        };
    });
}

function renderTariffChart(summary) {
    const rows = [
        {
            label: "Off-peak",
            value: summary.offPeakCost,
            fillClass: "fill-offpeak",
        },
        {
            label: "Shoulder",
            value: summary.shoulderCost,
            fillClass: "fill-shoulder",
        },
        { label: "Peak", value: summary.peakCost, fillClass: "fill-peak" },
    ];

    const maxValue = Math.max(...rows.map((row) => row.value), 1);

    tariffChart.innerHTML = rows
        .map((row) => {
            const width = (row.value / maxValue) * 100;
            return `
        <div class="chart-row">
          <div class="chart-label">${row.label}</div>
          <div class="chart-track">
            <div class="chart-fill ${row.fillClass}" style="width: ${width}%"></div>
          </div>
          <div class="chart-value">${fmtMoney(row.value)}</div>
        </div>
      `;
        })
        .join("");
}

const PIE_PALETTE = [
    "#22c55e", "#22d3ee", "#3b82f6", "#f59e0b",
    "#a78bfa", "#ec4899", "#14b8a6", "#ef4444",
];

function renderApplianceChart(summary) {
    const svg = document.getElementById("appliancePie");
    const legend = document.getElementById("appliancePieLegend");
    if (!svg || !legend) return;

    // Keep the original donut chart layout and visual style.
    // Important fix: use EVERY appliance currently in the user's input list.
    // Do not collapse custom appliances into "Others".
    const activeItems = summary.calculated
        .filter((item) => Number(item.appliance.days) > 0 && item.calc.durationHours > 0)
        .map((item) => ({
            id: item.appliance.id,
            name: item.appliance.name,
            icon: getApplianceIcon(item.appliance.name),
            cost: item.calc.monthlyCost,
        }))
        .sort((a, b) => b.cost - a.cost);

    const slices = activeItems
        .filter((item) => item.cost > 0)
        .map((item, i) => ({
            ...item,
            color: PIE_PALETTE[i % PIE_PALETTE.length],
        }));

    const total = slices.reduce((s, x) => s + x.cost, 0);

    if (total <= 0) {
        svg.innerHTML = `<circle class="appliance-pie-empty" cx="100" cy="100" r="80" />
            <text class="appliance-pie-center-text" x="100" y="100">No cost yet</text>`;
        legend.innerHTML = '<p class="muted">Run a schedule with non-zero usage to see breakdown.</p>';
        return;
    }

    const cx = 100, cy = 100, r = 80;
    let cumulative = 0;
    const paths = slices
        .map((s) => {
            const startAngle = (cumulative / total) * 2 * Math.PI;
            cumulative += s.cost;
            const endAngle = (cumulative / total) * 2 * Math.PI;
            const fraction = s.cost / total;

            // SVG cannot draw a true 360° arc with one path, so use a circle
            // when there is only one active appliance.
            if (fraction >= 0.9999) {
                return `<circle class="appliance-pie-slice" cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}"><title>${s.name}: ${fmtMoney(s.cost)} (100%)</title></circle>`;
            }

            const x1 = cx + r * Math.sin(startAngle);
            const y1 = cy - r * Math.cos(startAngle);
            const x2 = cx + r * Math.sin(endAngle);
            const y2 = cy - r * Math.cos(endAngle);
            const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
            const pct = (fraction * 100).toFixed(1);
            return `<path class="appliance-pie-slice" d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${s.color}"><title>${s.name}: ${fmtMoney(s.cost)} (${pct}%)</title></path>`;
        })
        .join("");

    const centerHole = `<circle class="appliance-pie-center" cx="${cx}" cy="${cy}" r="38" />
        <text class="appliance-pie-center-text" x="${cx}" y="${cy - 6}">${periodWordCap()}</text>
        <text class="appliance-pie-center-text" x="${cx}" y="${cy + 10}" style="font-weight:700;fill:var(--text);font-size:14px;">${fmtMoney(total)}</text>`;

    svg.innerHTML = paths + centerHole;

    // Original right-side legend structure is preserved: colour + amount + percentage.
    // Appliance names are included as title tooltips so custom appliances remain identifiable
    // without changing the original visual style.
    legend.innerHTML = slices
        .map((s) => {
            const pct = total > 0 ? ((s.cost / total) * 100).toFixed(1) : "0.0";
            return `<div class="legend-row compact-legend-row" title="${s.name}">
                <span class="legend-swatch" style="background:${s.color}"></span>
                <span class="legend-value">${fmtMoney(s.cost)}</span>
                <span class="legend-pct">${pct}%</span>
            </div>`;
        })
        .join("");
}

function renderPeakRisk(summary) {
    // Show every appliance that the user is currently using, including all
    // user-added custom appliances. Nothing is capped to the top four.
    const risky = [...summary.calculated]
        .filter((item) => Number(item.appliance.days) > 0 && item.calc.durationHours > 0)
        .sort((a, b) => {
            const peakDiff = b.calc.peakRatio - a.calc.peakRatio;
            if (Math.abs(peakDiff) > 0.0001) return peakDiff;
            return b.calc.monthlyCost - a.calc.monthlyCost;
        });

    if (risky.length === 0) {
        peakRiskList.innerHTML = '<p class="muted">No active appliances yet.</p>';
        return;
    }

    peakRiskList.innerHTML = risky
        .map(
            (item) => `
      <div class="peak-risk-item">
        <span>${getApplianceIcon(item.appliance.name)} ${item.appliance.name}</span>
        <strong>${Math.round(item.calc.peakRatio * 100)}% peak</strong>
      </div>
    `,
        )
        .join("");
}

function renderCurrentState() {
    const summary = summarizeState(appliances);

    monthlyCostEl.textContent = fmtMoney(summary.totalCost);
    energyUseEl.textContent = fmtKwh(summary.totalEnergy);
    comfortLevelEl.textContent = `${summary.comfort}%`;
    peakUsageEl.textContent = `${Math.round(summary.peakShare)}%`;
    impactLevelEl.textContent = summary.impact;

    renderTariffChart(summary);
    renderApplianceChart(summary);
    renderPeakRisk(summary);
}

function setInsightState(state) {
    adviceCard.classList.remove("insight-good", "insight-mid", "insight-bad");
    adviceCard.classList.add(state);
}

function updateInsightVisual(type) {
    if (type === "good") {
        insightIcon.textContent = "✅";
        insightIcon.style.background = "rgba(255,255,255,0.75)";
        playInsightSound("good");
        return;
    }

    if (type === "mid") {
        insightIcon.textContent = "🔎";
        insightIcon.style.background = "rgba(255,255,255,0.75)";
        playInsightSound("mid");
        return;
    }

    insightIcon.textContent = "⚠️";
    insightIcon.style.background = "rgba(255,255,255,0.75)";
    playInsightSound("bad");
}

function renderFeedbackAndInsight(currentSummary, improvedSummary) {
    const monthlySavings = currentSummary.totalCost - improvedSummary.totalCost;
    const peakReduction =
        currentSummary.peakCost > 0
            ? ((currentSummary.peakCost - improvedSummary.peakCost) /
                  currentSummary.peakCost) *
              100
            : 0;

    const comfortDiff = improvedSummary.comfort - currentSummary.comfort;

    currentCostEl.textContent = fmtMoney(currentSummary.totalCost);
    improvedCostEl.textContent = fmtMoney(improvedSummary.totalCost);

    currentSummaryEl.textContent = `Current schedule uses ${Math.round(currentSummary.peakShare)}% of active usage in peak-price periods.`;

    improvedSummaryEl.textContent = `Suggested plan reduces peak exposure and shifts flexible appliances toward cheaper time windows.`;

    monthlySavingsEl.textContent = fmtMoney(Math.max(0, monthlySavings));
    peakReductionEl.textContent = `${Math.max(0, Math.round(peakReduction))}%`;
    comfortChangeEl.textContent = `${comfortDiff >= 0 ? "+" : ""}${Math.round(comfortDiff)} pts`;

    const changedItems = currentSummary.calculated.filter((currentItem) => {
        const improvedItem = improvedSummary.calculated.find(
            (x) => x.appliance.id === currentItem.appliance.id,
        );
        return (
            improvedItem &&
            (improvedItem.appliance.start !== currentItem.appliance.start ||
                improvedItem.appliance.end !== currentItem.appliance.end)
        );
    });

    feedbackList.innerHTML = "";

    if (!changedItems.length) {
        feedbackList.innerHTML = `<li>Your current plan is already relatively efficient, so no major schedule shift was generated.</li>`;
    } else {
        changedItems.forEach((item) => {
            const improvedItem = improvedSummary.calculated.find(
                (x) => x.appliance.id === item.appliance.id,
            );

            const row = document.createElement("li");
            row.textContent =
                `${item.appliance.name} moved from ${item.appliance.start}–${item.appliance.end} ` +
                `to ${improvedItem.appliance.start}–${improvedItem.appliance.end} to reduce peak-time cost.`;
            feedbackList.appendChild(row);
        });
    }

    const severity = decideSeverity(currentSummary);
    applyFallbackInsightText(severity, monthlySavings);
    return { severity, monthlySavings };
}

// ===== Weighted severity scoring =====
// Each scoring function returns 0–100 (higher = worse).
// Benchmarks calibrated against AER Brisbane residential consumption data
// (1-person ~280 kWh / $139; 2-person ~420 kWh / $188; 4-person ~640 kWh / $215).
function scoreCost(cost) {
    // Anchors: $120 (very low) → 0;  $320 (top 10%) → 100
    if (cost <= 120) return 0;
    if (cost >= 320) return 100;
    return ((cost - 120) / 200) * 100;
}
function scoreEnergy(kwh) {
    // Anchors: 280 kWh (1-person avg) → 0;  700 kWh (top 10%) → 100
    if (kwh <= 280) return 0;
    if (kwh >= 700) return 100;
    return ((kwh - 280) / 420) * 100;
}
function scorePeak(pct) {
    // Anchors: 15% (well-shifted) → 0;  65% (severe peak concentration) → 100
    if (pct <= 15) return 0;
    if (pct >= 65) return 100;
    return ((pct - 15) / 50) * 100;
}
function scoreComfort(comfort) {
    // Reverse: 85+ → 0 (good comfort);  55 or below → 100 (poor comfort)
    if (comfort >= 85) return 0;
    if (comfort <= 55) return 100;
    return ((85 - comfort) / 30) * 100;
}

const SEVERITY_WEIGHTS = {
    cost: 0.35,
    peak: 0.30,
    energy: 0.20,
    comfort: 0.15,
};

function computeSeverityScore(s) {
    const sc = scoreCost(s.totalCost);
    const sp = scorePeak(s.peakShare);
    const se = scoreEnergy(s.totalEnergy);
    const scm = scoreComfort(s.comfort);
    const composite =
        sc * SEVERITY_WEIGHTS.cost +
        sp * SEVERITY_WEIGHTS.peak +
        se * SEVERITY_WEIGHTS.energy +
        scm * SEVERITY_WEIGHTS.comfort;
    return {
        composite,
        breakdown: { cost: sc, peak: sp, energy: se, comfort: scm },
    };
}

function decideSeverity(s) {
    const { composite } = computeSeverityScore(s);
    if (composite >= 60) return "bad";
    if (composite >= 30) return "mid";
    return "good";
}

const FALLBACK_TEXTS = {
    bad: {
        title: "High waste and high-cost pattern",
        badge: "Warning",
        summary:
            "The main cognitive issue is not just high usage, but poor timing. Expensive peak overlap turns ordinary appliance use into financial stress.",
        bullets: [
            "Economic: A large portion of your bill is created by running appliances during high-price windows.",
            "Environmental: High total consumption and poor timing increase energy waste pressure.",
            "Design insight: Users need timing feedback, not only total-cost feedback, to understand the real cause of high bills.",
            "Action: Reschedule flexible appliances first before reducing essential comfort appliances.",
        ],
        environmental:
            "The environmental problem is not only high volume, but also inefficient timing and avoidable waste.",
        behavioural:
            "The interface should help users see when electricity becomes expensive, not just how much they use overall.",
    },
    mid: {
        title: "Moderate trade-off",
        badge: "Review",
        summary:
            "Your usage is workable, but the key insight is that small schedule changes can improve outcomes without major lifestyle disruption.",
        bullets: [
            "Economic: Several appliances are affordable in isolation but expensive when combined during peak periods.",
            "Environmental: Shifting flexible use lowers waste without requiring new hardware.",
            "Design insight: Users benefit from comparing current and improved plans side by side.",
            "Action: Start with one flexible appliance and compare the result before changing everything at once.",
        ],
        environmental:
            "Moderate improvement comes from better timing rather than dramatic reduction in electricity use.",
        behavioural:
            "Comparison feedback supports decision confidence because users can see what changes and what stays stable.",
    },
    good: {
        title: "Efficient usage pattern",
        badge: "Good",
        summary:
            "Your current plan already uses electricity in a relatively informed way. The most important insight is that timing awareness helps users stay efficient over time.",
        bullets: [
            "Economic: Your current usage avoids unnecessary high-price overlap.",
            "Environmental: Better-timed electricity use supports lower waste and more responsible behaviour.",
            "Design insight: Making appliance-level schedules visible helps users understand invisible energy patterns.",
            "Action: Keep this pattern and evaluate new appliances before placing them in peak-price periods.",
        ],
        environmental:
            "Efficient behaviour supports both lower cost and more responsible electricity use.",
        behavioural:
            "The strongest cognitive benefit is clarity: users can connect a specific schedule decision to a visible financial outcome.",
    },
};

function applyFallbackInsightText(severity, monthlySavings) {
    setInsightState(`insight-${severity}`);
    updateInsightVisual(severity);
    const t = FALLBACK_TEXTS[severity];
    adviceTitle.textContent = t.title;
    adviceBadge.textContent = t.badge;
    adviceText.textContent = t.summary;
    adviceList.innerHTML = t.bullets
        .map((b) => {
            const m = b.match(/^([^:]+):\s*(.+)$/);
            return m
                ? `<li><strong>${m[1]}:</strong> ${m[2]}</li>`
                : `<li>${b}</li>`;
        })
        .join("");

}

function applyAIInsight(ai) {
    if (!ai) return;
    if (ai.title) adviceTitle.textContent = ai.title;
    if (ai.badge) adviceBadge.textContent = ai.badge;
    if (ai.summary) adviceText.textContent = ai.summary;
    if (Array.isArray(ai.bullets) && ai.bullets.length) {
        adviceList.innerHTML = ai.bullets
            .map((b) => {
                const m = b.match(/^([^:]+):\s*(.+)$/);
                return m
                    ? `<li><strong>${m[1]}:</strong> ${m[2]}</li>`
                    : `<li>${b}</li>`;
            })
            .join("");
    }
    showAIBanner();
}

let latestSummary = null;

async function runFullAnalysis() {
    const currentSummary = summarizeState(appliances);
    const optimizedPlan = buildOptimizedPlan(appliances);
    const improvedSummary = summarizeState(optimizedPlan);
    latestSummary = currentSummary;

    renderCurrentState();
    hideAIBanner();

    const { severity, monthlySavings } = renderFeedbackAndInsight(
        currentSummary,
        improvedSummary,
    );

    document
        .querySelectorAll(".flow-step")
        .forEach((step) => step.classList.add("active"));

    document
        .getElementById("insights")
        .scrollIntoView({ behavior: "smooth", block: "start" });

    let aiInsight = null;
    try {
        const score = computeSeverityScore(currentSummary);
        aiInsight = await generateInsight({
            currentSummary,
            improvedSummary,
            severity,
            monthlySavings,
            period: currentPeriod,
            score,
        });
        applyAIInsight(aiInsight);
    } catch (err) {
        console.warn("AI insight failed, keeping fallback:", err);
    }

    if (currentUser()) {
        try {
            await saveRecord({
                appliances: JSON.parse(JSON.stringify(appliances)),
                summary: {
                    totalCost: currentSummary.totalCost,
                    totalEnergy: currentSummary.totalEnergy,
                    peakShare: currentSummary.peakShare,
                    comfort: currentSummary.comfort,
                    impact: currentSummary.impact,
                },
                severity,
                aiInsight,
            });
        } catch (err) {
            console.warn("saveRecord failed:", err);
        }
    }
}

function resetAll() {
    appliances = JSON.parse(JSON.stringify(defaultAppliances));
    renderAppliances();
    renderCurrentState();

    currentCostEl.textContent = "$0.00";
    improvedCostEl.textContent = "$0.00";
    currentSummaryEl.textContent =
        "Your current schedule has not been analysed yet.";
    improvedSummaryEl.textContent =
        "Run the analysis to generate a smarter schedule.";
    monthlySavingsEl.textContent = "$0.00";
    peakReductionEl.textContent = "0%";
    comfortChangeEl.textContent = "0 pts";
    feedbackList.innerHTML =
        "<li>Run the analysis to generate a comparison.</li>";

    setInsightState("insight-good");
    insightIcon.textContent = "✅";
    adviceTitle.textContent = "Efficient usage pattern";
    adviceBadge.textContent = "Good";
    adviceText.textContent =
        "Your current schedule is relatively efficient and avoids unnecessary peak-hour pressure.";
    adviceList.innerHTML = `
    <li>Keep flexible appliances outside expensive peak periods.</li>
    <li>Your current pattern supports cost control and lower energy waste.</li>
  `;

    document.querySelectorAll(".flow-step").forEach((step, index) => {
        if (index === 0) step.classList.add("active");
        else step.classList.remove("active");
    });

    hideAIBanner();
    latestSummary = null;
    showToast("Simulation reset");
}

applianceList.addEventListener("input", (event) => {
    const target = event.target;
    const id = target.dataset.id;
    const field = target.dataset.field;
    if (!id || !field) return;
    updateAppliance(id, field, target.value);
});

applianceList.addEventListener("change", (event) => {
    const target = event.target;
    const id = target.dataset.id;
    const field = target.dataset.field;
    if (!id || !field) return;
    updateAppliance(id, field, target.value);
});

applianceList.addEventListener("click", (event) => {
    const target = event.target;
    if (target.dataset.action === "remove") {
        removeAppliance(target.dataset.id);
    }
});

addCustomBtn.addEventListener("click", addCustomAppliance);
runAnalysisBtn.addEventListener("click", runFullAnalysis);
resetBtn.addEventListener("click", resetAll);

const aiBanner = document.getElementById("aiBanner");
function showAIBanner() {
    if (!aiBanner) return;
    aiBanner.classList.remove("hidden");
    // Restart animation
    aiBanner.style.animation = "none";
    void aiBanner.offsetWidth;
    aiBanner.style.animation = "";
}
function hideAIBanner() {
    if (aiBanner) aiBanner.classList.add("hidden");
}
if (aiBanner) {
    aiBanner.querySelector(".ai-banner-close")?.addEventListener("click", hideAIBanner);
}

function refreshPeriodLabels() {
    document.querySelectorAll("[data-period-label]").forEach((el) => {
        const txt = el.textContent.trim();
        const isCap = /^[A-Z]/.test(txt);
        el.textContent = isCap ? periodWordCap() : periodWord();
    });
}

function setPeriod(p) {
    if (p !== "month" && p !== "quarter") return;
    if (p === currentPeriod) return;
    currentPeriod = p;
    document.querySelectorAll(".period-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.period === p);
    });
    refreshPeriodLabels();
    renderAppliances();
    renderCurrentState();
    // If an analysis has been run, re-display Insights with new units
    if (latestSummary) {
        const optimizedPlan = buildOptimizedPlan(appliances);
        const improvedSummary = summarizeState(optimizedPlan);
        renderFeedbackAndInsight(latestSummary, improvedSummary);
    }
}

document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", () => setPeriod(btn.dataset.period));
});

renderAppliances();
renderCurrentState();

/* ===== User menu / auth ===== */
const userBtn = document.getElementById("userBtn");
const userDropdown = document.getElementById("userDropdown");
const userLabel = document.getElementById("userLabel");
const userAvatar = document.getElementById("userAvatar");
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authError = document.getElementById("authError");
const authSubmit = document.getElementById("authSubmit");
const historyModal = document.getElementById("historyModal");
const historyListEl = document.getElementById("historyList");
const importFileInput = document.getElementById("importFileInput");

let authMode = "login";

function refreshUserMenu() {
    const u = currentUser();
    if (u) {
        userLabel.textContent = u;
        userAvatar.textContent = u[0].toUpperCase();
        userDropdown.querySelectorAll(".auth-only").forEach((el) => el.classList.remove("hidden"));
        userDropdown.querySelector('[data-action="login"]').classList.add("hidden");
        userDropdown.querySelector('[data-action="register"]').classList.add("hidden");
    } else {
        userLabel.textContent = "Guest";
        userAvatar.textContent = "G";
        userDropdown.querySelectorAll(".auth-only").forEach((el) => el.classList.add("hidden"));
        userDropdown.querySelector('[data-action="login"]').classList.remove("hidden");
        userDropdown.querySelector('[data-action="register"]').classList.remove("hidden");
    }
}

function openAuthModal(mode) {
    authMode = mode;
    authError.classList.add("hidden");
    authError.textContent = "";
    authUsername.value = "";
    authPassword.value = "";
    authModal.querySelectorAll(".modal-tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.tab === mode);
    });
    authSubmit.textContent = mode === "register" ? "Create account" : "Log in";
    authModal.classList.remove("hidden");
    setTimeout(() => authUsername.focus(), 50);
}

function closeAuthModal() {
    authModal.classList.add("hidden");
}

userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!userBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add("hidden");
    }
});

userDropdown.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    userDropdown.classList.add("hidden");
    if (action === "login") openAuthModal("login");
    else if (action === "register") openAuthModal("register");
    else if (action === "logout") {
        logoutUser();
        refreshUserMenu();
        showToast("Logged out");
    } else if (action === "history") openHistoryModal();
    else if (action === "export") {
        try {
            await exportAll();
            showToast("Backup downloaded");
        } catch (err) {
            showToast(err.message || "Export failed", "error");
        }
    } else if (action === "import") {
        importFileInput.click();
    }
});

authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuthModal();
    if (e.target.dataset.action === "close-auth") closeAuthModal();
    if (e.target.dataset.action === "guest") closeAuthModal();
    if (e.target.classList.contains("modal-tab")) openAuthModal(e.target.dataset.tab);
});

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.classList.add("hidden");
    try {
        if (authMode === "register") {
            await registerUser(authUsername.value, authPassword.value);
            await loginUser(authUsername.value, authPassword.value);
            showToast("Account created — logged in");
        } else {
            await loginUser(authUsername.value, authPassword.value);
            showToast(`Welcome back, ${authUsername.value}`);
        }
        refreshUserMenu();
        closeAuthModal();
    } catch (err) {
        authError.textContent = err.message || "Authentication failed.";
        authError.classList.remove("hidden");
    }
});

importFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const n = await importFromFile(file);
        showToast(`Imported ${n} record(s)`);
    } catch (err) {
        showToast(err.message || "Import failed", "error");
    }
    importFileInput.value = "";
});

/* ===== History modal ===== */
async function openHistoryModal() {
    historyModal.classList.remove("hidden");
    historyListEl.innerHTML = '<p class="muted">Loading…</p>';
    const records = await listRecords();
    if (!records.length) {
        historyListEl.innerHTML = '<p class="muted">No saved runs yet. Run a full analysis while logged in.</p>';
        return;
    }
    historyListEl.innerHTML = records
        .map((r) => {
            const date = new Date(r.timestamp).toLocaleString();
            const cost = r.summary?.totalCost?.toFixed(2) ?? "—";
            const energy = r.summary?.totalEnergy?.toFixed(1) ?? "—";
            const sev = r.severity || "—";
            return `<div class="history-item">
                <div>
                    <strong>$${cost}/mo · ${energy} kWh · ${sev}</strong>
                    <div class="meta">${date}</div>
                </div>
                <button data-action="delete-record" data-id="${r.id}" type="button">Delete</button>
            </div>`;
        })
        .join("");
}

historyModal.addEventListener("click", async (e) => {
    if (e.target === historyModal) historyModal.classList.add("hidden");
    if (e.target.dataset.action === "close-history") historyModal.classList.add("hidden");
    if (e.target.dataset.action === "delete-record") {
        await deleteRecord(Number(e.target.dataset.id));
        openHistoryModal();
    }
});

refreshUserMenu();

/* ===== Chat widget ===== */
const chatToggle = document.getElementById("chatToggle");
const chatPanel = document.getElementById("chatPanel");
const chatClose = document.getElementById("chatClose");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatHistory = [];

function appendChatMessage(role, text, opts = {}) {
    const el = document.createElement("div");
    el.className = `chat-msg chat-msg-${role}${opts.loading ? " chat-msg-loading" : ""}`;
    el.textContent = text;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
}

chatToggle.addEventListener("click", () => {
    chatPanel.classList.toggle("hidden");
    if (!chatPanel.classList.contains("hidden")) chatInput.focus();
});
chatClose.addEventListener("click", () => chatPanel.classList.add("hidden"));

// Image attachment state
const chatFileInput = document.getElementById("chatFileInput");
const chatAttachPreview = document.getElementById("chatAttachPreview");
const chatAttachThumb = document.getElementById("chatAttachThumb");
const chatAttachName = document.getElementById("chatAttachName");
const chatAttachRemove = document.getElementById("chatAttachRemove");
let pendingImageDataUrl = null;
let pendingImageName = null;

function clearChatAttachment() {
    pendingImageDataUrl = null;
    pendingImageName = null;
    chatFileInput.value = "";
    chatAttachPreview.classList.add("hidden");
}

function compressImage(file, maxDim = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                const scale = Math.min(1, maxDim / Math.max(width, height));
                width = Math.max(1, Math.round(width * scale));
                height = Math.max(1, Math.round(height * scale));
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = () => reject(new Error("Failed to decode image"));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

chatFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        showToast("Please pick an image file", "error");
        chatFileInput.value = "";
        return;
    }
    try {
        const dataUrl = await compressImage(file);
        pendingImageDataUrl = dataUrl;
        pendingImageName = file.name;
        chatAttachThumb.src = dataUrl;
        chatAttachName.textContent = file.name;
        chatAttachPreview.classList.remove("hidden");
    } catch (err) {
        showToast(err.message || "Could not load image", "error");
        clearChatAttachment();
    }
});

chatAttachRemove.addEventListener("click", clearChatAttachment);

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text && !pendingImageDataUrl) return;

    const imageDataUrl = pendingImageDataUrl;
    const imageName = pendingImageName;
    chatInput.value = "";
    clearChatAttachment();

    // Render the user message (text + image thumbnail if any)
    const userEl = document.createElement("div");
    userEl.className = "chat-msg chat-msg-user";
    userEl.textContent = text || "(image)";
    if (imageDataUrl) {
        const im = document.createElement("img");
        im.className = "chat-msg-image";
        im.src = imageDataUrl;
        im.alt = imageName || "attached image";
        userEl.appendChild(im);
    }
    chatMessages.appendChild(userEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // For history we keep a short text-only stub (avoid resending large images each turn)
    chatHistory.push({
        role: "user",
        content: imageDataUrl ? `${text || "(analyse attached bill)"} [user attached an image]` : text,
    });

    const loading = appendChatMessage("bot", "Thinking…", { loading: true });
    try {
        const reply = await chatReply({
            history: chatHistory.slice(0, -1),
            userMessage: text || "Please analyse this electricity bill image.",
            summary: latestSummary,
            period: currentPeriod,
            imageDataUrl,
        });
        loading.remove();
        appendChatMessage("bot", reply);
        chatHistory.push({ role: "assistant", content: reply });
    } catch (err) {
        loading.remove();
        appendChatMessage("bot", `Sorry — chat is unavailable right now. (${err.message || "error"})`);
    }
});

// ===== Four-corner resize for chat panel =====
(function setupChatResize() {
    const handles = chatPanel.querySelectorAll(".chat-resize");
    handles.forEach((handle) => {
        handle.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const dir = handle.dataset.resize;
            const startX = e.clientX;
            const startY = e.clientY;
            const rect = chatPanel.getBoundingClientRect();
            const startLeft = rect.left;
            const startTop = rect.top;
            const startW = rect.width;
            const startH = rect.height;

            // Switch to left/top positioning so resize math is simple.
            chatPanel.style.left = startLeft + "px";
            chatPanel.style.top = startTop + "px";
            chatPanel.style.right = "auto";
            chatPanel.style.bottom = "auto";

            const MIN_W = 280;
            const MIN_H = 320;
            const MAX_W = window.innerWidth - 16;
            const MAX_H = window.innerHeight - 16;

            function onMove(ev) {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                let newW = startW;
                let newH = startH;
                let newL = startLeft;
                let newT = startTop;

                if (dir.includes("r")) {
                    newW = Math.max(MIN_W, Math.min(MAX_W, startW + dx));
                }
                if (dir.includes("l")) {
                    newW = Math.max(MIN_W, Math.min(MAX_W, startW - dx));
                    newL = startLeft + (startW - newW);
                }
                if (dir.includes("b")) {
                    newH = Math.max(MIN_H, Math.min(MAX_H, startH + dy));
                }
                if (dir.includes("t")) {
                    newH = Math.max(MIN_H, Math.min(MAX_H, startH - dy));
                    newT = startTop + (startH - newH);
                }

                chatPanel.style.width = newW + "px";
                chatPanel.style.height = newH + "px";
                chatPanel.style.left = Math.max(8, newL) + "px";
                chatPanel.style.top = Math.max(8, newT) + "px";
            }

            function onUp() {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                document.body.style.userSelect = "";
                document.body.style.cursor = "";
            }

            document.body.style.userSelect = "none";
            document.body.style.cursor = handle.style.cursor || "default";
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
    });
})();
