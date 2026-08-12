import { cast, concepts, relationshipNotes, sideCharacters } from "./lore.js";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  titleScreen: document.querySelector("#titleScreen"),
  startButton: document.querySelector("#startButton"),
  helpButtons: [document.querySelector("#helpButton"), document.querySelector("#titleHelpButton")],
  helpDialog: document.querySelector("#helpDialog"),
  soundButton: document.querySelector("#soundButton"),
  resetButton: document.querySelector("#resetButton"),
  dialogueBox: document.querySelector("#dialogueBox"),
  speakerName: document.querySelector("#speakerName"),
  speakerPortrait: document.querySelector("#speakerPortrait"),
  dialogueText: document.querySelector("#dialogueText"),
  dialogueChoices: document.querySelector("#dialogueChoices"),
  dialogueNext: document.querySelector("#dialogueNext"),
  interactionPrompt: document.querySelector("#interactionPrompt"),
  interactionLabel: document.querySelector("#interactionLabel"),
  insightMeter: document.querySelector("#insightMeter"),
  energyMeter: document.querySelector("#energyMeter"),
  trustMeter: document.querySelector("#trustMeter"),
  insightText: document.querySelector("#insightText"),
  energyText: document.querySelector("#energyText"),
  trustText: document.querySelector("#trustText"),
  questProgress: document.querySelector("#questProgress"),
  questHint: document.querySelector("#questHint"),
  questList: document.querySelector("#questList"),
  clockText: document.querySelector("#clockText"),
  toast: document.querySelector("#toast"),
  endingDialog: document.querySelector("#endingDialog"),
  endingTitle: document.querySelector("#endingTitle"),
  endingText: document.querySelector("#endingText"),
  endingStats: document.querySelector("#endingStats"),
  replayButton: document.querySelector("#replayButton"),
  stayButton: document.querySelector("#stayButton"),
  castButton: document.querySelector("#castButton"),
  conceptButton: document.querySelector("#conceptButton"),
  castDialog: document.querySelector("#castDialog"),
  castCloseButton: document.querySelector("#castCloseButton"),
  dossierPanel: document.querySelector("#dossierPanel"),
  conceptCount: document.querySelector("#conceptCount"),
  dialogConceptCount: document.querySelector("#dialogConceptCount"),
};

const WORLD = { width: 960, height: 576 };
const keys = new Set();
let lastTime = 0;
let nearTarget = null;
let dialogue = null;
let toastTimer = null;
let audioContext = null;
let rainGain = null;

const initialState = () => ({
  started: false,
  paused: false,
  insight: 38,
  energy: 72,
  trust: 20,
  minute: 40,
  clues: new Set(),
  knowledge: new Set(["hidden-curriculum"]),
  used: new Set(),
  meetingReady: false,
  endingSeen: false,
  player: { x: 470, y: 486, w: 22, h: 28, dir: "up", step: 0 },
});

let state = initialState();

const palette = {
  outline: "#211711",
  wall: "#5e4835",
  wallDark: "#3e3026",
  floorA: "#8a5e36",
  floorB: "#7a4e2d",
  wood: "#5c3722",
  woodLight: "#855032",
  rug: "#29453f",
  rugLine: "#b28a51",
  paper: "#d8c495",
  board: "#243e37",
};

const solids = [
  { x: 0, y: 0, w: 960, h: 112 },
  { x: 56, y: 146, w: 132, h: 68 },
  { x: 730, y: 120, w: 190, h: 84 },
  { x: 282, y: 245, w: 400, h: 166 },
  { x: 744, y: 454, w: 93, h: 48 },
  { x: 0, y: 0, w: 32, h: 576 },
  { x: 928, y: 0, w: 32, h: 576 },
];

const actors = [
  { id: "mentor", name: "周维青", portrait: "周", x: 228, y: 188, color: "#596b55", hair: "#40352d", accessory: "glasses", prompt: "问周老师为什么停下了" },
  { id: "senior1", name: "许望川", portrait: "许", x: 190, y: 406, color: "#405f6c", hair: "#30251e", accessory: "notebook", prompt: "读许大师兄的田野笔记" },
  { id: "senior2", name: "邵亦辰", portrait: "邵", x: 716, y: 272, color: "#3f4a58", hair: "#201b19", accessory: "headphones", prompt: "看邵二师兄的项目报价" },
];

const objects = [
  { id: "board", x: 360, y: 112, w: 242, h: 28, prompt: "整理组会白板" },
  { id: "alumna", x: 842, y: 218, w: 58, h: 42, prompt: "接通小杨师姐的视频" },
  { id: "admin", x: 112, y: 188, w: 56, h: 34, prompt: "查看田院长的临时通知" },
  { id: "coffee", x: 770, y: 465, w: 54, h: 38, prompt: "喝一杯冷掉的咖啡" },
  { id: "forms", x: 500, y: 412, w: 72, h: 35, prompt: "核对二十三张报销单" },
];

const scripts = {
  mentor: {
    name: "周维青 · 导师",
    portrait: "周",
    portraitIndex: 0,
    lines: [
      "田院长要我今晚补交长聘材料。项目、经费、成果一项不少——可评审二号那句“社会学贡献不足”，我到现在也不知道该怎么回答。",
      {
        text: "他说“你们先按原方案做”，目光却一直停在没有擦干净的旧研究问题上。你怎么回应？",
        choices: [
          { label: "“评审否定的是方向，还是你已经不再相信这场游戏？”", result: "周维青第一次抬起头：“经费能让项目继续，投入感不行。也许我们该把这个区别说清楚。”", effects: { insight: 12, trust: 9 } },
          { label: "“材料我来补，您把去年的成果表发我。”", result: "他松了口气，又很快沉默。你的可靠解决了截止日期，却没有解决研究为何继续。", effects: { energy: -11, trust: 5, insight: 2 } },
          { label: "“沿用最安全的指标，先通过评估再说。”", result: "“很现实。”他说。白板上的问题没有消失，只是被新的进度表盖住了。", effects: { insight: 3, trust: 1 } },
        ],
      },
    ],
    clue: "mentor",
    knowledge: ["field-illusio"],
  },
  senior1: {
    name: "许望川 · 大师兄",
    portrait: "许",
    portraitIndex: 1,
    lines: [
      "许望川把招募材料逐字改到第三版。学院嫌他的普通话“不够展示形象”，可昨天那位外卖站长一听见他的乡音，就把关掉的录音笔重新打开了。",
      {
        text: "桌上还放着一段英文摘要。他写得很准确，却不愿在下午的国际连线里读出来。你怎么做？",
        choices: [
          { label: "把乡音带来的信任写进方法反思，而不是当成缺陷藏掉。", result: "他慢慢点头：“原来研究者从哪里来，也能成为材料，不只是需要克服的东西。”", effects: { insight: 12, trust: 10 } },
          { label: "我替你读英文，你帮我检查访谈提纲。", result: "这不是拯救，而是一次互相承认能力边界的交换。下午的连线终于不再可怕。", effects: { energy: -4, trust: 9, insight: 7 } },
          { label: "还是先把普通话练标准，学院评价更重要。", result: "他把笔记本合上。标准语言的门槛又一次被包装成了个人努力问题。", effects: { trust: -7, insight: 2 } },
        ],
      },
    ],
    clue: "senior1",
    knowledge: ["linguistic-capital"],
  },
  senior2: {
    name: "邵亦辰 · 二师兄",
    portrait: "邵",
    portraitIndex: 2,
    lines: [
      "邵亦辰的电脑左边是课题组网络图，右边是给一家平台公司的用户流失模型。两个项目用了相近的方法，后者的报价是他半年奖助金。",
      {
        text: "他问你要不要加入行业项目：“别担心，论文不一定按时发表，咨询款一定按时到账。”",
        choices: [
          { label: "可以，但先写清数据归属、报酬和可以公开的研究部分。", result: "他摘下耳机：“你比我刚入学时会谈条件。研究能力值钱，边界也值钱。”", effects: { insight: 11, trust: 9, energy: -3 } },
          { label: "都是课题组同门，先免费帮我跑一遍模型。", result: "“学术共同体不是免费劳动力池。”他重新戴上耳机，报价单翻到了第二页。", effects: { insight: 3, trust: -8 } },
          { label: "先让我旁听一次客户会，我想知道研究怎样被组织使用。", result: "“聪明。”他说，“方法进入公司之后，问题往往不是准不准，而是谁能拿它做决定。”", effects: { insight: 9, trust: 6, energy: -4 } },
        ],
      },
    ],
    clue: "senior2",
    knowledge: ["academic-capitalism"],
  },
  alumna: {
    name: "杨知夏 · 小杨师姐",
    portrait: "杨",
    portraitIndex: 4,
    lines: [
      "视频接通时，杨知夏刚结束一场企业决策会。她能为项目开放行业入口，但先问了三个问题：谁拥有数据？谁承担风险？负面结果能不能发表？",
      {
        text: "周老师让你代课题组回应合作条件。你选择：",
        choices: [
          { label: "共同写合作备忘录：知情同意、独立分析、公开发表写进前提。", result: "“这才是合作。”她把下周的行业访谈名额发来，“边界说清楚，关系反而更长久。”", effects: { insight: 12, trust: 11 } },
          { label: "先把平台原始用户数据拿到，伦理手续以后补。", result: "她的语气冷下来：“行业资源不是学术豁免。能拿到的数据，不等于你有权使用。”", effects: { insight: 3, trust: -9 } },
          { label: "请她讲一次研究如何从论文进入组织决策。", result: "“影响力不是传播结论，是理解谁有权把结论变成行动。”她答应参加下周组会。", effects: { insight: 10, trust: 7 } },
        ],
      },
    ],
    clue: "alumna",
    knowledge: ["boundary-work"],
  },
  board: {
    name: "组会白板",
    portrait: "题",
    get lines() {
      if (state.clues.size < 2) return ["白板上只有一句：谁在替系统维持运转？你还需要至少听取两种位置上的声音。"];
      if (state.clues.size < 4) return [`你已经收集了 ${state.clues.size} 条线索，但课题组还有人的劳动、利益或挫败没有被放进方案。`];
      return [
        "四条线索连在一起：语言资本、市场化、学术投入感与行业边界。你忽然发现，课题组研究平台劳动，却也在用一套看不见的规则分配杂务、声望和风险。",
        {
          text: "沈砚第一次不是汇报任务，而是提出方案：",
          choices: [
            { label: "把课题组也纳入反思：公开杂务、署名与资源清单，再研究平台隐形劳动。", ending: "mirror", knowledge: "reflexivity", effects: { insight: 16, trust: 14, energy: -7 } },
            { label: "与杨师姐共建行业合作，由邵师兄做数据、许师兄做田野，并写清报酬与边界。", ending: "public", knowledge: "reflexivity", effects: { insight: 13, trust: 11, energy: -10 } },
            { label: "先完成长聘材料，沿用旧指标；所有争议等项目结项后再说。", ending: "machine", knowledge: "reflexivity", effects: { insight: 4, trust: -2, energy: -13 } },
          ],
        },
      ];
    },
  },
  admin: {
    name: "田院长的临时通知",
    portrait: "急",
    lines: ["17:00 前补交三页长聘评估材料，统一字体、重做成果图、增加“社会服务亮点”。许望川已经替导师改了二十三页，最后三页自动落到新生沈砚头上。制度压力从不亲自打印。"],
    once: "admin",
    knowledge: ["invisible-labor"],
    effects: { energy: -5, insight: 6 },
  },
  coffee: {
    name: "冷掉的公共咖啡",
    portrait: "咖",
    lines: ["杯身写着你的名字，已经冷了。许大师兄在旁边补了一句：“做杂活也要留时间记自己的问题。”你获得了一小段不够体面但确实有用的清醒。"],
    once: "coffee",
    effects: { energy: 13, insight: 2 },
  },
  forms: {
    name: "二十三张报销单",
    portrait: "票",
    portraitIndex: 3,
    lines: ["你按发票号码排到第十七张，忽然发现每张票都对应一次田野进入、一次临时协调或一顿错过饭点的工作。行政材料不是研究本身，却保存了研究如何被维持的痕迹。"],
    once: "forms",
    effects: { insight: 5, energy: -3 },
  },
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function applyEffects(effects = {}) {
  for (const [key, value] of Object.entries(effects)) {
    state[key] = clamp(state[key] + value);
  }
  updateUI();
}

function unlockConcept(id) {
  if (!id || state.knowledge.has(id)) return;
  state.knowledge.add(id);
  const concept = concepts.find((item) => item.id === id);
  showToast(`解锁概念卡 · ${concept?.name || id}`);
  updateUI();
}

function markClue(id) {
  if (!id || state.clues.has(id)) return;
  state.clues.add(id);
  state.minute += 5;
  showToast(`获得人物线索 ${state.clues.size}/4 · 研究方案正在成形`);
  if (state.clues.size === 4) {
    state.meetingReady = true;
    showToast("组会可以开始了 · 去白板前整理方案");
  }
  updateUI();
}

function updateUI() {
  const stats = [
    [ui.insightMeter, ui.insightText, state.insight],
    [ui.energyMeter, ui.energyText, state.energy],
    [ui.trustMeter, ui.trustText, state.trust],
  ];
  for (const [meter, label, value] of stats) {
    meter.style.width = `${value}%`;
    label.textContent = value;
  }
  ui.questProgress.style.width = `${(state.clues.size / 4) * 100}%`;
  ui.questHint.textContent = state.meetingReady
    ? "四种位置都被听见了。去白板前提出你的方案。"
    : "长聘材料今晚截止。先听见四种位置上的声音。";
  ui.questList.querySelectorAll("li").forEach((item) => {
    item.classList.toggle("done", state.clues.has(item.dataset.clue));
  });
  ui.clockText.textContent = `15:${String(state.minute).padStart(2, "0")}`;
  ui.conceptCount.textContent = `${state.knowledge.size} / ${concepts.length}`;
  ui.dialogConceptCount.textContent = `${state.knowledge.size}/${concepts.length}`;
  if (ui.castDialog.open) renderDossier(activeDossierTab);
}

function showToast(message) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2600);
}

function rectsOverlap(a, b, pad = 0) {
  return a.x + a.w > b.x - pad && a.x < b.x + b.w + pad && a.y + a.h > b.y - pad && a.y < b.y + b.h + pad;
}

function canMove(next) {
  const hitbox = { x: next.x + 3, y: next.y + 17, w: next.w - 6, h: next.h - 17 };
  if (solids.some((solid) => rectsOverlap(hitbox, solid))) return false;
  if (actors.some((actor) => rectsOverlap(hitbox, { x: actor.x - 10, y: actor.y + 16, w: 42, h: 18 }))) return false;
  return true;
}

function update(delta) {
  if (!state.started || state.paused || dialogue) return;
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
  if (dx && dy) { dx *= .707; dy *= .707; }

  if (dx || dy) {
    const speed = 190 * delta;
    const nextX = { ...state.player, x: state.player.x + dx * speed };
    const nextY = { ...state.player, y: state.player.y + dy * speed };
    if (canMove(nextX)) state.player.x = nextX.x;
    if (canMove(nextY)) state.player.y = nextY.y;
    if (Math.abs(dx) > Math.abs(dy)) state.player.dir = dx > 0 ? "right" : "left";
    else state.player.dir = dy > 0 ? "down" : "up";
    state.player.step += delta * 10;
  }
  updateNearTarget();
}

function updateNearTarget() {
  const playerCenter = { x: state.player.x + 11, y: state.player.y + 14 };
  const targets = [
    ...actors.map((item) => ({ ...item, targetType: "actor", cx: item.x + 11, cy: item.y + 18 })),
    ...objects.map((item) => ({ ...item, targetType: "object", cx: item.x + item.w / 2, cy: item.y + item.h / 2 })),
  ];
  const sorted = targets
    .map((target) => ({ target, distance: Math.hypot(playerCenter.x - target.cx, playerCenter.y - target.cy) }))
    .sort((a, b) => a.distance - b.distance);
  nearTarget = sorted[0]?.distance < 74 ? sorted[0].target : null;
  ui.interactionPrompt.hidden = !nearTarget;
  if (nearTarget) ui.interactionLabel.textContent = nearTarget.prompt;
}

function interact() {
  if (dialogue) {
    advanceDialogue();
    return;
  }
  if (!nearTarget) return;
  openDialogue(nearTarget.id);
}

function openDialogue(id) {
  const script = scripts[id];
  if (!script) return;
  const lines = typeof script.lines === "function" ? script.lines() : script.lines;
  dialogue = { id, script, lines: [...lines], index: 0, waitingChoice: false, applied: false };
  ui.dialogueBox.hidden = false;
  ui.interactionPrompt.hidden = true;
  renderDialogueLine();
}

function renderDialogueLine() {
  const line = dialogue.lines[dialogue.index];
  ui.speakerName.textContent = dialogue.script.name;
  ui.speakerPortrait.textContent = dialogue.script.portrait;
  const portraitIndex = dialogue.script.portraitIndex;
  ui.speakerPortrait.classList.toggle("has-cast-art", Number.isInteger(portraitIndex));
  if (Number.isInteger(portraitIndex)) ui.speakerPortrait.dataset.portraitIndex = portraitIndex;
  else delete ui.speakerPortrait.dataset.portraitIndex;
  ui.dialogueChoices.replaceChildren();
  ui.dialogueNext.hidden = false;

  if (typeof line === "string") {
    ui.dialogueText.textContent = line;
    dialogue.waitingChoice = false;
    return;
  }

  ui.dialogueText.textContent = line.text;
  dialogue.waitingChoice = true;
  ui.dialogueNext.hidden = true;
  line.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = choice.label;
    button.addEventListener("click", () => chooseDialogue(choice));
    ui.dialogueChoices.append(button);
  });
  ui.dialogueChoices.querySelector("button")?.focus();
}

function chooseDialogue(choice) {
  applyEffects(choice.effects);
  if (choice.knowledge) unlockConcept(choice.knowledge);
  ui.dialogueChoices.replaceChildren();
  ui.dialogueText.textContent = choice.result || "你在白板上圈住了研究问题，也为尚未知道的部分留下一块空白。";
  ui.dialogueNext.hidden = false;
  dialogue.waitingChoice = false;
  dialogue.index = dialogue.lines.length;
  if (choice.ending) dialogue.ending = choice.ending;
}

function advanceDialogue() {
  if (!dialogue || dialogue.waitingChoice) return;
  dialogue.index += 1;
  if (dialogue.index < dialogue.lines.length) {
    renderDialogueLine();
    return;
  }
  closeDialogue();
}

function closeDialogue() {
  const completed = dialogue;
  dialogue = null;
  ui.dialogueBox.hidden = true;
  if (!completed.applied) {
    if (completed.script.once && !state.used.has(completed.script.once)) {
      state.used.add(completed.script.once);
      applyEffects(completed.script.effects);
    }
    completed.script.knowledge?.forEach(unlockConcept);
    markClue(completed.script.clue);
  }
  if (completed.ending) showEnding(completed.ending);
  updateNearTarget();
  canvas.focus();
}

function showEnding(type) {
  state.endingSeen = true;
  const endings = {
    mirror: ["课题组也进入了田野。", "你们决定先公开杂务清单、署名原则与合作边界。许望川第一次把方言写进方法，邵亦辰第一次把报价摆上组会桌，周维青则擦掉了那句“按原方案做”。研究没有因此变得纯粹，但它开始能够看见自己。"],
    public: ["一座有边界的桥。", "杨知夏带来行业入口，邵亦辰负责模型，许望川设计访谈；每项劳动都有报酬，每份数据都有退出与发表条件。社会学没有被锁在论文里，也没有把独立性交给甲方。"],
    machine: ["机器顺利继续运转。", "长聘材料准时提交，旧指标得到保留，田院长回了一个“收到”。所有人都松了一口气，也都知道真正的问题被推到了下周。系统没有崩溃——只是又消耗了一点人的投入感。"],
  };
  const [title, text] = endings[type];
  ui.endingTitle.textContent = title;
  ui.endingText.textContent = text;
  ui.endingStats.innerHTML = `<span>✦ 灵感 ${state.insight}</span><span>♥ 精力 ${state.energy}</span><span>◆ 共识 ${state.trust}</span>`;
  ui.endingDialog.showModal();
}

function resetGame({ keepTitle = true } = {}) {
  state = initialState();
  state.started = keepTitle;
  keys.clear();
  nearTarget = null;
  dialogue = null;
  ui.dialogueBox.hidden = true;
  ui.interactionPrompt.hidden = true;
  if (ui.endingDialog.open) ui.endingDialog.close();
  updateUI();
  canvas.focus();
}

let activeDossierTab = "cast";

function renderDossier(tab = "cast") {
  activeDossierTab = tab;
  document.querySelectorAll("[data-dossier-tab]").forEach((button) => {
    const active = button.dataset.dossierTab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  if (tab === "cast") {
    ui.dossierPanel.innerHTML = `<div class="cast-grid">${cast.map((person) => `
      <article class="cast-card ${person.id === "player" ? "player-card" : ""}">
        <div class="cast-card-portrait" data-portrait-index="${person.portraitIndex}" role="img" aria-label="${person.name}像素肖像"></div>
        <div class="cast-card-copy">
          <span class="cast-meta">${person.age} · ${person.role}</span>
          <h3>${person.name}</h3>
          <blockquote>${person.motto}</blockquote>
          <p>${person.bio}</p>
          <p><strong>核心张力：</strong>${person.tension}</p>
          <p><strong>人物弧线：</strong>${person.arc}</p>
          <div class="tag-row">${person.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </div>
      </article>`).join("")}</div>`;
    return;
  }

  if (tab === "relations") {
    ui.dossierPanel.innerHTML = `
      <div class="relationship-layout">
        <section class="relationship-map">
          <h3>课题组关系线</h3>
          <ul class="relationship-list">${relationshipNotes.map(([title, note]) => `<li><strong>${title}</strong>${note}</li>`).join("")}</ul>
        </section>
        <section class="side-cast-panel">
          <h3>制度性配角</h3>
          <ul class="side-list">${sideCharacters.map(([name, note]) => `<li><strong>${name}</strong>${note}</li>`).join("")}</ul>
          <p class="side-cast-note">这些人物不会成为主要可攻略角色。他们负责制造截止日期、评价压力和行政支线，让制度通过“小事”进入剧情。</p>
        </section>
      </div>`;
    return;
  }

  ui.dossierPanel.innerHTML = `<div class="concept-grid">${concepts.map((concept) => {
    const unlocked = state.knowledge.has(concept.id);
    return `
      <article class="concept-card ${unlocked ? "" : "locked"}">
        <div class="concept-card-head"><h3>${concept.name}</h3><span class="unlock-state">${unlocked ? "已解锁" : "尚未解锁"}</span></div>
        <div class="concept-source">${unlocked ? concept.source : "继续与课题组成员交谈"}</div>
        ${unlocked
          ? `<p>${concept.definition}</p><p><strong>在本章中：</strong>${concept.inGame}</p>`
          : `<div class="locked-copy">概念不是百科词条奖励。<br>先在人物的处境中遇见它。</div>`}
      </article>`;
  }).join("")}</div>`;
}

function openDossier(tab = "cast") {
  renderDossier(tab);
  ui.castDialog.showModal();
  state.paused = true;
}

function closeDossier() {
  ui.castDialog.close();
  state.paused = false;
  canvas.focus();
}

function drawPixelRect(x, y, w, h, color, outline = null) {
  if (outline) {
    ctx.fillStyle = outline;
    ctx.fillRect(Math.round(x - 2), Math.round(y - 2), Math.round(w + 4), Math.round(h + 4));
  }
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawRoom(time) {
  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, WORLD.width, 116);
  for (let x = 0; x < WORLD.width; x += 64) {
    ctx.fillStyle = x % 128 ? "#54402f" : "#604936";
    ctx.fillRect(x, 0, 62, 114);
  }
  ctx.fillStyle = palette.wallDark;
  ctx.fillRect(0, 108, WORLD.width, 14);

  for (let y = 122; y < WORLD.height; y += 32) {
    for (let x = 0; x < WORLD.width; x += 64) {
      ctx.fillStyle = ((x / 64 + y / 32) % 2) ? palette.floorA : palette.floorB;
      ctx.fillRect(x, y, 62, 30);
      ctx.fillStyle = "#4d301f33";
      ctx.fillRect(x, y + 29, 62, 2);
    }
  }

  drawWindow(time);
  drawBoard();
  drawBookshelf(56, 128, 132, 82);
  drawBookshelf(746, 114, 174, 88);
  drawRug();
  drawTable();
  drawMediaCorner();
  drawCoffeeCart();
  drawPlants();
}

function drawWindow(time) {
  drawPixelRect(612, 18, 280, 82, "#203d4a", palette.outline);
  ctx.fillStyle = "#345e6b";
  ctx.fillRect(618, 24, 268, 70);
  ctx.fillStyle = "#273f4b";
  ctx.fillRect(618, 65, 268, 29);
  ctx.fillStyle = "#15191a";
  ctx.fillRect(750, 22, 6, 74);
  ctx.fillRect(616, 57, 272, 5);
  ctx.strokeStyle = "#86afba";
  ctx.lineWidth = 2;
  for (let i = 0; i < 28; i += 1) {
    const x = 620 + ((i * 43) % 262);
    const y = 22 + ((i * 29 + time * .09) % 70);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 10);
    ctx.stroke();
  }
}

function drawBoard() {
  drawPixelRect(332, 22, 254, 78, palette.board, palette.outline);
  ctx.strokeStyle = "#ac9c71";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(397, 54, 14, 0, Math.PI * 2);
  ctx.arc(497, 63, 18, 0, Math.PI * 2);
  ctx.moveTo(411, 54);
  ctx.lineTo(479, 62);
  ctx.moveTo(497, 45);
  ctx.lineTo(530, 35);
  ctx.stroke();
  ctx.fillStyle = "#d8c495";
  ctx.fillRect(352, 91, 55, 4);
  ctx.fillStyle = "#b66559";
  ctx.fillRect(416, 91, 24, 4);
}

function drawBookshelf(x, y, w, h) {
  drawPixelRect(x, y, w, h, palette.wood, palette.outline);
  for (let shelf = 0; shelf < 2; shelf += 1) {
    const sy = y + 10 + shelf * 32;
    ctx.fillStyle = "#251911";
    ctx.fillRect(x + 6, sy, w - 12, 24);
    let bx = x + 9;
    const colors = ["#6e4a3e", "#365b56", "#8a6a3e", "#554d65", "#7b3e36"];
    let index = 0;
    while (bx < x + w - 11) {
      const bw = 8 + (index % 3) * 3;
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(bx, sy + 3 + (index % 2) * 3, bw, 19 - (index % 2) * 3);
      ctx.fillStyle = "#d4ad6233";
      ctx.fillRect(bx + 2, sy + 6, 1, 11);
      bx += bw + 3;
      index += 1;
    }
  }
}

function drawRug() {
  drawPixelRect(226, 224, 504, 218, palette.rug, "#3a291c");
  ctx.strokeStyle = palette.rugLine;
  ctx.lineWidth = 4;
  ctx.strokeRect(236, 234, 484, 198);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "#a46a4e";
  ctx.lineWidth = 2;
  ctx.strokeRect(246, 244, 464, 178);
  ctx.setLineDash([]);
}

function drawTable() {
  ctx.fillStyle = "#21161066";
  ctx.fillRect(298, 280, 380, 151);
  drawPixelRect(282, 245, 400, 166, palette.woodLight, palette.outline);
  ctx.fillStyle = "#6a4028";
  ctx.fillRect(294, 258, 376, 8);
  const papers = [[330, 288], [428, 275], [555, 298], [605, 349], [382, 354], [498, 368]];
  for (const [x, y] of papers) {
    ctx.fillStyle = palette.paper;
    ctx.fillRect(x, y, 42, 25);
    ctx.fillStyle = "#8a6d4f";
    ctx.fillRect(x + 6, y + 6, 25, 2);
    ctx.fillRect(x + 6, y + 12, 30, 2);
  }
  ctx.fillStyle = "#31534d";
  ctx.fillRect(470, 302, 49, 34);
  ctx.fillStyle = "#ddb868";
  ctx.fillRect(477, 308, 35, 2);
  drawMug(568, 274, "#c7a65e");
  drawMug(412, 320, "#789183");
}

function drawMug(x, y, color) {
  ctx.fillStyle = palette.outline;
  ctx.fillRect(x - 2, y - 2, 18, 18);
  ctx.fillRect(x + 14, y + 3, 6, 9);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 14, 14);
  ctx.fillRect(x + 14, y + 5, 4, 5);
  ctx.fillStyle = "#3a2419";
  ctx.fillRect(x + 3, y + 2, 8, 3);
}

function drawMediaCorner() {
  drawPixelRect(815, 206, 102, 58, palette.wood, palette.outline);
  ctx.fillStyle = "#171b1b";
  ctx.fillRect(838, 211, 49, 34);
  ctx.fillStyle = "#426a68";
  ctx.fillRect(842, 215, 41, 25);
  ctx.fillStyle = "#d5a87c";
  ctx.fillRect(857, 220, 11, 10);
  ctx.fillStyle = "#35261f";
  ctx.fillRect(855, 216, 15, 5);
  ctx.fillStyle = "#ded3aa";
  ctx.fillRect(891, 230, 13, 16);
}

function drawCoffeeCart() {
  drawPixelRect(744, 454, 93, 48, palette.wood, palette.outline);
  drawMug(780, 462, "#b46d55");
  ctx.fillStyle = "#d3b77c";
  ctx.fillRect(757, 465, 15, 17);
}

function drawPlants() {
  drawPixelRect(688, 136, 28, 42, "#735039", palette.outline);
  ctx.fillStyle = "#4d7a48";
  for (let i = 0; i < 8; i += 1) {
    ctx.fillRect(676 + (i % 4) * 11, 111 + (i % 3) * 10, 17, 12);
  }
  drawPixelRect(43, 492, 42, 52, "#6c4931", palette.outline);
  ctx.fillStyle = "#4e7845";
  for (let i = 0; i < 9; i += 1) {
    ctx.fillRect(30 + (i % 5) * 13, 454 + (i % 4) * 11, 22, 14);
  }
}

function drawCharacter(actor, time, isPlayer = false) {
  const bob = isPlayer && (keys.size > 0) ? Math.round(Math.sin(actor.step) * 1.5) : 0;
  const x = Math.round(actor.x);
  const y = Math.round(actor.y + bob);
  const bodyColor = isPlayer ? "#8b584d" : actor.color;
  const hairColor = isPlayer ? "#3e2c21" : actor.hair;

  ctx.fillStyle = "#1b120d55";
  ctx.fillRect(x - 3, y + 25, 28, 8);
  ctx.fillStyle = palette.outline;
  ctx.fillRect(x + 2, y - 2, 18, 19);
  ctx.fillRect(x - 1, y + 12, 24, 18);
  ctx.fillStyle = "#d3a878";
  ctx.fillRect(x + 4, y, 14, 13);
  ctx.fillStyle = hairColor;
  ctx.fillRect(x + 3, y - 1, 16, 6);
  ctx.fillRect(x + 3, y + 4, 4, 6);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 2, y + 13, 20, 15);
  ctx.fillStyle = "#e4c48e";
  ctx.fillRect(x + 7, y + 17, 10, 3);
  ctx.fillStyle = "#2b2420";
  ctx.fillRect(x + 3, y + 28, 7, 5);
  ctx.fillRect(x + 14, y + 28, 7, 5);

  if (actor.accessory === "glasses") {
    ctx.strokeStyle = "#31251e";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 5, y + 5, 5, 4);
    ctx.strokeRect(x + 12, y + 5, 5, 4);
    ctx.fillRect(x + 10, y + 6, 2, 1);
  }
  if (actor.accessory === "headphones") {
    ctx.fillStyle = "#171719";
    ctx.fillRect(x + 1, y + 11, 5, 9);
    ctx.fillRect(x + 18, y + 11, 5, 9);
    ctx.fillRect(x + 4, y + 9, 16, 3);
  }
  if (actor.accessory === "notebook") {
    ctx.fillStyle = "#d7c394";
    ctx.fillRect(x + 13, y + 17, 10, 9);
    ctx.fillStyle = "#6b543e";
    ctx.fillRect(x + 15, y + 20, 6, 1);
  }

  if (isPlayer) {
    ctx.fillStyle = "#ccb47e";
    ctx.fillRect(x + (actor.dir === "left" ? -2 : 19), y + 17, 5, 10);
    ctx.fillStyle = "#d8c79f";
    ctx.fillRect(x - 4, y + 15, 10, 13);
    ctx.fillStyle = "#8d7353";
    ctx.fillRect(x - 2, y + 18, 6, 1);
  } else if (!state.clues.has(actor.id)) {
    const pulse = Math.sin(time / 260) * 2;
    ctx.fillStyle = "#21160e";
    ctx.fillRect(x + 6, y - 23 - pulse, 12, 17);
    ctx.fillStyle = "#f0b84c";
    ctx.fillRect(x + 8, y - 21 - pulse, 8, 10);
    ctx.fillRect(x + 10, y - 8 - pulse, 4, 4);
  }
}

function drawObjectHighlights(time) {
  if (!state.meetingReady) return;
  const pulse = .45 + Math.sin(time / 220) * .2;
  ctx.strokeStyle = `rgba(244, 198, 105, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(356, 106, 250, 34);
}

function render(time = 0) {
  drawRoom(time);
  drawObjectHighlights(time);
  for (const actor of actors) drawCharacter(actor, time);
  drawCharacter(state.player, time, true);

  if (!state.started) {
    ctx.fillStyle = "#120e0a88";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
}

function loop(time) {
  const delta = Math.min((time - lastTime) / 1000 || 0, .033);
  lastTime = time;
  update(delta);
  render(time);
  requestAnimationFrame(loop);
}

function startAmbientRain() {
  if (audioContext || ui.soundButton.getAttribute("aria-pressed") === "false") return;
  audioContext = new AudioContext();
  const bufferSize = audioContext.sampleRate * 2;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  rainGain = audioContext.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 850;
  rainGain.gain.value = .018;
  source.connect(filter).connect(rainGain).connect(audioContext.destination);
  source.start();
}

function toggleSound() {
  const on = ui.soundButton.getAttribute("aria-pressed") === "true";
  ui.soundButton.setAttribute("aria-pressed", String(!on));
  ui.soundButton.innerHTML = `<span aria-hidden="true">♪</span> 环境音：${on ? "关" : "开"}`;
  if (on && rainGain) rainGain.gain.value = 0;
  if (!on) {
    if (!audioContext) startAmbientRain();
    else rainGain.gain.value = .018;
  }
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key)) keys.add(key);
  if ((key === "e" || key === " ") && !event.repeat && state.started) interact();
  if (key === "Escape" && dialogue) closeDialogue();
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

document.querySelectorAll("[data-key]").forEach((button) => {
  const key = button.dataset.key;
  const down = (event) => { event.preventDefault(); keys.add(key); };
  const up = (event) => { event.preventDefault(); keys.delete(key); };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("pointerleave", up);
});

document.querySelector("[data-action='interact']").addEventListener("click", interact);
ui.dialogueNext.addEventListener("click", advanceDialogue);
ui.helpButtons.forEach((button) => button.addEventListener("click", () => ui.helpDialog.showModal()));
ui.castButton.addEventListener("click", () => openDossier("cast"));
ui.conceptButton.addEventListener("click", () => openDossier("concepts"));
ui.castCloseButton.addEventListener("click", closeDossier);
ui.castDialog.addEventListener("close", () => {
  state.paused = false;
  canvas.focus();
});
document.querySelectorAll("[data-dossier-tab]").forEach((button) => {
  button.addEventListener("click", () => renderDossier(button.dataset.dossierTab));
});
ui.startButton.addEventListener("click", () => {
  state.started = true;
  ui.titleScreen.classList.add("dismissed");
  startAmbientRain();
  canvas.focus();
  setTimeout(() => showToast("周三 · 15:40 · 长聘材料截止前 80 分钟"), 500);
});
ui.soundButton.addEventListener("click", toggleSound);
ui.resetButton.addEventListener("click", () => resetGame());
ui.replayButton.addEventListener("click", () => resetGame());
ui.stayButton.addEventListener("click", () => { ui.endingDialog.close(); canvas.focus(); });

if (["127.0.0.1", "localhost"].includes(location.hostname)) {
  window.__paperFieldTest = {
    teleport(x, y) {
      state.player.x = x;
      state.player.y = y;
      updateNearTarget();
    },
    snapshot() {
      return { clues: [...state.clues], knowledge: [...state.knowledge], insight: state.insight, energy: state.energy, trust: state.trust };
    },
  };
}

document.addEventListener("visibilitychange", () => {
  state.paused = document.hidden;
  keys.clear();
});

updateUI();
requestAnimationFrame(loop);
