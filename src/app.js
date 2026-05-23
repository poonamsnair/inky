import { createEmptyRenderer } from "./renderers/empty-renderer.js";
import { loadProject } from "./project-loader.js";
import { createPreviewPlayer } from "./preview-player.js";

const DEFAULT_PROMPT =
  "Use the reference image to plan the composition. Draw the animation with src/inky-canvas.js primitives, choosing brush and timing parameters by eye during preview.";

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
    const inkyError = error?.inky;
    const fallbackManifest = inkyError?.manifest || {
      slug: projectSlug,
      title: `Project not ready: ${projectSlug}`,
      width: 960,
      height: 620,
      fps: 12,
      totalFrames: 1,
      outputs: {},
    };
    elements.previewTitle.textContent = fallbackManifest.title;
    const renderer = inkyError
      ? createErrorRenderer(fallbackManifest, inkyError)
      : createEmptyRenderer(`Project "${projectSlug}" is not ready yet`);
    const player = createPreviewPlayer({
      manifest: fallbackManifest,
      renderer,
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

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createProjectFromStoryboard(elements);
  });

  elements.form.addEventListener("input", () => {
    if (!elements.projectPlanOutput.hidden) {
      renderProjectPlan(elements, {
        status: "Project details changed. Create or update the local project files when ready.",
        buttonText: "Update project files",
      });
    }
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
      elements.imageMeta.textContent = "No reference image selected.";
      elements.imagePreview.hidden = true;
      elements.imagePreview.removeAttribute("src");
      return;
    }

    elements.imageMeta.textContent = `${file.name} selected. Create project files to save it into the repo.`;
    previewUrl = URL.createObjectURL(file);
    elements.imagePreview.src = previewUrl;
    elements.imagePreview.alt = `Preview of ${file.name}`;
    elements.imagePreview.hidden = false;

    if (!elements.projectNameInput.value.trim()) {
      elements.projectNameInput.value = titleFromFileName(file.name);
    }

    if (!elements.projectPlanOutput.hidden) {
      renderProjectPlan(elements, {
        status: "Storyboard changed. Create or update the local project files when ready.",
        buttonText: "Update project files",
      });
    }
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
  elements.createProjectPlanButton.textContent = "Create project files";
  elements.setupStatus.textContent = "";
  elements.imageMeta.textContent = "No reference image selected.";
  elements.imagePreview.hidden = true;
  elements.imagePreview.removeAttribute("src");
  updateCustomGridVisibility(elements);
}

async function createProjectFromStoryboard(elements) {
  const draft = currentDraft(elements);
  const file = elements.imageInput.files?.[0];

  renderProjectPlan(elements, {
    status: file ? `Preparing project files for ${draft.slug}...` : "Choose a reference image before creating project files.",
    buttonText: "Create project files",
  });

  if (!file) return;

  elements.createProjectPlanButton.disabled = true;
  elements.createProjectPlanButton.textContent = "Creating project files...";

  try {
    const imageDataUrl = await readFileAsDataUrl(file);
    const response = await fetch("/api/projects/from-storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: draft.projectName,
        slug: draft.slug,
        grid: draft.grid,
        prompt: draft.prompt,
        imageName: file.name,
        imageDataUrl,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Local project save is unavailable.");
    }

    elements.commandOutput.textContent = result.command || generateProjectPlan(draft).command;
    elements.agentPromptOutput.textContent = result.agentPrompt || generateProjectPlan(draft).agentPrompt;
    elements.projectPlanOutput.hidden = false;
    elements.setupStatus.textContent = `Project files created at ${result.projectPath}. Preview: ${result.previewPath}`;
    elements.createProjectPlanButton.textContent = "Update project files";
  } catch (error) {
    renderProjectPlan(elements, {
      status: `${error.message} The copyable CLI command and agent prompt are still ready.`,
      buttonText: "Create project files",
    });
  } finally {
    elements.createProjectPlanButton.disabled = false;
  }
}

function renderProjectPlan(elements, options = {}) {
  const draft = currentDraft(elements);
  const plan = generateProjectPlan(draft);

  elements.commandOutput.textContent = plan.command;
  elements.agentPromptOutput.textContent = plan.agentPrompt;
  elements.projectPlanOutput.hidden = false;
  elements.setupStatus.textContent = options.status || `Project plan ready for ${draft.slug}. Create project files to save it locally.`;
  elements.createProjectPlanButton.textContent = options.buttonText || "Create project files";
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
    "Use Inky as a Canvas API for agents.",
    "Look at the reference, write drawing code, preview, compare, and tune the brush/timing values by eye.",
    "Do not paste the source image into the final animation.",
    "",
    "## Source",
    `- Reference image: projects/${draft.slug}/image/storyboard.${extensionFor(draft.imageName)}`,
    `- Optional extracted frames: projects/${draft.slug}/storyboard/`,
    `- Grid: ${draft.grid.columns} x ${draft.grid.rows}`,
    "",
    "## User request",
    draft.prompt,
    "",
    "## Required work",
    "1. Read AGENTS.md, DESIGN.md, and the relevant skills.",
    "2. Use project.json as the source of truth.",
    `3. Build projects/${draft.slug}/renderer.js.`,
    "4. Import createBrush, keyframe, timeline, and easings from src/inky-canvas.js.",
    "5. Import optional companions from src/companion-tools.js only when the panel needs Rough.js, Atrament replay, irregular geometry, svg2roughjs, Vivus, or p5.brush.",
    "6. Use window.inky.showReference('image/storyboard.<ext>', { opacity: 0.3 }) in the browser while aligning, then hide it before judging exports.",
    "7. Add speech/caption tracks only when required.",
    `8. Preview with /?project=${draft.slug}.`,
    "9. Render frames and update outputs.",
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
  const previewApi = {
    activeProject: bundle.manifest.slug,
    manifest: bundle.manifest,
    showReference: player.showReference,
    hideReference: player.hideReference,
    setReferenceOpacity: player.setReferenceOpacity,
    captureFrameDataUrl: player.captureFrameDataUrl,
    goToFrame: player.goToFrame,
    inspectFrame: player.inspectFrame,
  };

  window.inkyApp = {
    mode: "preview",
    activeProject: bundle.manifest.slug,
    manifest: bundle.manifest,
    player,
    inky: previewApi,
  };

  window.inky = previewApi;

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

function createErrorRenderer(manifest, loadError) {
  return {
    project: {
      width: manifest.width || 960,
      height: manifest.height || 620,
      fps: manifest.fps || 12,
      totalFrames: manifest.totalFrames || 1,
    },
    rendererPath: loadError.renderer,
    exportNames: ["drawFrame"],
    loadError,
    getFrameDebug() {
      return { loadError };
    },
    drawFrame(ctx, frame, helpers = {}) {
      if (helpers.drawRendererError) {
        helpers.drawRendererError(ctx, loadError, manifest);
      } else {
        ctx.fillStyle = "#fff5ee";
        ctx.fillRect(0, 0, manifest.width || 960, manifest.height || 620);
        helpers.drawLabel?.(ctx, loadError.message || "Renderer error", (manifest.width || 960) / 2, (manifest.height || 620) / 2);
      }
    },
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("Could not read the selected storyboard image.")));
    reader.readAsDataURL(file);
  });
}
