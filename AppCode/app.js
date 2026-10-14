// Hydrometrics Heart Coach app logic
const $ = (id) => document.getElementById(id);

// ---------- mascot drawings (4 poses) ----------
const POSES = {
  normal: "images/droplet_normal.png",
  jump: "images/droplet_jump.png",
  thumbs: "images/droplet_thumbs.png",
  wink: "images/droplet_wink.png",
};
document.querySelectorAll(".dew .pose").forEach((img) => {
  const k = [...img.classList].find((c) => c.startsWith("p-")).slice(2);
  img.src = POSES[k === "wink" ? "wink" : k];
});
function act(pose, ms = 1800, el = $("dew")) {
  el.dataset.act = pose;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    delete el.dataset.act;
  }, ms);
}

// ---------- time-of-day scene ----------
const SCENES = {
  morning: {
    label: "☀ Morning",
    demoHour: 8,
    v: [
      "#9FD3EE",
      "#FDE4CF",
      "#FFCF73",
      "#BFDCCB",
      "#93C8A9",
      "#A3D3EA",
      "#A9D6B5",
      "rgba(255,255,255,.9)",
      0,
    ],
  },
  day: {
    label: "☀ Daytime",
    demoHour: 13,
    v: [
      "#6DB9E6",
      "#D6EFFB",
      "#FFE27D",
      "#A9D7BF",
      "#7FBF9B",
      "#7FC3E6",
      "#95CEA7",
      "rgba(255,255,255,.95)",
      0,
    ],
  },
  evening: {
    label: "☀ Sunset",
    demoHour: 18.4,
    v: [
      "#8B8FD0",
      "#F7B98F",
      "#FF9A66",
      "#B79DBA",
      "#8E80A8",
      "#C89DB4",
      "#9DA6BF",
      "rgba(255,226,214,.85)",
      0.35,
    ],
  },
  night: {
    label: "☾ Night",
    demoHour: 23,
    v: [
      "#18213F",
      "#3A4A7C",
      "#F3EFD8",
      "#2D3D5E",
      "#22304D",
      "#2C4470",
      "#2A3956",
      "rgba(170,185,220,.25)",
      1,
    ],
  },
};
const SVARS = [
  "--sky-top",
  "--sky-bot",
  "--sun",
  "--hill-far",
  "--hill-near",
  "--water",
  "--ground",
  "--cloud",
  "--star-op",
];
let sceneMode = "auto",
  sceneHour = new Date().getHours();
try {
  sceneMode = localStorage.getItem("hmScene") || "auto";
} catch (e) {}
const phaseOf = (h) =>
  h < 5 || h >= 20 ? "night" : h < 11 ? "morning" : h < 17 ? "day" : "evening";
(function makeStars() {
  let s = "";
  for (let i = 0; i < 34; i++) {
    const x = ((i * 97) % 400) + (i % 3) * 5,
      y = ((i * 53) % 150) + 8,
      r = i % 5 === 0 ? 1.8 : 1.1;
    s += `<circle class="s-star${i % 3 === 0 ? " tw" : ""}" cx="${x}" cy="${y}" r="${r}" style="animation-delay:${(i % 7) * 0.4}s"/>`;
  }
  $("stars").innerHTML = s;
})();
function applyScene() {
  const now = new Date();
  let h = now.getHours() + now.getMinutes() / 60,
    ph;
  if (sceneMode === "auto") ph = phaseOf(h);
  else {
    ph = sceneMode;
    h = SCENES[ph].demoHour;
  }
  sceneHour = h;
  const sc = $("scene");
  SCENES[ph].v.forEach((val, i) => sc.style.setProperty(SVARS[i], val));
  const isDay = h >= 6 && h < 19;
  const t = isDay ? (h - 6) / 13 : ((h - 19 + 24) % 24) / 11;
  const x = 40 + 320 * t,
    y = 178 - 38 * Math.sin(Math.PI * t); // low arc so the speech bubble never covers it
  $("sunG").setAttribute("transform", `translate(${x} ${y})`);
  $("moonG").setAttribute("transform", `translate(${x} ${y})`);
  $("sunG").style.display = isDay ? "" : "none";
  $("moonG").style.display = isDay ? "none" : "";
  sc.dataset.phase = ph;
}
const lateNight = () => sceneHour >= 22 || sceneHour < 5;
applyScene();
setInterval(applyScene, 60000);

// ---------- workout types ----------
const TYPES = {
  walk: {
    name: "Walk",
    short: "walk",
    plural: "walks",
    verb: "walking",
    target: 102,
    color: "var(--z2)",
  },
  jog: {
    name: "Jog",
    short: "jog",
    plural: "jogs",
    verb: "jogging",
    target: 150,
    color: "var(--z3)",
  },
  cycle: {
    name: "Bike ride",
    short: "ride",
    plural: "bike rides",
    verb: "cycling",
    target: 132,
    color: "var(--z3)",
  },
  stretch: {
    name: "Stretch & yoga",
    short: "stretch",
    plural: "stretch sessions",
    verb: "stretching",
    target: 84,
    color: "var(--z1)",
  },
  hiit: {
    name: "HIIT",
    short: "HIIT",
    plural: "HIIT sessions",
    verb: "HIIT",
    target: 168,
    color: "var(--z4)",
  },
};
// Example history so the suggestions have something to learn from (daysAgo 0 = today)
const EXAMPLE = [
  { daysAgo: 1, type: "jog", min: 25, avg: 150, vig: 12 },
  { daysAgo: 2, type: "walk", min: 30, avg: 104, vig: 0 },
  { daysAgo: 4, type: "walk", min: 30, avg: 106, vig: 0 },
  { daysAgo: 5, type: "walk", min: 25, avg: 109, vig: 0 },
  { daysAgo: 8, type: "walk", min: 20, avg: 112, vig: 0 },
  { daysAgo: 9, type: "stretch", min: 15, avg: 80, vig: 0 },
];
let history = EXAMPLE.map((s) => ({ ...s, example: true }));

// ---------- profile from the setup questions ----------
let profile = null;
try {
  profile = JSON.parse(localStorage.getItem("hmProfile") || "null");
} catch (e) {}
const L = {
  activity: {
    sitting: "Mostly sitting",
    light: "A little active",
    active: "Pretty active",
    very: "Very active",
  },
  health: {
    heart: "a heart condition",
    bp: "high blood pressure",
    asthma: "asthma",
    diabetes: "diabetes",
    pregnant: "pregnancy",
    joints: "joint pain or injury",
  },
  goals: {
    move: "Move more every day",
    endurance: "Build endurance",
    stress: "Feel less stressed",
    energy: "Have more energy",
    recover: "Recover better",
    habit: "Build a healthy habit",
  },
  time: {
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    any: "whenever it fits",
  },
  style: {
    gentle: "Gentle & calm",
    bubbly: "Bright & bubbly",
    coach: "Coach mode",
  },
};
const styleLines = {
  gentle: {
    0: ["Breathe easy."],
    1: ["Nice and gentle."],
    2: ["Lovely pace."],
    3: ["Slow down anytime."],
  },
  bubbly: {
    0: ["So calm!"],
    1: ["Splish splash!"],
    2: ["Woohoo!"],
    3: ["Unstoppable!"],
  },
  coach: {
    0: ["Rest up."],
    1: ["Good start."],
    2: ["Hold this pace."],
    3: ["Push through!"],
  },
};
const goalTips = {
  move: "Every step counts!",
  endurance: "Stamina is building!",
  stress: "Breathe with me?",
  energy: "Move for energy!",
  recover: "Rest makes you stronger.",
  habit: "Same time, every day!",
};
const cautionList = (p) =>
  (p?.health || []).filter((h) => h !== "none").map((h) => L.health[h]);

// ---------- adaptive suggestion rules ----------
function suggest() {
  const s = baseSuggest(),
    p = profile;
  if (!p) return s;
  const careful = cautionList(p).length > 0;
  const allowed = (k) => !careful || (k !== "jog" && k !== "hiit");
  const likes = p.likes?.length ? p.likes : Object.keys(TYPES);
  const near = {
    stretch: ["stretch", "walk"],
    walk: ["walk", "cycle", "stretch"],
    cycle: ["cycle", "walk", "jog"],
    jog: ["jog", "cycle", "walk"],
    hiit: ["hiit", "jog", "cycle"],
  };
  let t = s.type,
    note = "";
  if (!likes.includes(t) || !allowed(t)) {
    const alt =
      near[t].find((k) => likes.includes(k) && allowed(k)) ||
      likes.find(allowed) ||
      "walk";
    if (alt !== t) {
      s.title = s.title.replace(TYPES[t].short, TYPES[alt].short);
      t = alt;
    }
  }
  if (p.activity === "sitting") s.min = Math.min(s.min, 20);
  if (careful) note = " Keep a comfy, talking pace.";
  return { ...s, type: t, why: s.why + note };
}
function baseSuggest() {
  const h = [...history].sort((a, b) => a.daysAgo - b.daysAgo);
  if (!h.length)
    return {
      type: "walk",
      min: 15,
      title: "Your first walk",
      why: "A short walk is the perfect first step.",
    };
  const last = h[0],
    gap = last.daysAgo;
  const when = gap === 0 ? "today" : "yesterday";
  if (gap >= 3)
    return {
      type: "walk",
      min: 15,
      title: "Easy comeback walk",
      why: "Welcome back! Let's ease in.",
    };
  if (gap <= 1 && last.vig >= 10) {
    const t = last.type === "stretch" ? "walk" : "stretch";
    return {
      type: t,
      min: 20,
      title: "Recovery day",
      why: `Your ${TYPES[last.type].short} ${when} was tough. Time to recover!`,
    };
  }
  const week = h.filter((s) => s.daysAgo < 7),
    counts = {};
  week.forEach((s) => (counts[s.type] = (counts[s.type] || 0) + 1));
  const fav =
    Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || last.type;
  const favS = week.filter((s) => s.type === fav);
  const avgMin = Math.max(
    10,
    Math.round(
      favS.reduce((a, s) => a + s.min, 0) / Math.max(1, favS.length) / 5,
    ) * 5,
  );
  if (favS.length >= 3)
    return {
      type: fav,
      min: avgMin + 5,
      title: `Level-up ${TYPES[fav].short}`,
      why: `${favS.length} ${TYPES[fav].plural} this week. Ready for ${avgMin + 5} min?`,
    };
  return {
    type: fav,
    min: avgMin,
    title: `Keep your ${TYPES[fav].short} rhythm`,
    why: "Keep your momentum going!",
  };
}
function improvement() {
  const w = history
    .filter((s) => s.type === "walk")
    .sort((a, b) => b.daysAgo - a.daysAgo);
  if (w.length < 2) return null;
  const d = w[0].avg - w[w.length - 1].avg;
  return d >= 4
    ? `Walking heart rate down ${d} BPM. You're getting fitter!`
    : null;
}

// ---------- live state ----------
let source = "demo",
  hr = 70,
  target = 70,
  series = [];
let session = null,
  lastSummary = null,
  pick = null;
let celebrateUntil = 0,
  userMood = null,
  lastSayAt = 0,
  lastZone = -1,
  highStreak = 0;
const maxHR = () => 220 - (+$("age").value || 21);
$("age").addEventListener("input", () => {
  zoneInfo();
});
const zoneOf = (b) => {
  const p = b / maxHR();
  return p < 0.5 ? 0 : p < 0.64 ? 1 : p < 0.77 ? 2 : 3;
};
const zoneNames = ["Resting", "Light activity", "Moderate", "Vigorous"];

const hour = new Date().getHours();
function greet() {
  const base =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("greet").textContent = profile?.name
    ? `${base}, ${profile.name}!`
    : `${base}!`;
}
greet();

// ---------- Dew's words ----------
const lines = {
  0: ["Nice and steady.", "Calm heart!", "Resting counts too!"],
  1: ["You're moving!", "Keep it flowing!", "Proud of you!"],
  2: ["Sweet spot!", "Strong and steady!", "Look at you go!"],
  3: ["Big effort!", "So much power!", "Remember to breathe!"],
};
// longer messages, mixed in now and then
const mix = (short, long, p = 0.3) => (Math.random() < p ? long : short);
const longLines = {
  0: [
    "Nice and steady. Your body is recovering well.",
    "Resting counts too! You're taking good care of yourself.",
  ],
  1: [
    "You're moving! That's the hardest part, and you did it.",
    "Every minute here adds up. I'm proud of you!",
  ],
  2: [
    "This is the sweet spot! You're building endurance right now.",
    "Strong and steady. Your heart is getting fitter!",
  ],
  3: [
    "Wow, big effort! Be proud of yourself.",
    "You're pushing hard! Ease off whenever you need.",
  ],
};
const longTips = {
  move: "Even a 5-minute walk counts toward moving more!",
  endurance: "Endurance grows a little with every steady workout.",
  stress: "Slow breaths can lower your heart rate. Try 4 with me?",
  energy: "Moving a little often gives you more energy than you'd think.",
  recover: "Rest days are when your body gets stronger.",
  habit: "Moving at the same time each day helps a habit stick.",
};
const longReplies = {
  Energized: "Love that energy! A great day to get moving.",
  Calm: "Calm is a lovely place to be. Your heart thanks you.",
  Tired:
    "Thanks for being honest. A gentle stretch or rest are both great today.",
  Stressed: "That's okay. Try 4 slow breaths and watch your heart rate settle.",
};
const pickLineShort = (z) => {
  const pool = lines[z].concat(profile ? styleLines[profile.style][z] : []);
  return pool[Math.floor(Math.random() * pool.length)];
};
const pickLine = (z) =>
  mix(
    pickLineShort(z),
    longLines[z][Math.floor(Math.random() * longLines[z].length)],
    0.25,
  );
function endLine(min, verb) {
  if (Math.random() < 0.35)
    return `Amazing! ${min} minutes of ${verb} done. I updated your next pick!`;
  const st = profile?.style || "bubbly";
  if (st === "gentle") return "Well done. Rest up!";
  if (st === "coach") return `${min} min done. Nice work.`;
  return `${min} minutes! Amazing!`;
}
function say(t) {
  $("bubble").textContent = t;
  lastSayAt = Date.now();
}
function setMood(z) {
  let m = "happy";
  if (Date.now() < celebrateUntil) m = "excited";
  else if (session) m = z >= 2 ? "excited" : "happy";
  else if (userMood === "Tired") m = "sleepy";
  else if (userMood === "Calm" || userMood === "Stressed") m = "calm";
  else if (lateNight()) m = "sleepy";
  $("dew").dataset.mood = m;
}

// ---------- every reading (demo or Bluetooth) ----------
function onReading(b) {
  hr = b;
  series.push(b);
  if (series.length > 60) series.shift();
  const z = zoneOf(b);
  $("bpm").textContent = b;
  $("zoneText").textContent = zoneNames[z];
  $("zoneDot").style.background = `var(--z${z + 1})`;
  const mh = $("miniHeart");
  mh.classList.remove("beat");
  void mh.getBoundingClientRect();
  mh.classList.add("beat");

  if (session) {
    session.secs++;
    session.samples.push(b);
    session.z[z]++;
    $("timer").textContent =
      source === "demo" ? `${session.secs} min` : fmt(session.secs);
    if (z !== lastZone || Date.now() - lastSayAt > 8000) say(pickLine(z));
    renderStats(session.samples, session.z);
  }
  lastZone = z;

  const low = b < 40 && !session;
  highStreak = b >= maxHR() ? highStreak + 1 : 0;
  if (low)
    notice(
      "Your reading is lower than usual. Check that the sensor is snug. If you feel dizzy or unwell, it's worth talking to a doctor.",
    );
  else if (highStreak >= 10)
    notice(
      "You've been at your estimated max for a while. Slow down and let your heart settle. If you feel chest pain or lightheaded, stop and get help.",
    );
  else $("notice").hidden = true;

  setMood(z);
  draw();
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function notice(t) {
  $("noticeText").textContent = t;
  $("notice").hidden = false;
}

// ---------- sessions ----------
let chosen = "walk";
$("typePick").innerHTML = Object.entries(TYPES)
  .map(([k, t]) => `<button data-t="${k}">${t.name}</button>`)
  .join("");
function choose(k) {
  chosen = k;
  document
    .querySelectorAll("#typePick button")
    .forEach((b) => b.classList.toggle("on", b.dataset.t === k));
  if (!session) $("sessTitle").textContent = TYPES[k].name;
}
document.querySelectorAll("#typePick button").forEach((b) =>
  b.addEventListener("click", () => {
    if (!session) choose(b.dataset.t);
  }),
);

function startSession(type) {
  choose(type);
  session = { type, secs: 0, samples: [], z: [0, 0, 0, 0] };
  target = TYPES[type].target;
  $("sessLabel").textContent = "In progress";
  $("sessTitle").textContent = TYPES[type].name;
  $("statLabel").textContent = "This workout";
  $("timer").textContent = source === "demo" ? "0 min" : "0:00";
  $("sessBtn").textContent = "Finish workout";
  $("sessBtn").classList.add("stop");
  say(
    mix(
      "Let's do this!",
      `${TYPES[type].name} time! I'll cheer you on the whole way.`,
    ),
  );
  act("thumbs", 1600);
}
function endSession() {
  const s = session;
  session = null;
  target = 70;
  $("sessBtn").textContent = "Start workout";
  $("sessBtn").classList.remove("stop");
  $("sessLabel").textContent = "Ready when you are";
  $("timer").textContent = source === "demo" ? "0 min" : "0:00";
  if (s.samples.length < 3) {
    say("No worries!");
    return;
  }
  const min = source === "demo" ? s.secs : Math.max(1, Math.round(s.secs / 60));
  const vig = source === "demo" ? s.z[3] : Math.round(s.z[3] / 60);
  const avg = Math.round(
    s.samples.reduce((a, b) => a + b, 0) / s.samples.length,
  );
  history.push({ daysAgo: 0, type: s.type, min, avg, vig, fresh: true });
  $("statLabel").textContent = "Last workout";
  celebrateUntil = Date.now() + 6000;
  say(endLine(min, TYPES[s.type].verb));
  act("thumbs", 2200);
  renderAll();
}
$("sessBtn").addEventListener("click", () =>
  session ? endSession() : startSession(chosen),
);
$("easeBtn").addEventListener("click", () => {
  target = Math.max(60, target - 15);
});
$("pushBtn").addEventListener("click", () => {
  target = Math.min(195, target + 15);
});
$("pickStart").addEventListener("click", () => {
  if (session) endSession();
  startSession(pick.type);
  showPage("workouts");
});

// ---------- rendering ----------
function renderStats(samples, z) {
  $("avg").textContent = Math.round(
    samples.reduce((a, b) => a + b, 0) / samples.length,
  );
  $("low").textContent = Math.min(...samples);
  $("high").textContent = Math.max(...samples);
  const tot = z.reduce((a, b) => a + b, 0) || 1;
  $("zbar").innerHTML = z
    .map(
      (t, i) =>
        `<div style="width:${(t / tot) * 100}%;background:var(--z${i + 1})"></div>`,
    )
    .join("");
}
const ago = (d) =>
  d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
const dayLetter = (d) => "SMTWTFS"[new Date(Date.now() - d * 864e5).getDay()];

function renderAll() {
  pick = suggest();
  const doneToday = history.some((s) => s.daysAgo === 0);
  $("pickLabel").textContent = doneToday
    ? "Up next for you"
    : "Today's pick for you";
  $("pickMin").textContent = pick.min;
  $("pickTitle").textContent = pick.title;
  $("pickMeta").textContent = TYPES[pick.type].name;
  $("pickWhy").textContent = pick.why;
  const imp = improvement();
  $("pickBonus").hidden = !imp;
  if (imp) $("pickBonus").textContent = "✦ " + imp;

  const h = [...history].sort((a, b) => a.daysAgo - b.daysAgo);
  $("hist").innerHTML = h
    .map(
      (
        s,
      ) => `<li><span class="ic" style="background:${TYPES[s.type].color}">${TYPES[s.type].name[0]}</span>
    <span class="tx"><b>${TYPES[s.type].name}</b><span>${ago(s.daysAgo)} · ${s.min} min · avg ${s.avg} BPM</span></span>
    ${s.fresh ? '<span class="tag new">New</span>' : s.example ? '<span class="tag">Example</span>' : ""}</li>`,
    )
    .join("");

  const week = [];
  for (let d = 6; d >= 0; d--)
    week.push({
      d,
      min: history
        .filter((s) => s.daysAgo === d)
        .reduce((a, s) => a + s.min, 0),
    });
  const count = week.filter((w) => w.min > 0).length;
  $("week").innerHTML = week
    .map(
      (w) =>
        `<div class="day ${w.min ? "done" : ""} ${w.d === 0 ? "today" : ""}"><div>${w.min ? "♥" : ""}</div>${dayLetter(w.d)}</div>`,
    )
    .join("");
  const goalDays = profile?.days || 5;
  $("weekNote").textContent =
    count >= goalDays
      ? `${count} active days. You hit your ${goalDays}-day goal, amazing!`
      : `${count} of your ${goalDays} active days so far. Rest days never break your streak.`;
  $("goalChips").innerHTML = (profile?.goals?.length ? profile.goals : ["move"])
    .map((g) => `<span class="goalchip">${L.goals[g]}</span>`)
    .join("");
  const peak = Math.max(40, ...week.map((w) => w.min));
  $("bars").innerHTML = week
    .map(
      (w) =>
        `<div class="bar"><b>${w.min || ""}</b><i class="${w.min ? "" : "zero"}" style="height:${(w.min / peak) * 110}px"></i>${dayLetter(w.d)}</div>`,
    )
    .join("");

  const sum = week.reduce((a, w) => a + w.min, 0);
  const badges = [
    ["First splash", "Finished your first workout", history.length > 0],
    ["Fitter heart", "Your walking heart rate went down", !!imp],
    [
      "Hard worker",
      "10+ vigorous minutes in one workout",
      history.some((s) => s.vig >= 10),
    ],
    [
      "100 minutes",
      "100 active minutes in a week",
      sum >= 100,
      `${sum} of 100 so far`,
    ],
    [
      "Full week",
      `Active ${goalDays} days in a week`,
      count >= goalDays,
      `${count} of ${goalDays} days so far`,
    ],
    [
      "Calm & steady",
      "Try a stretch & yoga session",
      history.some((s) => s.type === "stretch" && s.daysAgo < 7),
      "A gentle one counts",
    ],
  ];
  $("badges").innerHTML = badges
    .map(
      ([t, d, on, hint]) => `<div class="badge ${on ? "" : "locked"}">
    <svg viewBox="0 0 30 36" aria-hidden="true"><path class="bd" d="M15 1C12 7 2 15 2 22a13 13 0 0 0 26 0C28 15 18 7 15 1z"/></svg>
    <div style="min-width:0"><b>${t}</b><span>${on ? d : hint || d}</span></div></div>`,
    )
    .join("");
}

// ---------- chart ----------
const cv = $("chart"),
  ctx = cv.getContext("2d");
function draw() {
  const w = cv.clientWidth,
    h = cv.clientHeight;
  if (!w) return;
  const dpr = devicePixelRatio || 1;
  cv.width = w * dpr;
  cv.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement),
    col = (n) => cs.getPropertyValue(n).trim();
  ctx.clearRect(0, 0, w, h);
  const lo = 40,
    hi = 200,
    padL = 28,
    y = (v) => h - 4 - ((v - lo) / (hi - lo)) * (h - 14);
  ctx.font = "11px Nunito, system-ui";
  ctx.fillStyle = col("--muted");
  ctx.strokeStyle = col("--line");
  ctx.lineWidth = 1;
  [60, 100, 140, 180].forEach((v) => {
    ctx.beginPath();
    ctx.moveTo(padL, y(v));
    ctx.lineTo(w, y(v));
    ctx.stroke();
    ctx.fillText(v, 0, y(v) + 4);
  });
  if (series.length < 2) return;
  const x = (i) => padL + (i / 59) * (w - padL - 8),
    last = series.length - 1;
  const path = () => {
    ctx.beginPath();
    series.forEach((v, i) =>
      i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)),
    );
  };
  path();
  ctx.lineTo(x(last), h);
  ctx.lineTo(x(0), h);
  ctx.closePath();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = col("--calm");
  ctx.fill();
  ctx.globalAlpha = 1;
  path();
  ctx.strokeStyle = col("--calm");
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x(last), y(series[last]), 5, 0, 7);
  ctx.fillStyle = col("--accent");
  ctx.fill();
}
addEventListener("resize", draw);

// ---------- tabs ----------
function showPage(p) {
  document
    .querySelectorAll(".page")
    .forEach((s) => (s.hidden = s.id !== "p-" + p));
  document
    .querySelectorAll(".tabs button")
    .forEach((b) =>
      b.dataset.p === p
        ? b.setAttribute("aria-current", "page")
        : b.removeAttribute("aria-current"),
    );
  scrollTo(0, 0);
  draw();
}
document
  .querySelectorAll(".tabs button")
  .forEach((b) => b.addEventListener("click", () => showPage(b.dataset.p)));

// ---------- demo simulator ----------
let simTimer;
function simulate() {
  hr += (target - hr) * 0.12 + (Math.random() - 0.5) * 4;
  onReading(Math.round(hr));
}
function startSim() {
  clearInterval(simTimer);
  simTimer = setInterval(simulate, 1000);
}

// idle chatter when no workout is running
setInterval(() => {
  if (session || Date.now() - lastSayAt < 12000) return;
  const opts = [
    `${pick.min}-min ${TYPES[pick.type].short} today?`,
    pickLine(zoneOf(hr)),
    "Drink some water!",
  ];
  if (profile)
    profile.goals.forEach((g) => opts.push(mix(goalTips[g], longTips[g], 0.4)));
  if (lateNight())
    opts.push(
      "Bedtime soon?",
      "*yawn*",
      "It's getting late. Good sleep helps your heart recover too.",
    );
  say(opts[Math.floor(Math.random() * opts.length)]);
}, 4000);

// ---------- mood check-in ----------
const replies = {
  Energized: "Love that energy!",
  Calm: "Calm is lovely.",
  Tired: "Rest is okay too.",
  Stressed: "Let's breathe together.",
};
document.querySelectorAll("#mood button").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll("#mood button")
      .forEach((x) => x.classList.toggle("on", x === b));
    userMood = b.textContent;
    $("moodReply").textContent = longReplies[userMood];
    say(mix(replies[userMood], longReplies[userMood], 0.4));
    setMood(zoneOf(hr));
  }),
);

// ---------- Bluetooth (standard Heart Rate Service 0x180D / 0x2A37) ----------
$("connect").addEventListener("click", async () => {
  if (!navigator.bluetooth) {
    $("btHelp").textContent =
      "Bluetooth isn't available here. Download this file and open it in Chrome or Edge on a laptop or Android phone (iPhone browsers don't support Web Bluetooth).";
    return;
  }
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ["heart_rate"] }],
    });
    const server = await device.gatt.connect();
    const ch = await (
      await server.getPrimaryService("heart_rate")
    ).getCharacteristic("heart_rate_measurement");
    await ch.startNotifications();
    clearInterval(simTimer);
    source = "ble";
    series = [];
    $("dot").classList.add("live");
    $("sensorState").textContent = "Connected";
    $("sensorState").classList.add("ok");
    $("statusText").textContent = "Live · " + (device.name || "Sensor");
    $("btHelp").textContent =
      "Connected. Readings are coming from your sensor.";
    $("speedNote").textContent = "Live mode: workout time is real time.";
    say("Connected! Hi, heartbeat!");
    ch.addEventListener("characteristicvaluechanged", (e) => {
      const v = e.target.value,
        flags = v.getUint8(0);
      onReading(flags & 1 ? v.getUint16(1, true) : v.getUint8(1));
    });
    device.addEventListener("gattserverdisconnected", () => {
      $("dot").classList.remove("live");
      $("sensorState").textContent = "Demo mode";
      $("sensorState").classList.remove("ok");
      $("statusText").textContent = "Demo mode";
      source = "demo";
      $("btHelp").textContent =
        "Sensor disconnected. Switched back to demo readings.";
      $("speedNote").textContent =
        "Demo speed: each second counts as one minute, so a short demo shows a full workout.";
      startSim();
    });
  } catch (err) {
    $("btHelp").textContent =
      "Couldn't connect: " +
      err.message +
      ". Make sure the Pi script is running, then try again.";
  }
});

$("resetBtn").addEventListener("click", () => {
  history = EXAMPLE.map((s) => ({ ...s, example: true }));
  renderAll();
  say("Fresh start!");
});

// ---------- tap the mascot ----------
const tapLines = [
  "Hehe, that tickles!",
  "Hi again!",
  "High five!",
  "Splish splash!",
  "You got this!",
];
let tapN = 0;
$("dew").addEventListener("click", () => {
  const pose = tapN % 3 === 2 ? "thumbs" : "wave";
  act(pose, 1800);
  say(tapLines[tapN % tapLines.length]);
  tapN++;
});
$("dew").setAttribute("tabindex", "0");
$("dew").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    $("dew").click();
  }
});

// ---------- mascot name ----------
let buddy = "Dew";
try {
  buddy = localStorage.getItem("buddyName") || "Dew";
} catch (e) {}
function setBuddy(n, announce) {
  buddy = n;
  document.querySelectorAll(".mname").forEach((el) => (el.textContent = n));
  $("dew").setAttribute("aria-label", `${n}, a smiling water droplet`);
  $("buddyName").value = n;
  try {
    localStorage.setItem("buddyName", n);
  } catch (e) {}
  if (announce) {
    $("nameNote").textContent = `Saved! Say hi to ${n}.`;
    say(
      mix(`Call me ${n}!`, `I love it! You can call me ${n} from now on.`, 0.4),
    );
    act("wave", 2400);
    celebrateUntil = Date.now() + 4000;
    setMood(zoneOf(hr));
  }
}
$("nameForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const n = $("buddyName").value.trim();
  if (!n) {
    $("nameNote").textContent = "Type a name first, or tap one of the ideas.";
    return;
  }
  setBuddy(n, true);
});
document
  .querySelectorAll("#nameIdeas button")
  .forEach((b) =>
    b.addEventListener("click", () => setBuddy(b.textContent, true)),
  );

// ---------- start ----------
setBuddy(buddy, false);
choose("walk");
renderAll();
for (let i = 0; i < 40; i++) {
  hr += (70 - hr) * 0.12 + (Math.random() - 0.5) * 4;
  onReading(Math.round(hr));
}
renderStats(series, [series.length, 0, 0, 0]);
$("statLabel").textContent = "Right now";
say(mix(`Hi, I'm ${buddy}!`, `Hi, I'm ${buddy}! ${pick.why}`, 0.4));
act("wave", 2600);
startSim();

// ---------- setup questions ----------
const STEPS = 9;
let step = 0;
const onbDew = $("dew").cloneNode(true);
onbDew.id = "dewOnb";
onbDew.removeAttribute("aria-label");
onbDew.setAttribute("aria-hidden", "true");
$("onbDew").appendChild(onbDew);
const picked = (id) =>
  [...document.querySelectorAll(`#${id} button.on`)].map((b) => b.dataset.v);

document.querySelectorAll(".opts").forEach((g) =>
  g.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (g.dataset.multi) {
      if (b.dataset.v === "none")
        g.querySelectorAll("button").forEach((x) =>
          x.classList.toggle("on", x === b),
        );
      else {
        b.classList.toggle("on");
        g.querySelector('[data-v="none"]')?.classList.remove("on");
      }
    } else
      g.querySelectorAll("button").forEach((x) =>
        x.classList.toggle("on", x === b),
      );
    if (g.id === "oBuddy") $("oBuddyIn").value = "";
    $("onbErr").hidden = true;
  }),
);
$("oBuddyIn").addEventListener("input", () => {
  if ($("oBuddyIn").value.trim())
    document
      .querySelectorAll("#oBuddy button")
      .forEach((x) => x.classList.remove("on"));
});

function collect() {
  return {
    name: $("oName").value.trim(),
    buddy: $("oBuddyIn").value.trim() || picked("oBuddy")[0] || "Dew",
    age: +$("oAge").value || 21,
    activity: picked("oActivity")[0] || "light",
    health: picked("oHealth").length ? picked("oHealth") : ["none"],
    meds: picked("oMeds")[0] || "no",
    goals: picked("oGoals").length ? picked("oGoals") : ["move"],
    likes: picked("oLikes").length ? picked("oLikes") : Object.keys(TYPES),
    days: +(picked("oDays")[0] || 3),
    time: picked("oTime")[0] || "any",
    style: picked("oStyle")[0] || "bubbly",
  };
}
function cautionText(p) {
  const c = cautionList(p);
  let t = "";
  if (c.length)
    t = `Since you mentioned ${c.join(", ")}, I'll keep suggestions at a comfortable pace and skip high-intensity workouts. Please check with your doctor before starting a new exercise plan.`;
  if (p.meds !== "no")
    t +=
      (t ? " " : "") +
      "Some medicines change your heart rate, so ask your doctor which heart-rate zones are right for you.";
  return t;
}
function buildSummary() {
  const p = collect();
  $("oDoneTitle").textContent = p.name
    ? `You're all set, ${p.name}!`
    : "You're all set!";
  const items = [
    ["Your goals", p.goals.map((g) => L.goals[g]).join(", ")],
    ["Movement you enjoy", p.likes.map((k) => TYPES[k].name).join(", ")],
    ["Your week", `${p.days} active days, ${L.time[p.time]}`],
    ["About you", `${p.age} years old · ${L.activity[p.activity]}`],
    ["How I'll cheer", L.style[p.style]],
  ];
  $("oSummary").innerHTML = items
    .map(([k, v]) => `<li><b>${k}</b>${v}</li>`)
    .join("");
  const ct = cautionText(p);
  $("oCaution").hidden = !ct;
  $("oCaution").textContent = ct;
}
function showStep(n) {
  step = n;
  document
    .querySelectorAll(".step")
    .forEach((s) => (s.hidden = +s.dataset.s !== n));
  $("onbCount").textContent = `Step ${n + 1} of ${STEPS}`;
  $("onbBar").style.width = `${((n + 1) / STEPS) * 100}%`;
  $("onbBack").hidden = n === 0;
  $("onbNext").textContent =
    n === 0 ? "Let's go" : n === STEPS - 1 ? "Start my journey" : "Next";
  $("onbErr").hidden = true;
  if (n === 2) {
    const nm = $("oName").value.trim();
    $("oAboutTitle").textContent = nm
      ? `Nice to meet you, ${nm}!`
      : "A little about you";
  }
  if (n === STEPS - 1) buildSummary();
  onbDew.dataset.mood = n === STEPS - 1 ? "excited" : "happy";
  if (n === 0) act("wave", 2600, onbDew);
  else if (n === STEPS - 1) act("thumbs", 1500, onbDew);
  $("onb").scrollTo(0, 0);
}
function validate(n) {
  if (n === 2) {
    const a = +$("oAge").value;
    if (!(a >= 10 && a <= 99)) return "Enter an age between 10 and 99.";
  }
  if (n === 3 && !picked("oHealth").length)
    return 'Pick at least one, or tap "None of these".';
  if (n === 4 && !picked("oGoals").length) return "Pick at least one goal.";
  if (n === 5 && !picked("oLikes").length)
    return "Pick at least one kind of movement.";
  return null;
}
$("onbNext").addEventListener("click", () => {
  const err = validate(step);
  if (err) {
    $("onbErr").textContent = err;
    $("onbErr").hidden = false;
    return;
  }
  step < STEPS - 1 ? showStep(step + 1) : finishOnb(collect());
});
$("onbBack").addEventListener("click", () => showStep(step - 1));
$("onbSkip").addEventListener("click", () =>
  finishOnb({
    name: "",
    buddy,
    age: 21,
    activity: "light",
    health: ["none"],
    meds: "no",
    goals: ["move"],
    likes: Object.keys(TYPES),
    days: 5,
    time: "any",
    style: "bubbly",
  }),
);

function applyProfile(p) {
  $("age").value = p.age;
  zoneInfo();
  setBuddy(p.buddy, false);
  greet();
  const ct = cautionText(p);
  $("profName").textContent = p.name || "Your profile";
  $("profAvatar").textContent = (p.name || "H")[0].toUpperCase();
  $("profSum").textContent =
    `${p.age} years old · ${L.activity[p.activity]} · ${p.days} days a week`;
  $("profCaution").hidden = !ct;
  $("profCaution").textContent = ct;
  $("setStyle").value = p.style;
  $("setDays").value = String(p.days);
  renderAll();
}
function finishOnb(p) {
  profile = p;
  try {
    localStorage.setItem("hmProfile", JSON.stringify(p));
  } catch (e) {}
  applyProfile(p);
  $("onb").hidden = true;
  showPage("home");
  celebrateUntil = Date.now() + 5000;
  setMood(zoneOf(hr));
  say(
    mix(
      `Yay, ${p.name || "friend"}! Let's go!`,
      `Yay, ${p.name || "friend"}! I'm so glad we're a team.`,
      0.5,
    ),
  );
  act("thumbs", 2200);
}
function openOnb() {
  if (profile) {
    $("oName").value = profile.name;
    $("oAge").value = profile.age;
    const mark = (id, vals) =>
      document
        .querySelectorAll(`#${id} button`)
        .forEach((b) => b.classList.toggle("on", vals.includes(b.dataset.v)));
    mark("oActivity", [profile.activity]);
    mark("oHealth", profile.health);
    mark("oMeds", [profile.meds]);
    mark("oGoals", profile.goals);
    mark("oLikes", profile.likes);
    mark("oDays", [String(profile.days)]);
    mark("oTime", [profile.time]);
    mark("oStyle", [profile.style]);
    const known = [...document.querySelectorAll("#oBuddy button")].map(
      (b) => b.dataset.v,
    );
    mark("oBuddy", [buddy]);
    $("oBuddyIn").value = known.includes(buddy) ? "" : buddy;
  }
  $("onb").hidden = false;
  showStep(0);
}
$("redoBtn").addEventListener("click", openOnb);

// ---------- settings controls ----------
function zoneInfo() {
  $("maxText").textContent = `${maxHR()} BPM`;
  $("zoneMod").textContent =
    `${Math.round(maxHR() * 0.64)}–${Math.round(maxHR() * 0.77)} BPM`;
}
function ensureProfile() {
  if (!profile)
    profile = {
      name: "",
      buddy,
      age: +$("age").value || 21,
      activity: "light",
      health: ["none"],
      meds: "no",
      goals: ["move"],
      likes: Object.keys(TYPES),
      days: 5,
      time: "any",
      style: "bubbly",
    };
}
function saveProfile() {
  try {
    localStorage.setItem("hmProfile", JSON.stringify(profile));
  } catch (e) {}
}
$("setStyle").addEventListener("change", () => {
  ensureProfile();
  profile.style = $("setStyle").value;
  saveProfile();
  $("nameNote").textContent = "Encouragement style updated.";
  say(pickLine(zoneOf(hr)));
});
$("setDays").addEventListener("change", () => {
  ensureProfile();
  profile.days = +$("setDays").value;
  saveProfile();
  renderAll();
  $("nameNote").textContent = `Weekly goal set to ${profile.days} days.`;
  applyProfile(profile);
});
$("age").addEventListener("change", () => {
  if (profile) {
    profile.age = +$("age").value || profile.age;
    saveProfile();
    applyProfile(profile);
  }
});
zoneInfo();
$("setScene").value = sceneMode;
$("setScene").addEventListener("change", () => {
  sceneMode = $("setScene").value;
  try {
    localStorage.setItem("hmScene", sceneMode);
  } catch (e) {}
  applyScene();
  setMood(zoneOf(hr));
});

if (profile) applyProfile(profile);
else openOnb();
