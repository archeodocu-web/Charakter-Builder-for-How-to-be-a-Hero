const MODULE_ID = "htbah-character-creator";
const SYSTEM_ID = "how-to-be-a-hero";
const MODULE_VERSION = "1.0.6";
const DEFAULT_POINT_BUDGET = 400;

const SKILL_CATEGORIES = [
  { key: "action", systemLabelKey: "HOW_TO_BE_A_HERO.SkillSets.Action.label", fallback: "Handeln" },
  { key: "knowledge", systemLabelKey: "HOW_TO_BE_A_HERO.SkillSets.Knowledge.label", fallback: "Wissen" },
  { key: "social", systemLabelKey: "HOW_TO_BE_A_HERO.SkillSets.Social.label", fallback: "Soziales" }
];

// Historical occupation suggestions for a broadly European/Victorian setting (c. 1850–1900).
// The final option remains free text, since a core list can never cover every local trade.
const JOB_GROUPS = [
  {
    label: "Landwirtschaft, Forst und Tiere",
    occupations: ["Bauer / Landwirt", "Gutsbesitzer", "Gutsverwalter", "Landarbeiter", "Knecht", "Magd", "Schäfer", "Hirte", "Gärtner", "Förster", "Jäger / Wildhüter", "Fischer", "Stallknecht", "Kutscher", "Pferdepfleger"]
  },
  {
    label: "Handwerk und Bau",
    occupations: ["Schmied", "Schlosser", "Zimmermann", "Tischler / Schreiner", "Stellmacher", "Küfer / Böttcher", "Maurer", "Steinmetz", "Dachdecker", "Maler / Anstreicher", "Glaser", "Klempner", "Drechsler", "Schuster / Schuhmacher", "Schneider", "Schneiderin", "Schneidergeselle", "Hutmacher", "Handschuhmacher", "Uhrmacher", "Buchbinder", "Sattler", "Seiler", "Töpfer", "Korbflechter"]
  },
  {
    label: "Manufaktur, Fabrik und Bergbau",
    occupations: ["Fabrikarbeiter", "Textilarbeiter", "Spinner", "Weber", "Färber", "Näherin", "Bergmann", "Steinbrucharbeiter", "Eisenhüttenarbeiter", "Gießer", "Maschinist", "Mechaniker", "Dampfmaschinenführer", "Lokomotivführer", "Heizer", "Eisenbahner", "Schiffbauer", "Werftarbeiter", "Drucker", "Setzer", "Papiermacher", "Müller", "Bäcker", "Fleischer / Metzger", "Brauer", "Böttcher"]
  },
  {
    label: "Handel, Verkehr und Gastgewerbe",
    occupations: ["Kaufmann", "Händler", "Ladenbesitzer", "Krämer", "Kolonialwarenhändler", "Tuchhändler", "Buchhändler", "Bankier", "Bankangestellter", "Buchhalter", "Kontorist / Büroangestellter", "Schreiber", "Verkäufer", "Hausierer", "Markthändler", "Postbeamter", "Telegrafist", "Bote", "Gepäckträger", "Fuhrmann", "Droschkenkutscher", "Lastenträger", "Matrose", "Seemann", "Hafenarbeiter", "Schiffer", "Gastwirt", "Hotelier", "Kellner", "Koch", "Wirtshausknecht"]
  },
  {
    label: "Haus, Pflege und persönliche Dienste",
    occupations: ["Hausdiener", "Diener", "Butler", "Hausmädchen", "Dienstmädchen", "Kammerzofe", "Haushälterin", "Köchin", "Wäscherin", "Büglerin", "Kindermädchen", "Gouvernante", "Näherin", "Hebamme", "Krankenpfleger", "Krankenschwester", "Barbier", "Friseur", "Bademeister", "Hausmeister", "Nachtwächter", "Portier"]
  },
  {
    label: "Staat, Bildung, Kirche und freie Berufe",
    occupations: ["Arzt", "Chirurg", "Apotheker", "Tierarzt", "Rechtsanwalt", "Notar", "Richter", "Lehrer", "Lehrerin", "Schulmeister", "Geistlicher / Pfarrer", "Priester", "Beamter", "Stadtbeamter", "Polizist", "Gendarm", "Soldat", "Offizier", "Seemann der Marine", "Journalist", "Redakteur", "Schriftsteller", "Verleger", "Künstler", "Maler", "Bildhauer", "Fotograf", "Architekt", "Ingenieur", "Vermesser", "Musiker", "Schauspieler", "Sänger", "Forscher / Naturkundler", "Privatgelehrter"]
  },
  {
    label: "Gesellschaft und ohne feste Anstellung",
    occupations: ["Adliger / Aristokrat", "Grundbesitzer", "Rentier / Privatier", "Pensionär", "Student", "Lehrling", "Tagelöhner", "Gelegenheitsarbeiter", "Arbeitslos", "Ohne Berufsangabe"]
  }
];
const JOB_VALUES = new Set(JOB_GROUPS.flatMap(group => group.occupations));
const CUSTOM_JOB_VALUE = "__htbah_custom_job__";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const ApplicationBase = HandlebarsApplicationMixin(ApplicationV2);

function cloneData(value) {
  return foundry.utils.deepClone(value ?? {});
}

function localize(key, fallback) {
  const value = key ? game.i18n.localize(key) : "";
  return value && value !== key ? value : fallback;
}

function getCategoryLabel(category) {
  const systemDefinition = CONFIG.HTBAH?.skillSets?.[category.key];
  return localize(systemDefinition?.label ?? category.systemLabelKey, category.fallback);
}

function parseNonNegativeInteger(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function nonNegativeIntegerOrZero(value) {
  return parseNonNegativeInteger(value) ?? 0;
}

const VALID_SKILL_SETS = new Set(["action", "knowledge", "social"]);

/**
 * Older test builds incorrectly persisted the category "action" as the
 * Foundry Item document type. In this system the document type must be
 * "ability" and the category belongs in system.skillSet.
 */
function normalizeLegacyActionItem(item) {
  const normalized = cloneData(item);
  if (normalized?.type !== "action") return normalized;

  normalized.type = "ability";
  normalized.system ??= {};
  normalized.system.description ??= "";
  if (!VALID_SKILL_SETS.has(normalized.system.skillSet)) {
    normalized.system.skillSet = "action";
  }
  normalized.system.value = nonNegativeIntegerOrZero(normalized.system.value);
  return normalized;
}


/**
 * Correct old test-build item types before Foundry constructs the embedded
 * Item documents. This runs during Actor.fromSource, before schema validation.
 */
function patchLegacyActorDeserialization() {
  const ActorClass = CONFIG.Actor?.documentClass;
  if (!ActorClass || ActorClass.__htbahCreatorLegacyFromSourcePatched) return;

  const originalFromSource = ActorClass.fromSource;
  if (typeof originalFromSource !== "function") {
    console.warn(`${MODULE_ID} | Could not patch Actor.fromSource; legacy items may need manual repair.`);
    return;
  }

  ActorClass.fromSource = function(source, context) {
    let safeSource = source;
    if (Array.isArray(source?.items) && source.items.some(item => item?.type === "action")) {
      safeSource = cloneData(source);
      let corrected = 0;
      safeSource.items = safeSource.items.map(item => {
        if (item?.type !== "action") return item;
        const normalized = normalizeLegacyActionItem(item);
        normalized.flags ??= {};
        normalized.flags[MODULE_ID] ??= {};
        normalized.flags[MODULE_ID].legacyActionTypeCorrected = true;
        corrected += 1;
        return normalized;
      });
      console.warn(`${MODULE_ID} | Corrected ${corrected} legacy action-typed Item(s) before Actor validation for "${source.name ?? "Unnamed Actor"}".`);
    }
    return originalFromSource.call(this, safeSource, context);
  };

  Object.defineProperty(ActorClass, "__htbahCreatorLegacyFromSourcePatched", { value: true });
}

async function persistLegacyActionRepairs() {
  if (!game.user?.isGM || !game.actors) return;

  for (const actor of game.actors.contents) {
    const repairedItems = actor.items.filter(item => item.getFlag(MODULE_ID, "legacyActionTypeCorrected"));
    if (!repairedItems.length) continue;

    try {
      // Keep each embedded Item's original ID so favorites and UUID references
      // remain valid. The in-memory type was corrected before validation.
      await actor.updateEmbeddedDocuments("Item", repairedItems.map(item => ({
        _id: item.id,
        type: "ability",
        "system.skillSet": VALID_SKILL_SETS.has(item.system?.skillSet) ? item.system.skillSet : "action",
        "system.value": nonNegativeIntegerOrZero(item.system?.value)
      })));
      console.info(`${MODULE_ID} | Persisted ${repairedItems.length} repaired ability Item(s) on Actor "${actor.name}".`);
    } catch (error) {
      console.error(`${MODULE_ID} | Could not persist repaired ability Items on Actor "${actor.name}".`, error);
      ui.notifications.warn(`Alte Fähigkeiten von „${actor.name}“ wurden für diese Sitzung repariert, konnten aber nicht dauerhaft gespeichert werden.`);
    }
  }
}

function shouldOfferCreator(createOptions = {}) {
  return game.system?.id === SYSTEM_ID
    && !createOptions?.[MODULE_ID]?.bypassPrompt
    && !createOptions?.[MODULE_ID]?.silent;
}

/**
 * Wrap the native actor-creation dialog instead of cancelling preCreateActor.
 * Foundry's own createDialog callback expects a real Actor result and attempts
 * to access its sheet; cancelling preCreateActor leaves that result undefined.
 * We let Foundry create the document normally, suppress its automatic sheet
 * render, and then offer the Creator for newly-created character Actors.
 */
function patchActorCreateDialog() {
  const ActorClass = CONFIG.Actor?.documentClass;
  if (!ActorClass || ActorClass.__htbahCreatorCreateDialogPatched) return;

  const originalCreateDialog = ActorClass.createDialog;
  if (typeof originalCreateDialog !== "function") {
    console.warn(`${MODULE_ID} | Actor.createDialog is not available; creation prompt was not installed.`);
    return;
  }

  ActorClass.createDialog = async function(data = {}, createOptions = {}, dialogOptions = {}, renderOptions = {}) {
    if (!shouldOfferCreator(createOptions)) {
      return originalCreateDialog.call(this, data, createOptions, dialogOptions, renderOptions);
    }

    const shouldRenderSheet = createOptions?.renderSheet !== false;
    const safeCreateOptions = { ...(createOptions ?? {}), renderSheet: false };
    const actor = await originalCreateDialog.call(this, data, safeCreateOptions, dialogOptions, renderOptions);
    if (!actor) return actor;

    // NPCs and any other actor types retain the normal Foundry behavior.
    if (actor.type !== "character") {
      if (shouldRenderSheet) actor.sheet?.render(true);
      return actor;
    }

    new HtbahCreationChoiceApp({
      actorId: actor.id,
      actorSource: actor.toObject(),
      shouldRenderSheet
    }).render(true);

    return actor;
  };

  Object.defineProperty(ActorClass, "__htbahCreatorCreateDialogPatched", { value: true });
}

class HtbahCreationChoiceApp extends ApplicationBase {
  constructor({ actorId, actorSource, shouldRenderSheet = true } = {}) {
    super();
    this.actorId = actorId;
    this.actorSource = cloneData(actorSource);
    this.shouldRenderSheet = shouldRenderSheet;
  }

  static DEFAULT_OPTIONS = {
    id: "htbah-character-creator-choice",
    tag: "dialog",
    classes: ["htbah-character-creator", "htbah-character-creator-choice"],
    position: { width: 600, height: "auto" },
    window: {
      title: "How to be a Hero – Charakter erstellen",
      resizable: false,
      minimizable: false
    },
    actions: {
      useCreator: HtbahCreationChoiceApp.prototype._onUseCreator,
      createManually: HtbahCreationChoiceApp.prototype._onCreateManually
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/choice.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      requestedName: this.actorSource?.name || ""
    };
  }

  async _onUseCreator(event) {
    event.preventDefault();
    const actorId = this.actorId;
    const actorSource = this.actorSource;
    await this.close();
    new HtbahCharacterCreatorApp({ actorId, actorSource }).render(true);
  }

  async _onCreateManually(event) {
    event.preventDefault();
    const actorId = this.actorId;
    await this.close();
    const actor = game.actors?.get(actorId);
    if (actor && this.shouldRenderSheet) actor.sheet?.render(true);
  }
}

/**
 * Foundry-native implementation of the HTBAH character-creation workflow.
 * The resulting character is a native character Actor with native ability and
 * inventory Items, rather than an iframe or a printed-only character sheet.
 */
class HtbahCharacterCreatorApp extends ApplicationBase {
  constructor({ actorId, actorSource } = {}) {
    super();
    this.actorId = actorId;
    this.actorSource = cloneData(actorSource);
    this.step = 0;
    this.error = "";
    // ApplicationV2 owns a read-only `state` getter for its lifecycle. Keep
    // creator form data under a distinct property name.
    const savedJob = String(this.actorSource?.flags?.[MODULE_ID]?.profile?.job ?? "");
    const savedJobIsPreset = JOB_VALUES.has(savedJob);
    this.creatorState = {
      name: this.actorSource?.name ?? "",
      age: this.actorSource?.system?.details?.age ?? "",
      health: this.actorSource?.system?.attributes?.health?.max ?? 100,
      portrait: this.actorSource?.img ?? "",
      sex: this.actorSource?.flags?.[MODULE_ID]?.profile?.sex ?? "",
      job: savedJob ? (savedJobIsPreset ? savedJob : CUSTOM_JOB_VALUE) : "",
      jobCustom: savedJob && !savedJobIsPreset ? savedJob : "",
      stature: this.actorSource?.flags?.[MODULE_ID]?.profile?.stature ?? "",
      religion: this.actorSource?.flags?.[MODULE_ID]?.profile?.religion ?? "",
      familyStatus: this.actorSource?.flags?.[MODULE_ID]?.profile?.familyStatus ?? "",
      inventory: this.actorSource?.flags?.[MODULE_ID]?.profile?.inventory ?? "",
      notes: this.actorSource?.flags?.[MODULE_ID]?.profile?.notes ?? "",
      pointBudget: DEFAULT_POINT_BUDGET,
      skills: {
        action: [],
        knowledge: [],
        social: []
      }
    };
    this._liveRoot = null;
    this._boundLiveInput = this._onLiveInput.bind(this);
    this._boundLiveChange = this._onLiveChange.bind(this);
  }

  static DEFAULT_OPTIONS = {
    id: "htbah-character-creator-wizard",
    tag: "dialog",
    classes: ["htbah-character-creator", "htbah-character-creator-wizard"],
    position: { width: 960, height: 790 },
    window: {
      title: "How to be a Hero – Character Creator",
      resizable: true,
      minimizable: false
    },
    actions: {
      previous: HtbahCharacterCreatorApp.prototype._onPrevious,
      next: HtbahCharacterCreatorApp.prototype._onNext,
      addSkill: HtbahCharacterCreatorApp.prototype._onAddSkill,
      removeSkill: HtbahCharacterCreatorApp.prototype._onRemoveSkill,
      choosePortrait: HtbahCharacterCreatorApp.prototype._onChoosePortrait,
      finish: HtbahCharacterCreatorApp.prototype._onFinish,
      cancel: HtbahCharacterCreatorApp.prototype._onCancel,
      goToStep: HtbahCharacterCreatorApp.prototype._onGoToStep
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/creator.hbs` }
  };

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!root || root === this._liveRoot) return;
    if (this._liveRoot) {
      this._liveRoot.removeEventListener("input", this._boundLiveInput);
      this._liveRoot.removeEventListener("change", this._boundLiveChange);
    }
    this._liveRoot = root;
    root.addEventListener("input", this._boundLiveInput);
    root.addEventListener("change", this._boundLiveChange);
    this._toggleCustomJobField();
    this._refreshLivePoints();
  }

  _onLiveInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[name="pointBudget"], [data-skill-name], [data-skill-value]')) return;
    this._readForm();
    this._refreshLivePoints();
  }

  _onLiveChange(event) {
    const target = event.target;
    if (target?.name === "job") {
      this._readForm();
      this._toggleCustomJobField();
    }
  }

  _toggleCustomJobField() {
    const root = this.element;
    const field = root?.querySelector("[data-custom-job-field]");
    const isCustom = this.creatorState.job === CUSTOM_JOB_VALUE;
    if (field) field.hidden = !isCustom;
  }

  _refreshLivePoints() {
    const root = this.element;
    if (!root) return;
    const budget = parseNonNegativeInteger(this.creatorState.pointBudget);
    let assigned = 0;

    for (const category of SKILL_CATEGORIES) {
      const container = root.querySelector(`[data-skill-category="${category.key}"]`);
      // On the skill-entry step read the actual inputs (the DOM is the source
      // of truth while typing). On other wizard steps use the last synced state
      // so the header does not incorrectly fall back to zero.
      const rows = container ? Array.from(container.querySelectorAll("[data-skill-row]")) : [];
      const values = container
        ? rows.map(row => nonNegativeIntegerOrZero(row.querySelector("[data-skill-value]")?.value))
        : (this.creatorState.skills[category.key] ?? []).map(skill => nonNegativeIntegerOrZero(skill.value));
      const rawTotal = values.reduce((sum, value) => sum + value, 0);
      assigned += rawTotal;

      const categorySummary = container?.querySelector("[data-category-summary]");
      if (categorySummary) categorySummary.textContent = `${rawTotal} Punkte`;
      rows.forEach((row, index) => {
        const calculated = row.querySelector("[data-skill-calculated]");
        if (calculated) calculated.textContent = String(values[index]);
      });
    }

    const assignedNode = root.querySelector("[data-live-assigned]");
    const budgetNode = root.querySelector("[data-live-budget]");
    const remainingNode = root.querySelector("[data-live-remaining]");
    const summary = root.querySelector(".htbah-points-summary");
    if (assignedNode) assignedNode.textContent = String(assigned);
    if (budgetNode) budgetNode.textContent = budget === null ? "–" : String(budget);
    if (summary) summary.classList.toggle("is-over-budget", budget !== null && assigned > budget);
    if (remainingNode) {
      if (budget === null) remainingNode.textContent = "Gesamtbudget fehlt";
      else if (assigned > budget) remainingNode.textContent = `${assigned - budget} Punkte über Budget`;
      else remainingNode.textContent = `Noch ${budget - assigned} verfügbar`;
    }
  }

  _getJobValue() {
    return this.creatorState.job === CUSTOM_JOB_VALUE
      ? String(this.creatorState.jobCustom ?? "").trim()
      : String(this.creatorState.job ?? "").trim();
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const categories = SKILL_CATEGORIES.map(category => {
      const skills = this.creatorState.skills[category.key] ?? [];
      const rawTotal = skills.reduce((sum, skill) => sum + nonNegativeIntegerOrZero(skill.value), 0);
      return {
        key: category.key,
        label: getCategoryLabel(category),
        rawTotal,
        skills: skills.map((skill, index) => ({
          name: skill.name,
          value: nonNegativeIntegerOrZero(skill.value),
          calculatedValue: nonNegativeIntegerOrZero(skill.value),
          index
        }))
      };
    });
    const assignedPoints = categories.reduce((sum, category) => sum + category.rawTotal, 0);
    const pointBudget = parseNonNegativeInteger(this.creatorState.pointBudget);
    const fullName = String(this.creatorState.name ?? "").trim();

    return {
      ...context,
      state: this.creatorState,
      step: this.step,
      isStep0: this.step === 0,
      isStep1: this.step === 1,
      isStep2: this.step === 2,
      isStep3: this.step === 3,
      isFirstStep: this.step === 0,
      isLastStep: this.step === 3,
      categories,
      assignedPoints,
      remainingPoints: pointBudget === null ? null : pointBudget - assignedPoints,
      pointBudget,
      hasPointBudget: pointBudget !== null,
      jobIsCustom: this.creatorState.job === CUSTOM_JOB_VALUE,
      jobDisplay: this._getJobValue(),
      jobGroups: JOB_GROUPS.map(group => ({
        label: group.label,
        occupations: group.occupations.map(occupation => ({
          value: occupation,
          selected: this.creatorState.job === occupation
        }))
      })),
      namePreview: fullName || this.actorSource?.name || "Neuer Charakter",
      error: this.error,
      stepLabels: [
        { index: 0, number: 1, label: "Grunddaten" },
        { index: 1, number: 2, label: "Hintergrund" },
        { index: 2, number: 3, label: "Fähigkeiten" },
        { index: 3, number: 4, label: "Übersicht" }
      ]
    };
  }

  _readForm() {
    const root = this.element;
    if (!root) return;

    const read = (name, fallback = this.creatorState[name] ?? "") => root.querySelector(`[name="${name}"]`)?.value ?? fallback;
    for (const name of ["name", "age", "health", "portrait", "sex", "job", "jobCustom", "stature", "religion", "familyStatus", "inventory", "notes", "pointBudget"]) {
      this.creatorState[name] = String(read(name)).trim();
    }

    for (const category of SKILL_CATEGORIES) {
      const container = root.querySelector(`[data-skill-category="${category.key}"]`);
      if (!container) continue;
      this.creatorState.skills[category.key] = Array.from(container.querySelectorAll("[data-skill-row]" )).map(row => ({
        name: String(row.querySelector("[data-skill-name]")?.value ?? "").trim(),
        value: nonNegativeIntegerOrZero(row.querySelector("[data-skill-value]")?.value)
      }));
    }
  }

  _getAssignedPoints() {
    return SKILL_CATEGORIES.reduce((sum, category) => {
      return sum + (this.creatorState.skills[category.key] ?? []).reduce((part, skill) => part + nonNegativeIntegerOrZero(skill.value), 0);
    }, 0);
  }

  _validateSkills() {
    const pointBudget = parseNonNegativeInteger(this.creatorState.pointBudget);
    if (pointBudget === null) {
      this.error = "Bitte gib ein gültiges Gesamtbudget als ganze Zahl ab 0 ein.";
      ui.notifications.warn(this.error);
      return false;
    }

    const assigned = this._getAssignedPoints();
    if (assigned > pointBudget) {
      this.error = `Du hast ${assigned} Punkte verteilt und damit das Budget von ${pointBudget} um ${assigned - pointBudget} Punkte überschritten.`;
      ui.notifications.warn(this.error);
      return false;
    }

    const names = [];
    for (const category of SKILL_CATEGORIES) {
      for (const skill of this.creatorState.skills[category.key] ?? []) {
        if (!skill.name && nonNegativeIntegerOrZero(skill.value) > 0) {
          this.error = "Bitte gib für jede Fähigkeit mit verteilten Punkten einen Namen ein.";
          ui.notifications.warn(this.error);
          return false;
        }
        if (!skill.name) continue;
        const normalized = skill.name.toLocaleLowerCase(game.i18n.lang || undefined);
        if (names.includes(normalized)) {
          this.error = `Die Fähigkeit „${skill.name}“ ist mehrfach eingetragen. Jede Fähigkeit darf nur einmal vorkommen.`;
          ui.notifications.warn(this.error);
          return false;
        }
        names.push(normalized);
      }
    }

    this.error = "";
    return true;
  }

  _onPrevious(event) {
    event.preventDefault();
    this._readForm();
    this.error = "";
    this.step = Math.max(0, this.step - 1);
    this.render(true);
  }

  _onNext(event) {
    event.preventDefault();
    this._readForm();
    if (this.step === 0 && !String(this.creatorState.name ?? "").trim()) {
      this.error = "Bitte gib einen Charakternamen ein.";
      this.render(true);
      return;
    }
    if (this.step === 2 && !this._validateSkills()) {
      this.render(true);
      return;
    }
    this.error = "";
    this.step = Math.min(3, this.step + 1);
    this.render(true);
  }

  _onGoToStep(event, target) {
    event.preventDefault();
    this._readForm();
    const nextStep = Number.parseInt(target.dataset.step, 10);
    if (!Number.isInteger(nextStep) || nextStep < 0 || nextStep > 3) return;
    if (nextStep > this.step && this.step === 2 && !this._validateSkills()) {
      this.render(true);
      return;
    }
    this.error = "";
    this.step = nextStep;
    this.render(true);
  }

  _onAddSkill(event, target) {
    event.preventDefault();
    this._readForm();
    const category = target.dataset.category;
    if (!this.creatorState.skills[category]) return;
    this.creatorState.skills[category].push({ name: "", value: 0 });
    this.render(true);
  }

  _onRemoveSkill(event, target) {
    event.preventDefault();
    this._readForm();
    const category = target.dataset.category;
    const index = Number.parseInt(target.dataset.index, 10);
    if (!this.creatorState.skills[category] || !Number.isInteger(index)) return;
    this.creatorState.skills[category].splice(index, 1);
    this.render(true);
  }

  async _onChoosePortrait(event) {
    event.preventDefault();
    this._readForm();
    if (!globalThis.FilePicker) {
      ui.notifications.warn("Der Foundry-Dateiauswahldialog ist nicht verfügbar.");
      return;
    }
    const picker = new FilePicker({
      type: "image",
      current: this.creatorState.portrait || "",
      callback: path => {
        this.creatorState.portrait = path;
        this.render(true);
      }
    });
    picker.render(true);
  }

  _onCancel(event) {
    event.preventDefault();
    this.close();
  }

  async _onFinish(event) {
    event.preventDefault();
    this._readForm();
    if (!String(this.creatorState.name ?? "").trim()) {
      this.error = "Bitte gib einen Charakternamen ein.";
      this.step = 0;
      this.render(true);
      return;
    }
    if (!this._validateSkills()) {
      this.step = 2;
      this.render(true);
      return;
    }

    const actor = game.actors?.get(this.actorId);
    if (!actor) {
      this.error = "Der zuvor angelegte Foundry-Charakter wurde nicht gefunden. Bitte schließe den Creator und starte die Erstellung erneut.";
      ui.notifications.error(this.error);
      this.render(true);
      return;
    }

    const actorName = String(this.creatorState.name ?? "").trim() || actor.name || "Neuer Charakter";
    const skillItems = [];
    for (const category of SKILL_CATEGORIES) {
      for (const skill of this.creatorState.skills[category.key] ?? []) {
        if (!skill.name) continue;
        skillItems.push({
          name: skill.name,
          type: "ability",
          system: {
            description: "",
            icon: "",
            quantity: 1,
            rollType: "check",
            formula: "d100",
            rollable: false,
            roll: { diceNum: 1, diceSize: "d100", diceBonus: 0 },
            type: "",
            skillSet: category.key,
            value: nonNegativeIntegerOrZero(skill.value)
          }
        });
      }
    }

    const categoryScores = {};
    for (const category of SKILL_CATEGORIES) {
      const rawTotal = (this.creatorState.skills[category.key] ?? []).reduce((sum, skill) => sum + nonNegativeIntegerOrZero(skill.value), 0);
      categoryScores[category.key] = Math.round(rawTotal / 10);
    }

    const health = nonNegativeIntegerOrZero(this.creatorState.health);
    const age = nonNegativeIntegerOrZero(this.creatorState.age);
    const appearance = [
      this.creatorState.sex ? `Geschlecht: ${this.creatorState.sex}` : "",
      this.creatorState.stature ? `Statur: ${this.creatorState.stature}` : ""
    ].filter(Boolean).join("\n");
    const background = [
      this._getJobValue() ? `Beruf: ${this._getJobValue()}` : "",
      this.creatorState.religion ? `Religion: ${this.creatorState.religion}` : "",
      this.creatorState.familyStatus ? `Familienstand: ${this.creatorState.familyStatus}` : "",
      this.creatorState.notes ? `Anmerkungen: ${this.creatorState.notes}` : ""
    ].filter(Boolean).join("\n");

    const updateData = {
      name: actorName,
      "system.attributes.health.value": health,
      "system.attributes.health.max": health,
      "system.attributes.skillSets.action.value": categoryScores.action,
      "system.attributes.skillSets.knowledge.value": categoryScores.knowledge,
      "system.attributes.skillSets.social.value": categoryScores.social,
      "system.details.age": age,
      "system.details.appearance": appearance,
      "system.details.background": background,
      [`flags.${MODULE_ID}.creatorVersion`]: MODULE_VERSION,
      [`flags.${MODULE_ID}.pointBudget`]: parseNonNegativeInteger(this.creatorState.pointBudget),
      [`flags.${MODULE_ID}.profile`]: {
        name: actorName,
        age,
        health,
        sex: this.creatorState.sex,
        job: this._getJobValue(),
        stature: this.creatorState.stature,
        religion: this.creatorState.religion,
        familyStatus: this.creatorState.familyStatus,
        inventory: this.creatorState.inventory,
        notes: this.creatorState.notes
      }
    };
    const portrait = String(this.creatorState.portrait ?? "").trim();
    if (portrait) updateData.img = portrait;

    const inventoryItems = String(this.creatorState.inventory ?? "")
      .split(/\r?\n/)
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({
        name,
        type: "item",
        system: {
          description: "",
          icon: "",
          quantity: 1,
          rollType: "check",
          formula: "",
          rollable: false,
          roll: { diceNum: 1, diceSize: "d10", diceBonus: 0 },
          type: ""
        }
      }));

    this.element?.querySelectorAll("button").forEach(button => button.disabled = true);

    try {
      await actor.update(updateData);
      const embeddedItems = [...inventoryItems, ...skillItems];
      if (embeddedItems.length) await actor.createEmbeddedDocuments("Item", embeddedItems);
      ui.notifications.info(`Charakter „${actor.name}“ wurde mit dem Character Creator fertiggestellt.`);
      await this.close();
      actor.sheet?.render(true);
    } catch (error) {
      console.error(`${MODULE_ID} | Character creation failed`, error);
      this.error = "Der Charakter konnte nicht vollständig aktualisiert werden. Details stehen in der Browser-Konsole.";
      ui.notifications.error(this.error);
      this.element?.querySelectorAll("button").forEach(button => button.disabled = false);
      this.render(true);
    }
  }
}

Hooks.once("init", () => {
  if (game.system?.id !== SYSTEM_ID) return;
  patchLegacyActorDeserialization();
  patchActorCreateDialog();
  console.log(`${MODULE_ID} | Native Actor creation dialog patched for How to be a Hero (module ${MODULE_VERSION}).`);
});

Hooks.once("ready", async () => {
  if (game.system?.id !== SYSTEM_ID) {
    console.warn(`${MODULE_ID} | Requires the '${SYSTEM_ID}' game system; currently '${game.system?.id ?? "unknown"}'.`);
    return;
  }
  await persistLegacyActionRepairs();
  console.log(`${MODULE_ID} | Character Creator ready (module ${MODULE_VERSION}).`);
});
