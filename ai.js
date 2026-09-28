// OpenAI integration.
// NOTE: This API key is exposed in the client — only acceptable for the course demo.
// Rotate the key after the assignment.

// SECURITY NOTE:
// No API key is stored in this public portfolio build.
// The original course demo used a client-side key; that credential has been removed.
// AI-assisted insight/chat features therefore fall back gracefully in this static deployment.
const OPENAI_API_KEY = "";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-5.4-mini";

async function chat(messages, { maxTokens = 600 } = {}) {
    if (!OPENAI_API_KEY) {
        throw new Error("AI demo disabled in the public portfolio build for security.");
    }
    const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_completion_tokens: maxTokens,
        }),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
}

function summaryForPrompt(summary, factor = 1) {
    return {
        costAUD: Number((summary.totalCost * factor).toFixed(2)),
        energyKwh: Number((summary.totalEnergy * factor).toFixed(1)),
        peakSharePct: Math.round(summary.peakShare),
        comfortScore: summary.comfort,
        impactLevel: summary.impact,
        offPeakCostAUD: Number((summary.offPeakCost * factor).toFixed(2)),
        shoulderCostAUD: Number((summary.shoulderCost * factor).toFixed(2)),
        peakCostAUD: Number((summary.peakCost * factor).toFixed(2)),
        appliances: summary.calculated.map((c) => ({
            name: c.appliance.name,
            powerW: c.appliance.power,
            daysPerWeek: c.appliance.days,
            start: c.appliance.start,
            end: c.appliance.end,
            energyKwh: Number((c.calc.monthlyKwh * factor).toFixed(1)),
            costAUD: Number((c.calc.monthlyCost * factor).toFixed(2)),
            peakSharePct: Math.round(c.calc.peakRatio * 100),
        })),
    };
}

async function generateInsight({
    currentSummary,
    improvedSummary,
    severity,
    monthlySavings,
    period = "month",
    score = null,
}) {
    const factor = period === "quarter" ? 3 : 1;
    const unitWord = period === "quarter" ? "quarter" : "month";
    const sysPrompt = `You are an energy-coach assistant for a household electricity simulator.
The user has three tariff bands: Off-peak $0.18/kWh (10pm–7am), Shoulder $0.28/kWh (7am–4pm & 9pm–10pm), Peak $0.45/kWh (4pm–9pm).

Unit convention (read carefully):
- All numeric figures in this prompt are PER MONTH (canonical baseline).
- The severity score and all per-dimension scores were also computed from those PER-MONTH figures. Severity thresholds are period-independent.
- The user is currently viewing the dashboard in ${unitWord.toUpperCase()} mode (period multiplier = ${factor}). When you write cost or energy figures in your response, multiply the monthly values below by ${factor} and label them "per ${unitWord}".

Severity has already been decided by the app rules using a weighted composite score (0–100, higher = worse) across four dimensions: cost (35%), peak share (30%), energy (20%), comfort (15%). The dimension that contributes the most points is the BIGGEST problem to address. Do NOT override the severity. Tailor tone to the severity, and when possible call out the top-contributing dimension(s) in your advice.

REALISTIC SCHEDULING RULES (very important — never violate these):
- Cooking appliances (cooktop, rice cooker, oven, microwave, kettle, toaster, stove): meal-bound. NEVER suggest moving them to late-night / overnight hours. If they fall in peak, accept that some peak cost is unavoidable and recommend reducing duration, switching method, or eating slightly earlier (before 16:00) — NOT shifting to 22:00+.
- Air conditioner: this is usually the single biggest cost driver, so a meaningful saving requires reducing total AC load — not just retiming. ACTIVELY recommend: (a) using a ceiling/pedestal fan together with the AC and raising the thermostat by 1–3°C (a fan typically draws 30–80 W vs. an AC at 1000–2000 W, so this saves serious money), (b) shortening AC runtime by 1–2 hours (turn off 30–60 min before sleep, or only cool the bedroom in the last hour), (c) using fan only on mild evenings without running the AC at all, (d) starting AC slightly later in the evening (e.g. 19:00 instead of 17:00) if the user is not home earlier. Do NOT suggest moving AC to overnight in a way that contradicts the user's bedtime.
- Lighting: tied to dark hours. Never suggest moving it.
- Refrigerator: must run 24/7 for food safety. Never suggest moving or shortening.
- TV / entertainment: tied to user's evening routine. Do not suggest moving to overnight hours.
- Only these classes of appliances are safe to recommend shifting to off-peak (after 22:00 or before 07:00): washing machine, dishwasher, dryer, EV charger, pool pump, irrigation, robot vacuum. These can run unattended.
- If the user's biggest problem is a non-shiftable appliance, give advice about REDUCING usage (shorter, less frequent, more efficient setting) rather than retiming.

Return ONLY valid JSON matching this schema:
{
  "title": string (short, <=50 chars),
  "badge": "Good" | "Review" | "Warning",
  "summary": string (1-2 sentences, plain English, no markdown),
  "bullets": [string, string, string, string]  // four short action-oriented points, each <=120 chars, prefixed by "Economic:", "Environmental:", "Design insight:", "Action:" respectively
}`;

    const scoreBlock = score
        ? `Composite severity score: ${score.composite.toFixed(1)} / 100  (computed from MONTHLY baseline figures)
Per-dimension scores (0=fine, 100=worst):
  cost     ${score.breakdown.cost.toFixed(0)}  (weight 35%)
  peak     ${score.breakdown.peak.toFixed(0)}  (weight 30%)
  energy   ${score.breakdown.energy.toFixed(0)}  (weight 20%)
  comfort  ${score.breakdown.comfort.toFixed(0)}  (weight 15%)
`
        : "";

    const userPrompt = `Severity: ${severity}
${scoreBlock}User-facing display mode: ${unitWord} (multiply monthly figures below by ${factor} when speaking to the user; label them "per ${unitWord}").
Estimated monthly savings (raw): A$${monthlySavings.toFixed(2)}  →  present to user as A$${(monthlySavings * factor).toFixed(2)} per ${unitWord}

Current plan summary (ALL VALUES PER MONTH):
${JSON.stringify(summaryForPrompt(currentSummary, 1), null, 2)}

Suggested plan summary (ALL VALUES PER MONTH):
${JSON.stringify(summaryForPrompt(improvedSummary, 1), null, 2)}

Reminder: numbers above are MONTHLY. In your written response, present them as per-${unitWord} by multiplying by ${factor}.
Respond with the JSON only.`;

    const raw = await chat(
        [
            { role: "system", content: sysPrompt },
            { role: "user", content: userPrompt },
        ],
        { maxTokens: 700 },
    );

    const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    const cleaned =
        start >= 0 && end > start ? jsonText.slice(start, end + 1) : jsonText;
    return JSON.parse(cleaned);
}

async function chatReply({
    history,
    userMessage,
    summary,
    period = "month",
    imageDataUrl = null,
}) {
    const factor = period === "quarter" ? 3 : 1;
    const unit = period === "quarter" ? "quarter" : "month";
    const sysPrompt = `You are a friendly energy-coach chatbot inside a household electricity simulator.
Tariffs: Off-peak $0.18/kWh (10pm–7am), Shoulder $0.28/kWh (7am–4pm & 9pm–10pm), Peak $0.45/kWh (4pm–9pm).

Unit convention:
- All numeric figures in the snapshot below are PER MONTH (canonical baseline).
- The user is currently viewing the dashboard in ${unit.toUpperCase()} mode (period multiplier = ${factor}).
- When you write cost or kWh figures in your reply, multiply the monthly values by ${factor} and label them "per ${unit}".

Be concise (under 150 words), use plain language, and give concrete scheduling advice when relevant.

REALISTIC SCHEDULING RULES (never violate):
- Cooking (cooktop, rice cooker, oven, microwave, kettle, toaster): meal-bound. Never tell users to cook at 22:00+ or in the middle of the night. If cooking falls in peak, suggest reducing time / eating earlier / using a more efficient method instead.
- Lighting, refrigerator, TV: tied to daily routine, do NOT suggest moving to overnight hours.
- Air conditioner is usually the biggest cost driver, so retiming alone barely moves the bill — focus on REDUCING AC load: (a) pair AC with a ceiling/pedestal fan and raise the thermostat by 1–3°C (a fan uses ~30–80 W vs. AC ~1000–2000 W, so this saves real money); (b) shorten runtime by 1–2 hours (e.g. turn off 30–60 min before bed, cool only the bedroom in the last hour); (c) use fan only on mild evenings without AC; (d) start AC later in the evening if the user is not home. Do NOT suggest moving AC overnight.
- Only washing machine, dishwasher, dryer, EV charger, pool pump, irrigation, robot vacuum are safe to recommend shifting to off-peak overnight slots.
- For appliances that can't shift, give advice on REDUCING (shorter, fewer times, more efficient setting) rather than retiming.

If the user attaches an electricity bill image, extract the key figures you can read (total kWh, total cost, billing period, peak vs off-peak breakdown if visible). Note that the bill itself may cover a different period (e.g. monthly, bi-monthly, quarterly) — read what the bill says and convert to per-${unit} when comparing with the snapshot. If the image is unclear or not a bill, say so politely.`;

    const context = summary
        ? `Current simulation snapshot (ALL VALUES PER MONTH; multiply by ${factor} when presenting to user as per-${unit}):\n${JSON.stringify(summaryForPrompt(summary, 1), null, 2)}`
        : "No simulation has been run yet.";

    const userContent = imageDataUrl
        ? [
              { type: "text", text: userMessage || "Please analyse this electricity bill image." },
              { type: "image_url", image_url: { url: imageDataUrl } },
          ]
        : userMessage;

    const messages = [
        { role: "system", content: sysPrompt },
        { role: "system", content: context },
        ...history,
        { role: "user", content: userContent },
    ];

    return chat(messages, { maxTokens: 600 });
}
