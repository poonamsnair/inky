import { createEmptyRenderer } from "./renderers/empty-renderer.js";
import { loadProject } from "./project-loader.js";
import { createPreviewPlayer } from "./preview-player.js";

const DEFAULT_PROMPT =
  "Match the storyboard unless I request changes. Remove storyboard-only panel numbers, borders, long arrows, and construction marks. Keep characters, props, speech bubbles, captions, clothing, limbs, and backgrounds readable and consistent.";

const GRID_PRESETS = {
  "3x4": { columns: 3, rows: 4 },
  "4x3": { columns: 4, rows: 3 },
};

export function initInkyApp() {
  const params = new URLSearchParams(window.location.search);
  const projectSlug = params.get("project");
  const exportMode = params.has("export");

  const elements = collectElements();
  wireCreator(elements);

  if (projectSlug) {
    showPreviewMode(elements, { exportMode });
    loadSelectedProject(elements, projectSlug, params, exportMode);
  } else {
    showCreatorMode(elements);
  }
}

function collectElements() {
  return {
    newProjectPanel: document.querySelector("#newProjectPanel"),
    previewPanel: document.querySelector("#previewPanel"),
    form: document.querySelector("#newProjectForm"),
    imageInput: document.querySelector("#storyboardImage"),
    imageMeta: document.querySelector("#imageMeta"),
    imagePreview: document.querySelector("#imagePreview"),
    projectNameInput: document.querySelector("#projectName"),
    gridSelect: document.querySelector("#storyboardGrid"),
    customGridFields: document.querySelector("#customGridFields"),
    customColumnsInput: document.querySelector("#customColumns"),
    customRowsInput: document.querySelector("#customRows"),
    promptInput: document.querySelector("#projectPrompt"),
    projectPlanOutput: document.querySelector("#projectPlanOutput"),
    commandOutput: document.querySelector("#commandOutput"),
    agentPromptOutput: document.querySelector("#agentPromptOutput"),
    copyButton: document.querySelector("#copyProjectPlan"),
    setupStatus: document.querySelector("#setupStatus"),
    createProjectPlanButton: document.querySelector("#createProjectPlan"),
    previewTitle: document.querySelector("#previewTitle"),
  };
}

function showCreatorMode(elements) {
  document.body.classList.remove("export-mode", "preview-mode");
  elements.previewPanel.hidden = true;
  elements.newProjectPanel.hidden = false;
  resetCreator(elements);
}

function showPreviewMode(elements, { exportMode }) {
  document.body.classList.toggle("export-mode", exportMode);
  document.body.classList.add("preview-mode");
  elements.newProjectPanel.hidden = true;
  elements.previewPanel.hidden = false;
}

async function loadSelectedProject(elements, projectSlug, params, exportMode) {
  try {
    const bundle = await loadProject(projectSlug);
    elements.previewTitle.textContent = bundle.manifest.title || bundle.manifest.slug;
    const player = createPreviewPlayer({
      manifest: bundle.manifest,
      renderer: bundle.renderer,
      params,
      exportMode,
    });
    player.start();
    exposePreviewApp(bundle, player);
  } catch (error) {
    console.warn(error);
    const fallbackManifest = {
      slug: projectSlug,
      title: `Project not ready: ${projectSlug}`,
      width: 960,
      height: 620,
      fps: 12,
      totalFrames: 1,
      outputs: {},
    };
    elements.previewTitle.textContent = fallbackManifest.title;
    const player = createPreviewPlayer({
      manifest: fallbackManifest,
      renderer: createEmptyRenderer(`Project "${projectSlug}" is not ready yet`),
      params,
      exportMode,
    });
    player.start();
    exposePreviewApp({ manifest: fallbackManifest, renderer: player.renderer }, player);
  }
}

function wireCreator(elements) {
  let previewUrl = "";
  elements.form.reset();
  elements.projectNameInput.value = "";
  elements.promptInput.value = "";

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderProjectPlan(elements);
  });

  elements.form.addEventListener("input", () => {
    if (!elements.projectPlanOutput.hidden) renderProjectPlan(elements);
  });

  elements.gridSelect.addEventListener("change", () => {
    updateCustomGridVisibility(elements);
    if (!elements.projectPlanOutput.hidden) renderProjectPlan(elements);
  });

  elements.imageInput.addEventListener("change", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";

    const file = elements.imageInput.files?.[0];
    if (!file) {
      elements.imageMeta.textContent = "No storyboard image selected.";
      elements.imagePreview.hidden = true;
      elements.imagePreview.removeAttribute("src");
      return;
    }

    elements.imageMeta.textContent = `${file.name} selected. The app has not loaded it as an animation.`;
    previewUrl = URL.createObjectURL(file);
    elements.imagePreview.src = previewUrl;
    elements.imagePreview.alt = `Preview of ${file.name}`;
    elements.imagePreview.hidden = false;

    if (!elements.projectNameInput.value.trim()) {
      elements.projectNameInput.value = titleFromFileName(file.name);
    }

    if (!elements.projectPlanOutput.hidden) renderProjectPlan(elements);
  });

  elements.copyButton.addEventListener("click", async () => {
    const text = [`# CLI command`, elements.commandOutput.textContent, "", "# Agent prompt", elements.agentPromptOutput.textContent].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      elements.setupStatus.textContent = "Project command and agent prompt copied.";
    } catch {
      elements.setupStatus.textContent = "Copy failed. Select the generated text and copy it manually.";
    }
  });

  updateCustomGridVisibility(elements);
  window.inkyApp = {
    mode: "create",
    activeProject: null,
    getNewProjectDraft: () => currentDraft(elements),
    generateProjectPlan: () => generateProjectPlan(currentDraft(elements)),
  };
}

function resetCreator(elements) {
  elements.form.reset();
  elements.projectNameInput.value = "";
  elements.promptInput.value = "";
  elements.projectPlanOutput.hidden = true;
  elements.createProjectPlanButton.textContent = "Create project plan";
  elements.setupStatus.textContent = "";
  elements.imageMeta.textContent = "No storyboard image selected.";
  elements.imagePreview.hidden = true;
  elements.imagePreview.removeAttribute("src");
  updateCustomGridVisibility(elements);
}

function renderProjectPlan(elements) {
  const draft = currentDraft(elements);
  const plan = generateProjectPlan(draft);

  elements.commandOutput.textContent = plan.command;
  elements.agentPromptOutput.textContent = plan.agentPrompt;
  elements.projectPlanOutput.hidden = false;
  elements.setupStatus.textContent = `Project plan ready for ${draft.slug}.`;
  elements.createProjectPlanButton.textContent = "Update project plan";
}

function currentDraft(elements) {
  const projectName = elements.projectNameInput.value.trim() || titleFromFileName(selectedImageName(elements)) || "new-storyboard-animation";
  const slug = slugify(projectName);
  const grid = selectedGrid(elements);
  const prompt = elements.promptInput.value.trim() || DEFAULT_PROMPT;
  const imageName = selectedImageName(elements);
  const imagePath = elements.imageInput.files?.[0] ? `./${imageName}` : "./storyboards/storyboard.png";

  return {
    projectName,
    slug,
    grid,
    prompt,
    imageName,
    imagePath,
  };
}

function generateProjectPlan(draft) {
  const gridLabel = `${draft.grid.columns}x${draft.grid.rows}`;
  const command = [
    "npm run new --",
    "--image",
    shellQuote(draft.imagePath),
    "--name",
    shellQuote(draft.slug),
    "--grid",
    shellQuote(gridLabel),
    "--prompt",
    shellQuote(draft.prompt),
  ].join(" ");

  const agentPrompt = [
    `# Build Inky animation: ${draft.slug}`,
    "",
    "Use the source storyboard as a lighthouse.",
    "Do not paste the source image into the final animation.",
    "",
    "## Source",
    `- Original storyboard: projects/${draft.slug}/image/storyboard.${extensionFor(draft.imageName)}`,
    `- Extracted frames: projects/${draft.slug}/storyboard/`,
    `- Grid: ${draft.grid.columns} x ${draft.grid.rows}`,
    "",
    "## User request",
    draft.prompt,
    "",
    "## Required work",
    "1. Read AGENTS.md, DESIGN.md, and the relevant skills.",
    "2. Use project.json as the source of truth.",
    `3. Build projects/${draft.slug}/renderer.js.`,
    "4. Use material tools from src/material-tools.js.",
    "5. Add speech/caption tracks only when required.",
    `6. Preview with /?project=${draft.slug}.`,
    "7. Render frames and update outputs.",
  ].join("\n");

  return { command, agentPrompt };
}

function selectedGrid(elements) {
  const selected = elements.gridSelect.value;
  if (selected !== "custom") return GRID_PRESETS[selected] || GRID_PRESETS["3x4"];

  return {
    columns: clampInteger(elements.customColumnsInput.value, 1, 12, 3),
    rows: clampInteger(elements.customRowsInput.value, 1, 12, 4),
  };
}

function updateCustomGridVisibility(elements) {
  const isCustom = elements.gridSelect.value === "custom";
  elements.customGridFields.hidden = !isCustom;
  elements.customColumnsInput.disabled = !isCustom;
  elements.customRowsInput.disabled = !isCustom;
}

function exposePreviewApp(bundle, player) {
  window.inkyApp = {
    mode: "preview",
    activeProject: bundle.manifest.slug,
    manifest: bundle.manifest,
    player,
  };

  window.storyboardApp = {
    activeProject: bundle.manifest.slug,
    hasLoadedAnimation: true,
    totalFrames: bundle.manifest.totalFrames,
    fps: bundle.manifest.fps,
    drawFrame: player.drawFrame,
    setPlaybackSpeed: player.setPlaybackSpeed,
    mp4PathForSpeed: player.mp4PathForSpeed,
  };
}

function selectedImageName(elements) {
  return elements.imageInput.files?.[0]?.name || "storyboard.png";
}

function titleFromFileName(fileName) {
  return String(fileName)
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "new-storyboard-animation"
  );
}

function extensionFor(fileName) {
  const match = String(fileName).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "png";
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
