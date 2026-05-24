import { createEmptyRenderer } from "./renderers/empty-renderer.js";
import { loadProject } from "./project-loader.js";
import { createPreviewPlayer } from "./preview-player.js";
import { createProjectContext } from "./project-context.js";

const DEFAULT_PROMPT =
  "Use /image image/storyboard.png as the target scene. Treat Inky as a Canvas API and preview loop for agents: look at the target, choose explicit brush parameters, draw with src/inky-canvas.js primitives, compare against window.inky.showReference(), and tune by eye. If /style insp/<file> references are provided, analyze them with window.inky.analyzeStyle(); otherwise match the target image's own style. Use window.inky.extractPathsFromImage() only as coordinate scaffolding when contours matter. Keep source and style images out of final frames.";

const AUTO_GRID = Object.freeze({ mode: "auto", columns: 3, rows: 4 });
const PENDING_SCENE_NAVIGATION_KEY = "inky.pendingSceneNavigation";

export function initInkyApp() {
  const params = new URLSearchParams(window.location.search);
  const projectSlug = params.get("project");
  const exportMode = params.has("export");

  const elements = collectElements();
  wireProjectNavigation(elements, projectRootRefForNav(projectSlug));
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
    projectJump: document.querySelector("#projectJump"),
    projectJumpStatus: document.querySelector("#projectJumpStatus"),
    form: document.querySelector("#newProjectForm"),
    imageInput: document.querySelector("#storyboardImage"),
    imageMeta: document.querySelector("#imageMeta"),
    imagePreview: document.querySelector("#imagePreview"),
    styleInput: document.querySelector("#styleReferenceImages"),
    styleDropZone: document.querySelector("#styleDropZone"),
    styleMeta: document.querySelector("#styleMeta"),
    stylePreviewList: document.querySelector("#stylePreviewList"),
    promptCommandBar: document.querySelector("#promptCommandBar"),
    projectNameInput: document.querySelector("#projectName"),
    promptInput: document.querySelector("#projectPrompt"),
    projectPlanOutput: document.querySelector("#projectPlanOutput"),
    commandOutput: document.querySelector("#commandOutput"),
    agentPromptOutput: document.querySelector("#agentPromptOutput"),
    copyButton: document.querySelector("#copyProjectPlan"),
    setupStatus: document.querySelector("#setupStatus"),
    createProjectPlanButton: document.querySelector("#createProjectPlan"),
    previewTitle: document.querySelector("#previewTitle"),
    scenePanel: document.querySelector("#scenePanel"),
    sceneSelect: document.querySelector("#sceneSelect"),
    sceneRenameEditor: document.querySelector("#sceneRenameEditor"),
    sceneNameInput: document.querySelector("#sceneName"),
    saveSceneButton: document.querySelector("#saveScene"),
    renameSceneButton: document.querySelector("#renameScene"),
    applyRenameSceneButton: document.querySelector("#applyRenameScene"),
    cancelRenameSceneButton: document.querySelector("#cancelRenameScene"),
    newSceneEditor: document.querySelector("#newSceneEditor"),
    sceneImageInput: document.querySelector("#sceneReferenceImage"),
    sceneImageMeta: document.querySelector("#sceneImageMeta"),
    sceneImagePreview: document.querySelector("#sceneImagePreview"),
    sceneStyleInput: document.querySelector("#sceneStyleReferenceImages"),
    sceneStyleDropZone: document.querySelector("#sceneStyleDropZone"),
    sceneStyleMeta: document.querySelector("#sceneStyleMeta"),
    sceneStylePreviewList: document.querySelector("#sceneStylePreviewList"),
    scenePromptCommandBar: document.querySelector("#scenePromptCommandBar"),
    newSceneBriefInput: document.querySelector("#newSceneBrief"),
    scenePlanOutput: document.querySelector("#scenePlanOutput"),
    sceneAgentPromptOutput: document.querySelector("#sceneAgentPromptOutput"),
    copyScenePromptButton: document.querySelector("#copyScenePrompt"),
    generateSceneButton: document.querySelector("#generateScene"),
    cancelNewSceneButton: document.querySelector("#cancelNewScene"),
    deleteSceneButton: document.querySelector("#deleteScene"),
    newSceneButton: document.querySelector("#newScene"),
    sceneStatus: document.querySelector("#sceneStatus"),
  };
}

function showCreatorMode(elements) {
  document.body.classList.remove("export-mode", "preview-mode");
  elements.previewPanel.hidden = true;
  if (elements.scenePanel) elements.scenePanel.hidden = true;
  elements.newProjectPanel.hidden = false;
  resetCreator(elements);
}

function showPreviewMode(elements, { exportMode }) {
  document.body.classList.toggle("export-mode", exportMode);
  document.body.classList.add("preview-mode");
  elements.newProjectPanel.hidden = true;
  elements.previewPanel.hidden = false;
  if (elements.scenePanel) elements.scenePanel.hidden = exportMode;
}

async function loadSelectedProject(elements, projectSlug, params, exportMode) {
  try {
    const bundle = await loadProject(projectSlug);
    refreshProjectNavigation(elements, projectRefForManifest(bundle.manifest));
    elements.previewTitle.textContent = bundle.manifest.title || bundle.manifest.slug;
    const player = createPreviewPlayer({
      manifest: bundle.manifest,
      renderer: bundle.renderer,
      params,
      exportMode,
    });
    player.start();
    exposePreviewApp(bundle, player);
    if (!exportMode) await wireSceneLibrary(elements, bundle.manifest);
  } catch (error) {
    console.warn(error);
    refreshProjectNavigation(elements, projectRootRefForNav(projectSlug));
    if (elements.scenePanel) elements.scenePanel.hidden = true;
    const inkyError = error?.inky;
    const fallbackManifest = inkyError?.manifest || {
      slug: projectSlug,
      projectRef: projectSlug,
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

function wireProjectNavigation(elements, activeProjectRef = "") {
  if (!elements.projectJump) return;

  elements.projectJump.addEventListener("change", () => {
    const nextProjectRef = elements.projectJump.value;
    if (nextProjectRef) navigateToProject(nextProjectRef);
  });

  refreshProjectNavigation(elements, activeProjectRef);
}

async function refreshProjectNavigation(elements, activeProjectRef = "") {
  if (!elements.projectJump) return;

  const requestId = (elements.projectNavigationRequestId || 0) + 1;
  elements.projectNavigationRequestId = requestId;
  const activeRef = projectRootRefForNav(activeProjectRef);
  renderProjectJump(elements, [], activeRef, { loading: true });

  try {
    const response = await fetch("/api/projects", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Saved projects could not be loaded.");
    }
    if (elements.projectNavigationRequestId !== requestId) return;
    renderProjectJump(elements, result.projects, activeRef);
  } catch (error) {
    if (elements.projectNavigationRequestId !== requestId) return;
    console.warn(error);
    renderProjectJump(elements, [], activeRef, { error: true });
  }
}

function renderProjectJump(elements, projects, activeProjectRef = "", state = {}) {
  const select = elements.projectJump;
  if (!select) return;

  const savedProjects = Array.isArray(projects) ? projects : [];
  const activeRef = normalizeProjectRefForNav(activeProjectRef);
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.loading ? "Loading projects..." : state.error ? "Projects unavailable" : "Jump to project";

  let activeProjectFound = false;
  const options = savedProjects.map((project) => {
    const projectRef = normalizeProjectRefForNav(project.projectRef || project.slug);
    const option = document.createElement("option");
    option.value = projectRef;
    option.textContent = projectOptionLabel(project);
    if (activeRef && projectRef === activeRef) {
      option.selected = true;
      activeProjectFound = true;
    }
    return option;
  });

  if (activeRef && !activeProjectFound) {
    const currentOption = document.createElement("option");
    currentOption.value = activeRef;
    currentOption.textContent = `Current: ${activeRef}`;
    currentOption.selected = true;
    options.unshift(currentOption);
  } else if (!activeRef) {
    placeholder.selected = true;
  }

  select.replaceChildren(placeholder, ...options);
  select.disabled = state.loading || state.error || (!savedProjects.length && !activeRef);

  if (elements.projectJumpStatus) {
    const rootCount = savedProjects.filter((project) => !project.isScene).length;
    if (state.loading) {
      elements.projectJumpStatus.textContent = "Loading...";
    } else if (state.error) {
      elements.projectJumpStatus.textContent = "Could not load projects";
    } else if (!savedProjects.length) {
      elements.projectJumpStatus.textContent = "No saved projects";
    } else {
      elements.projectJumpStatus.textContent = `${rootCount || savedProjects.length} saved`;
    }
  }
}

function projectOptionLabel(project) {
  return String(project?.title || project?.slug || project?.projectRef || "Untitled project").trim();
}

function projectRefForManifest(manifest = {}) {
  const context = createProjectContext(manifest);
  return projectRootRefForNav(context.project?.projectRef || context.project?.slug || manifest.slug);
}

function navigateToProject(projectRef) {
  const safeProjectRef = projectRootRefForNav(projectRef);
  if (!safeProjectRef) return;

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("project", safeProjectRef);
  nextUrl.searchParams.delete("export");
  window.location.href = nextUrl.href;
}

function projectRootRefForNav(projectRef) {
  const safeProjectRef = normalizeProjectRefForNav(projectRef);
  return safeProjectRef.split("/scenes/")[0] || safeProjectRef;
}

function wireCreator(elements) {
  let previewUrl = "";
  elements.styleReferences = [];
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

  elements.imageInput.addEventListener("change", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";

    const file = elements.imageInput.files?.[0];
    if (!file) {
      elements.imageMeta.textContent = "No reference image selected.";
      elements.imagePreview.hidden = true;
      elements.imagePreview.removeAttribute("src");
      renderPromptCommands(elements);
      return;
    }

    elements.imageMeta.textContent = `${file.name} selected. Use ${imageCommandFor(file.name)} in the prompt.`;
    previewUrl = URL.createObjectURL(file);
    elements.imagePreview.src = previewUrl;
    elements.imagePreview.alt = `Preview of ${file.name}`;
    elements.imagePreview.hidden = false;

    if (!elements.projectNameInput.value.trim()) {
      elements.projectNameInput.value = titleFromFileName(file.name);
    }

    if (!elements.projectPlanOutput.hidden) {
      renderProjectPlan(elements, {
        status: "Image to draw changed. Create or update the local project files when ready.",
        buttonText: "Update project files",
      });
    }
    renderPromptCommands(elements);
  });

  wireStyleReferences(elements);
  renderStyleReferences(elements);
  renderPromptCommands(elements);

  elements.copyButton.addEventListener("click", async () => {
    const text = [`# CLI command`, elements.commandOutput.textContent, "", "# Agent prompt", elements.agentPromptOutput.textContent].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      elements.setupStatus.textContent = "Project command and agent prompt copied.";
    } catch {
      elements.setupStatus.textContent = "Copy failed. Select the generated text and copy it manually.";
    }
  });

  window.inkyApp = {
    mode: "create",
    activeProject: null,
    getNewProjectDraft: () => currentDraft(elements),
    generateProjectPlan: () => generateProjectPlan(currentDraft(elements)),
  };
}

function resetCreator(elements) {
  revokeStylePreviews(elements);
  elements.form.reset();
  elements.projectNameInput.value = "";
  elements.promptInput.value = "";
  elements.styleReferences = [];
  elements.projectPlanOutput.hidden = true;
  elements.createProjectPlanButton.textContent = "Create project files";
  elements.setupStatus.textContent = "";
  elements.imageMeta.textContent = "No reference image selected.";
  elements.styleMeta.textContent = "No style references selected.";
  elements.stylePreviewList.replaceChildren();
  elements.imagePreview.hidden = true;
  elements.imagePreview.removeAttribute("src");
  renderPromptCommands(elements);
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
    const [imageDataUrl, styleReferences] = await Promise.all([
      readFileAsDataUrl(file),
      Promise.all(
        draft.styleReferences.map(async (reference) => ({
          name: reference.name,
          savedName: reference.savedName,
          type: reference.type,
          dataUrl: await readFileAsDataUrl(reference.file),
        })),
      ),
    ]);
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
        styleReferences,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Local project save is unavailable.");
    }

    elements.commandOutput.textContent = result.command || generateProjectPlan(draft).command;
    elements.agentPromptOutput.textContent = result.agentPrompt || generateProjectPlan(draft).agentPrompt;
    elements.projectPlanOutput.hidden = false;
    const styleCount = styleReferences.length ? ` Style refs saved: ${styleReferences.length}.` : "";
    elements.setupStatus.textContent = `Project files created at ${result.projectPath}.${styleCount} Preview: ${result.previewPath}`;
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
  const styleReferences = selectedStyleReferences(elements);

  return {
    projectName,
    slug,
    grid,
    prompt,
    imageName,
    imagePath,
    styleReferences,
  };
}

function generateProjectPlan(draft) {
  const command = [
    "npm run new --",
    "--image",
    shellQuote(draft.imagePath),
    "--name",
    shellQuote(draft.slug),
    "--prompt",
    shellQuote(draft.prompt),
    ...draft.styleReferences.flatMap((reference) => ["--style", shellQuote(`./${reference.name}`)]),
  ].join(" ");
  const imageCommand = imageCommandFor(draft.imageName);
  const styleLines = draft.styleReferences.length
    ? draft.styleReferences.map((reference) => `- ${reference.command} (${reference.name})`)
    : [`- /style insp/<file> for optional style images saved in projects/${draft.slug}/insp/`];

  const agentPrompt = [
    `# Build Inky animation: ${draft.slug}`,
    "",
    "Use Inky as a Canvas API and visual feedback loop for agents.",
    "Look at the reference, decide the likely medium, choose explicit brush parameters, preview, compare against the reference overlay, and tune brush/timing values by eye.",
    "Use any files in insp/ as a style palette for color, mood, line quality, and texture. If no style reference is provided, match the target image's own style. Do not paste source or style images into the final animation.",
    "",
    "## Source",
    `- Reference image: projects/${draft.slug}/image/storyboard.${extensionFor(draft.imageName)}`,
    `- Style references folder: projects/${draft.slug}/insp/`,
    `- Optional extracted frames: projects/${draft.slug}/storyboard/`,
    `- Grid: ${draft.grid.mode === "auto" ? "agent infers from the target image" : `${draft.grid.columns} x ${draft.grid.rows}`}`,
    "",
    "## Slash references",
    `- ${imageCommand} (target scene/storyboard)`,
    ...styleLines,
    "",
    "## User request",
    draft.prompt,
    "",
    "## Required work",
    "1. Read AGENTS.md, DESIGN.md, and the relevant skills.",
    "2. Use project.json as the source of truth.",
    `3. Build projects/${draft.slug}/renderer.js.`,
    "4. Import createBrush, listBrushes, keyframe, timeline, and easings from src/inky-canvas.js.",
    "5. Interpret slash references in the user request: /image points to the target scene, and /style points to one or more artistic reference images.",
    "6. Look at the target image first and decide whether it is one scene or a multi-panel storyboard. If it is a storyboard, infer the grid visually before extracting panels.",
    "7. If the prompt names an insp/<file> style reference, call window.inky.analyzeStyle('insp/<file>') and describe the medium, palette, mood, line quality, texture, and composition before drawing. If no style reference is named, derive those style choices from the target image.",
    "8. Use window.inky.showReference('image/storyboard.<ext>', { opacity: 0.3 }) while aligning, then hide it before judging exports.",
    "9. Capture your canvas with window.inky.captureFrameDataUrl(frame) when a still image helps you compare and self-correct.",
    "10. Use window.inky.extractPathsFromImage('image/storyboard.<ext>', { mode: 'outline' }) only as coordinate scaffolding when exact contours matter; redraw those coordinates with Inky brushes.",
    "11. Load style-tokens.json with window.inky.loadStyleTokens() when present, and treat it as editable guidance for palette and brush contracts.",
    "12. Analyze the storyboard and style references, choose from listBrushes() ['pencil', 'charcoal', 'crayon', 'watercolor'], and test at least two plausible brushes when the medium is not obvious.",
    "13. Use the selected brush when drawing paths and tune size, thinning, smoothing, streamline, jitter, textureScale, color, roughness, opacity, and seed before writing lower-level texture code.",
    "14. Compose motion with keyframe(), timeline(), and easings; expose useful getFrameDebug() values for frame-by-frame inspection.",
    "15. Create storyboard/scene-objects.json only for elements that should be manually selectable later. Use stable IDs, frameRange, transform, animation, and brush settings.",
    "16. Import optional companions from src/companion-tools.js only when the panel needs Rough.js, Atrament replay, irregular geometry, svg2roughjs, Vivus draw-on animation, p5.brush, or image path helpers.",
    "17. Add speech/caption tracks only when required.",
    `18. Preview with /?project=${draft.slug}.`,
    "19. Render frames and update outputs.",
  ].join("\n");

  return { command, agentPrompt };
}

function wireStyleReferences(elements) {
  elements.styleInput.addEventListener("change", () => {
    addStyleFiles(elements, elements.styleInput.files);
    elements.styleInput.value = "";
  });

  elements.styleDropZone.addEventListener("click", (event) => {
    if (event.target === elements.styleInput) return;
    elements.styleInput.click();
  });

  elements.styleDropZone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    elements.styleInput.click();
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.styleDropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.styleDropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.styleDropZone.addEventListener(eventName, () => {
      elements.styleDropZone.classList.remove("is-dragging");
    });
  });

  elements.styleDropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    addStyleFiles(elements, event.dataTransfer?.files);
  });
}

function addStyleFiles(elements, fileList) {
  const files = [...(fileList || [])].filter((file) => file.type?.startsWith("image/"));
  if (!files.length) return;

  const nextReferences = files.map((file) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  elements.styleReferences.push(...nextReferences);
  renderStyleReferences(elements);
  renderPromptCommands(elements);

  if (!elements.projectPlanOutput.hidden) {
    renderProjectPlan(elements, {
      status: "Style references changed. Create or update the local project files when ready.",
      buttonText: "Update project files",
    });
  }
}

function removeStyleReference(elements, id) {
  const reference = elements.styleReferences.find((item) => item.id === id);
  if (reference?.previewUrl) URL.revokeObjectURL(reference.previewUrl);
  elements.styleReferences = elements.styleReferences.filter((item) => item.id !== id);
  renderStyleReferences(elements);
  renderPromptCommands(elements);

  if (!elements.projectPlanOutput.hidden) {
    renderProjectPlan(elements, {
      status: "Style references changed. Create or update the local project files when ready.",
      buttonText: "Update project files",
    });
  }
}

function renderStyleReferences(elements) {
  const references = selectedStyleReferences(elements);
  elements.styleMeta.textContent = references.length
    ? `${references.length} style reference${references.length === 1 ? "" : "s"} selected.`
    : "No style references selected.";

  elements.stylePreviewList.replaceChildren(
    ...references.map((reference) => {
      const item = document.createElement("li");
      item.className = "style-preview-item";

      const image = document.createElement("img");
      image.src = reference.previewUrl;
      image.alt = "";

      const details = document.createElement("div");
      details.className = "style-preview-details";

      const name = document.createElement("strong");
      name.textContent = reference.name;

      const command = document.createElement("button");
      command.type = "button";
      command.className = "command-chip";
      command.textContent = reference.command;
      command.addEventListener("click", () => insertPromptCommand(elements, reference.command));

      details.append(name, command);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "style-remove-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removeStyleReference(elements, reference.id));

      item.append(image, details, removeButton);
      return item;
    }),
  );
}

function renderPromptCommands(elements) {
  const draftImageName = selectedImageName(elements);
  const commands = [
    {
      label: imageCommandFor(draftImageName),
      value: imageCommandFor(draftImageName),
    },
    ...selectedStyleReferences(elements).map((reference) => ({
      label: reference.command,
      value: reference.command,
    })),
  ];

  elements.promptCommandBar.replaceChildren(
    ...commands.map((command) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "command-chip";
      button.textContent = command.label;
      button.addEventListener("click", () => insertPromptCommand(elements, command.value));
      return button;
    }),
  );
}

function insertPromptCommand(elements, command) {
  const input = elements.promptInput;
  const value = input.value;
  const start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? value.length;
  const prefix = start > 0 && !/\s$/.test(value.slice(0, start)) ? " " : "";
  const suffix = end < value.length && !/^\s/.test(value.slice(end)) ? " " : "";
  const nextValue = `${value.slice(0, start)}${prefix}${command}${suffix}${value.slice(end)}`;
  input.value = nextValue;
  const cursor = start + prefix.length + command.length + suffix.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function selectedStyleReferences(elements) {
  const used = new Set();
  return (elements.styleReferences || []).map((reference, index) => {
    const file = reference.file;
    const savedName = styleReferenceFileName(file.name, index, used);
    return {
      id: reference.id,
      file,
      previewUrl: reference.previewUrl,
      name: file.name,
      savedName,
      type: file.type,
      path: `insp/${savedName}`,
      command: `/style insp/${savedName}`,
    };
  });
}

function styleReferenceFileName(fileName, index, used) {
  const extension = extensionFor(fileName);
  const base = slugifyFileBase(titleFromFileName(fileName));
  const prefix = `style-${String(index + 1).padStart(2, "0")}`;
  let candidate = `${prefix}-${base}.${extension}`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${prefix}-${base}-${suffix}.${extension}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function imageCommandFor(fileName) {
  return `/image image/storyboard.${extensionFor(fileName)}`;
}

function revokeStylePreviews(elements) {
  for (const reference of elements.styleReferences || []) {
    if (reference.previewUrl) URL.revokeObjectURL(reference.previewUrl);
  }
}

function selectedGrid(elements) {
  return { ...AUTO_GRID };
}

function wireNewSceneEditor(elements, manifest) {
  resetNewSceneEditor(elements);

  if (elements.sceneImageInput) {
    elements.sceneImageInput.onchange = () => {
      updateSceneImagePreview(elements);
      renderScenePromptCommands(elements);
    };
  }

  wireSceneStyleReferences(elements);
  renderSceneStyleReferences(elements);
  renderScenePromptCommands(elements);

  if (elements.copyScenePromptButton) {
    elements.copyScenePromptButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(elements.sceneAgentPromptOutput?.textContent || "");
        elements.sceneStatus.textContent = "Scene agent prompt copied.";
      } catch {
        elements.sceneStatus.textContent = "Copy failed. Select the generated prompt and copy it manually.";
      }
    };
  }

  if (elements.cancelNewSceneButton) {
    elements.cancelNewSceneButton.onclick = () => {
      hideNewSceneEditor(elements);
      elements.sceneStatus.textContent = sceneLibraryStatus(elements.sceneLibrary || {}, manifest.slug);
    };
  }

  if (elements.generateSceneButton) {
    elements.generateSceneButton.onclick = async () => {
      await runSceneAction(elements, "Copying the current scene...", async () => {
        const draft = await currentSceneDraft(elements);
        const result = await createNextScene(manifest.slug, draft);
        if (elements.sceneAgentPromptOutput) {
          elements.sceneAgentPromptOutput.textContent = result.agentPrompt || "";
        }
        if (elements.scenePlanOutput) {
          elements.scenePlanOutput.hidden = !result.agentPrompt;
        }
        const refreshedLibrary = await loadSceneLibrary(manifest.slug);
        renderSceneLibrary(elements, refreshedLibrary, manifest.slug);
        if (window.inkyApp?.scenes) {
          window.inkyApp.scenes.library = refreshedLibrary;
        }
        const sceneNumber = String(result.scene?.order || "").padStart(2, "0");
        const styleMessage = draft.styleReferences.length
          ? `${draft.styleReferences.length} scene style reference${draft.styleReferences.length === 1 ? "" : "s"} saved.`
          : "No new scene style was added, so the copied scene style stays in place.";
        elements.sceneStatus.textContent = `Scene ${sceneNumber} copied from the current scene. ${styleMessage} Copy the prompt, then open it from the scene dropdown.`;
        return result;
      });
    };
  }
}

function showNewSceneEditor(elements) {
  if (!elements.newSceneEditor) return;
  elements.newSceneEditor.hidden = false;
  elements.sceneStatus.textContent = "Add optional scene details, then copy the current scene as the starting point.";
  elements.sceneImageInput?.focus();
}

function hideNewSceneEditor(elements) {
  resetNewSceneEditor(elements);
  if (elements.newSceneEditor) elements.newSceneEditor.hidden = true;
}

function resetNewSceneEditor(elements) {
  if (elements.sceneImagePreviewUrl) {
    URL.revokeObjectURL(elements.sceneImagePreviewUrl);
    elements.sceneImagePreviewUrl = "";
  }
  revokeSceneStylePreviews(elements);
  elements.sceneStyleReferences = [];
  if (elements.sceneImageInput) elements.sceneImageInput.value = "";
  if (elements.newSceneBriefInput) elements.newSceneBriefInput.value = "";
  if (elements.sceneImageMeta) {
    elements.sceneImageMeta.textContent = "No new scene image selected. The copied scene image stays in place.";
  }
  if (elements.sceneImagePreview) {
    elements.sceneImagePreview.hidden = true;
    elements.sceneImagePreview.removeAttribute("src");
  }
  if (elements.scenePlanOutput) elements.scenePlanOutput.hidden = true;
  if (elements.sceneAgentPromptOutput) elements.sceneAgentPromptOutput.textContent = "";
  renderSceneStyleReferences(elements);
  renderScenePromptCommands(elements);
}

function updateSceneImagePreview(elements) {
  if (elements.sceneImagePreviewUrl) {
    URL.revokeObjectURL(elements.sceneImagePreviewUrl);
    elements.sceneImagePreviewUrl = "";
  }

  const file = elements.sceneImageInput?.files?.[0];
  if (!file) {
    if (elements.sceneImageMeta) {
      elements.sceneImageMeta.textContent = "No new scene image selected. The copied scene image stays in place.";
    }
    if (elements.sceneImagePreview) {
      elements.sceneImagePreview.hidden = true;
      elements.sceneImagePreview.removeAttribute("src");
    }
    return;
  }

  const command = sceneImageCommandFor(file.name);
  elements.sceneImagePreviewUrl = URL.createObjectURL(file);
  if (elements.sceneImageMeta) {
    elements.sceneImageMeta.textContent = `${file.name} selected. Use ${command} in the scene prompt.`;
  }
  if (elements.sceneImagePreview) {
    elements.sceneImagePreview.src = elements.sceneImagePreviewUrl;
    elements.sceneImagePreview.alt = `Preview of ${file.name}`;
    elements.sceneImagePreview.hidden = false;
  }
}

function wireSceneStyleReferences(elements) {
  if (!elements.sceneStyleInput || !elements.sceneStyleDropZone) return;

  elements.sceneStyleInput.onchange = () => {
    addSceneStyleFiles(elements, elements.sceneStyleInput.files);
    elements.sceneStyleInput.value = "";
  };

  elements.sceneStyleDropZone.onclick = (event) => {
    if (event.target === elements.sceneStyleInput) return;
    elements.sceneStyleInput.click();
  };

  elements.sceneStyleDropZone.onkeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    elements.sceneStyleInput.click();
  };

  elements.sceneStyleDropZone.ondragenter = (event) => {
    event.preventDefault();
    elements.sceneStyleDropZone.classList.add("is-dragging");
  };
  elements.sceneStyleDropZone.ondragover = (event) => {
    event.preventDefault();
    elements.sceneStyleDropZone.classList.add("is-dragging");
  };
  elements.sceneStyleDropZone.ondragleave = () => {
    elements.sceneStyleDropZone.classList.remove("is-dragging");
  };
  elements.sceneStyleDropZone.ondrop = (event) => {
    event.preventDefault();
    elements.sceneStyleDropZone.classList.remove("is-dragging");
    addSceneStyleFiles(elements, event.dataTransfer?.files);
  };
}

function addSceneStyleFiles(elements, fileList) {
  const files = [...(fileList || [])].filter((file) => file.type?.startsWith("image/"));
  if (!files.length) return;

  const nextReferences = files.map((file) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  elements.sceneStyleReferences.push(...nextReferences);
  renderSceneStyleReferences(elements);
  renderScenePromptCommands(elements);
}

function removeSceneStyleReference(elements, id) {
  const reference = elements.sceneStyleReferences.find((item) => item.id === id);
  if (reference?.previewUrl) URL.revokeObjectURL(reference.previewUrl);
  elements.sceneStyleReferences = elements.sceneStyleReferences.filter((item) => item.id !== id);
  renderSceneStyleReferences(elements);
  renderScenePromptCommands(elements);
}

function renderSceneStyleReferences(elements) {
  if (!elements.sceneStyleMeta || !elements.sceneStylePreviewList) return;
  const references = selectedSceneStyleReferences(elements);
  elements.sceneStyleMeta.textContent = references.length
    ? `${references.length} scene style reference${references.length === 1 ? "" : "s"} selected.`
    : "No new scene style references selected. The copied scene style stays in place.";

  elements.sceneStylePreviewList.replaceChildren(
    ...references.map((reference) => {
      const item = document.createElement("li");
      item.className = "style-preview-item";

      const image = document.createElement("img");
      image.src = reference.previewUrl;
      image.alt = "";

      const details = document.createElement("div");
      details.className = "style-preview-details";

      const name = document.createElement("strong");
      name.textContent = reference.name;

      const command = document.createElement("button");
      command.type = "button";
      command.className = "command-chip";
      command.textContent = reference.command;
      command.addEventListener("click", () => insertScenePromptCommand(elements, reference.command));

      details.append(name, command);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "style-remove-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removeSceneStyleReference(elements, reference.id));

      item.append(image, details, removeButton);
      return item;
    }),
  );
}

function renderScenePromptCommands(elements) {
  if (!elements.scenePromptCommandBar) return;
  const commands = [];
  const imageFile = elements.sceneImageInput?.files?.[0];
  if (imageFile) {
    commands.push({
      label: sceneImageCommandFor(imageFile.name),
      value: sceneImageCommandFor(imageFile.name),
    });
  }
  commands.push(
    ...selectedSceneStyleReferences(elements).map((reference) => ({
      label: reference.command,
      value: reference.command,
    })),
  );

  elements.scenePromptCommandBar.replaceChildren(
    ...commands.map((command) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "command-chip";
      button.textContent = command.label;
      button.addEventListener("click", () => insertScenePromptCommand(elements, command.value));
      return button;
    }),
  );
}

function insertScenePromptCommand(elements, command) {
  const input = elements.newSceneBriefInput;
  if (!input) return;
  const value = input.value;
  const start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? value.length;
  const prefix = start > 0 && !/\s$/.test(value.slice(0, start)) ? " " : "";
  const suffix = end < value.length && !/^\s/.test(value.slice(end)) ? " " : "";
  const nextValue = `${value.slice(0, start)}${prefix}${command}${suffix}${value.slice(end)}`;
  input.value = nextValue;
  const cursor = start + prefix.length + command.length + suffix.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
}

function selectedSceneStyleReferences(elements) {
  const used = new Set();
  return (elements.sceneStyleReferences || []).map((reference, index) => {
    const file = reference.file;
    const savedName = styleReferenceFileName(file.name, index, used);
    return {
      id: reference.id,
      file,
      previewUrl: reference.previewUrl,
      name: file.name,
      savedName,
      type: file.type,
      path: `insp/${savedName}`,
      command: `/style insp/${savedName}`,
    };
  });
}

async function currentSceneDraft(elements) {
  const file = elements.sceneImageInput?.files?.[0] || null;
  const styleReferences = selectedSceneStyleReferences(elements);
  const [imageDataUrl, encodedStyleReferences] = await Promise.all([
    file ? readFileAsDataUrl(file) : Promise.resolve(""),
    Promise.all(
      styleReferences.map(async (reference) => ({
        name: reference.name,
        savedName: reference.savedName,
        type: reference.type,
        dataUrl: await readFileAsDataUrl(reference.file),
      })),
    ),
  ]);

  return {
    prompt: elements.newSceneBriefInput?.value?.trim() || "",
    imageName: file?.name || "",
    imageDataUrl,
    styleReferences: encodedStyleReferences,
  };
}

function sceneImageCommandFor(fileName) {
  return `/image image/storyboard.${extensionFor(fileName)}`;
}

function revokeSceneStylePreviews(elements) {
  for (const reference of elements.sceneStyleReferences || []) {
    if (reference.previewUrl) URL.revokeObjectURL(reference.previewUrl);
  }
}

async function wireSceneLibrary(elements, manifest) {
  if (!elements.scenePanel || !elements.sceneSelect || !manifest?.slug) return;

  elements.scenePanel.hidden = false;
  elements.sceneStyleReferences = [];
  wireNewSceneEditor(elements, manifest);
  setSceneBusy(elements, false);
  elements.sceneStatus.textContent = "Loading scenes...";

  elements.sceneSelect.onchange = () => {
    const option = elements.sceneSelect.selectedOptions?.[0];
    const nextProjectRef = elements.sceneSelect.value;
    const nextSlug = option?.dataset?.slug || nextProjectRef;
    if (nextProjectRef && nextSlug !== manifest.slug) navigateToScene(nextProjectRef);
  };

  if (elements.saveSceneButton) {
    elements.saveSceneButton.onclick = async () => {
      await runSceneAction(elements, "Saving scene...", async () => {
        const library = await saveScene(manifest.slug);
        renderSceneLibrary(elements, library, manifest.slug);
        elements.sceneStatus.textContent = "Scene saved.";
        return library;
      });
    };
  }

  elements.newSceneButton.onclick = async () => {
    await runSceneAction(elements, "Copying the current scene...", async () => {
      markPendingSceneNavigation(elements, manifest.slug);
      let result;
      try {
        result = await createNextScene(manifest.slug);
      } catch (error) {
        clearPendingSceneNavigation();
        throw error;
      }
      clearPendingSceneNavigation();
      const sceneNumber = String(result.scene?.order || "").padStart(2, "0");
      elements.sceneStatus.textContent = `Scene ${sceneNumber} copied. Opening it now...`;
      navigateToScene(result.projectRef || result.scene?.projectRef || result.slug);
      return result;
    });
  };

  elements.renameSceneButton.onclick = () => {
    showSceneRenameEditor(elements);
  };

  elements.applyRenameSceneButton.onclick = async () => {
    const title = elements.sceneNameInput.value.trim();
    if (!title) {
      elements.sceneStatus.textContent = "Type a scene name before renaming.";
      elements.sceneNameInput.focus();
      return;
    }

    await runSceneAction(elements, "Renaming scene...", async () => {
      const library = await renameScene(manifest.slug, title);
      renderSceneLibrary(elements, library, manifest.slug);
      elements.previewTitle.textContent = title;
      elements.sceneStatus.textContent = "Scene renamed.";
      hideSceneRenameEditor(elements);
      return library;
    });
  };

  elements.cancelRenameSceneButton.onclick = () => {
    hideSceneRenameEditor(elements);
  };

  elements.sceneNameInput.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      elements.applyRenameSceneButton.click();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      hideSceneRenameEditor(elements);
    }
  };

  elements.deleteSceneButton.onclick = async () => {
    const title = elements.sceneNameInput.value.trim() || manifest.title || manifest.slug;
    const canDelete = canDeleteActiveScene(elements);
    if (!canDelete.ok) {
      elements.sceneStatus.textContent = canDelete.message;
      return;
    }

    const confirmed = window.confirm(`Delete "${title}" and its local project folder?`);
    if (!confirmed) return;

    await runSceneAction(elements, "Deleting scene...", async () => {
      const result = await deleteScene(manifest.slug);
      elements.sceneStatus.textContent = "Scene deleted. Opening the next saved scene...";
      navigateToScene(result.redirectProjectRef || result.activeProjectRef || result.redirectSlug || result.activeSlug || result.rootSlug);
      return result;
    });
  };

  try {
    const library = await loadSceneLibrary(manifest.slug);
    renderSceneLibrary(elements, library, manifest.slug);
    elements.sceneStatus.textContent = sceneLibraryStatus(library, manifest.slug);
    const pendingProjectRef = pendingSceneNavigationProjectRef(library, manifest.slug);
    if (pendingProjectRef) {
      elements.sceneStatus.textContent = "Opening the copied scene...";
      navigateToScene(pendingProjectRef);
      return;
    }
    window.inkyApp.scenes = {
      library,
      refresh: async () => {
        const nextLibrary = await loadSceneLibrary(manifest.slug);
        renderSceneLibrary(elements, nextLibrary, manifest.slug);
        return nextLibrary;
      },
      saveCurrent: () => saveScene(manifest.slug),
      createNext: () => createNextScene(manifest.slug),
      renameCurrent: (title) => renameScene(manifest.slug, title),
      deleteCurrent: () => deleteScene(manifest.slug),
    };
  } catch (error) {
    console.warn(error);
    elements.sceneStatus.textContent = error.message || "Scene tools are unavailable for this project.";
    elements.sceneSelect.disabled = true;
    if (elements.sceneRenameEditor) elements.sceneRenameEditor.hidden = true;
    elements.sceneNameInput.disabled = true;
    if (elements.saveSceneButton) elements.saveSceneButton.disabled = true;
    elements.renameSceneButton.disabled = true;
    elements.applyRenameSceneButton.disabled = true;
    elements.cancelRenameSceneButton.disabled = true;
    elements.deleteSceneButton.disabled = true;
    elements.newSceneButton.disabled = true;
  }
}

function showSceneRenameEditor(elements) {
  if (!elements.sceneRenameEditor) return;
  const library = elements.sceneLibrary;
  const activeScene = library?.scenes?.find((scene) => scene.slug === library.activeSlug);
  elements.sceneNameInput.value = activeScene?.title || elements.sceneNameInput.value || "";
  elements.sceneRenameEditor.hidden = false;
  elements.sceneStatus.textContent = "Rename this scene.";
  elements.sceneNameInput.focus();
  elements.sceneNameInput.select();
}

function hideSceneRenameEditor(elements) {
  if (elements.sceneRenameEditor) elements.sceneRenameEditor.hidden = true;
}

async function runSceneAction(elements, busyMessage, action) {
  try {
    setSceneBusy(elements, true);
    elements.sceneStatus.textContent = busyMessage;
    return await action();
  } catch (error) {
    console.warn(error);
    elements.sceneStatus.textContent = error.message || "Scene action failed.";
    return null;
  } finally {
    setSceneBusy(elements, false);
  }
}

function setSceneBusy(elements, busy) {
  elements.sceneBusy = busy;
  updateSceneActionStates(elements);
}

function updateSceneActionStates(elements) {
  const busy = !!elements.sceneBusy;
  const deleteState = canDeleteActiveScene(elements);
  if (elements.sceneSelect) elements.sceneSelect.disabled = busy;
  if (elements.sceneNameInput) elements.sceneNameInput.disabled = busy;
  if (elements.newSceneBriefInput) elements.newSceneBriefInput.disabled = busy;
  if (elements.sceneImageInput) elements.sceneImageInput.disabled = busy;
  if (elements.sceneStyleInput) elements.sceneStyleInput.disabled = busy;
  if (elements.sceneStyleDropZone) elements.sceneStyleDropZone.setAttribute("aria-disabled", busy ? "true" : "false");
  if (elements.saveSceneButton) elements.saveSceneButton.disabled = busy;
  if (elements.renameSceneButton) elements.renameSceneButton.disabled = busy;
  if (elements.applyRenameSceneButton) elements.applyRenameSceneButton.disabled = busy;
  if (elements.cancelRenameSceneButton) elements.cancelRenameSceneButton.disabled = busy;
  if (elements.generateSceneButton) elements.generateSceneButton.disabled = busy;
  if (elements.cancelNewSceneButton) elements.cancelNewSceneButton.disabled = busy;
  if (elements.copyScenePromptButton) elements.copyScenePromptButton.disabled = busy || !elements.sceneAgentPromptOutput?.textContent;
  if (elements.deleteSceneButton) {
    elements.deleteSceneButton.disabled = busy || !deleteState.ok;
    elements.deleteSceneButton.title = deleteState.ok ? "Delete scene" : deleteState.message;
  }
  if (elements.newSceneButton) elements.newSceneButton.disabled = busy;
}

function canDeleteActiveScene(elements) {
  const library = elements.sceneLibrary;
  if (!library) return { ok: false, message: "Load scenes before deleting." };
  const scenes = Array.isArray(library.scenes) ? library.scenes : [];
  if (scenes.length <= 1) return { ok: false, message: "Keep at least one scene." };
  if (library.activeSlug === library.rootSlug) {
    return { ok: false, message: "Scene 01 stores this scene library and cannot be deleted." };
  }
  return { ok: true, message: "" };
}

async function loadSceneLibrary(slug) {
  const response = await fetch(`/api/projects/${encodeURIComponent(slug)}/scenes`);
  return readSceneResponse(response);
}

async function saveScene(slug) {
  const response = await fetch(`/api/projects/${encodeURIComponent(slug)}/scenes/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return readSceneResponse(response);
}

async function createNextScene(slug, options = {}) {
  const response = await fetch(`/api/projects/${encodeURIComponent(slug)}/scenes/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: options.prompt || options.brief || "",
      imageName: options.imageName || "",
      imageDataUrl: options.imageDataUrl || "",
      styleReferences: Array.isArray(options.styleReferences) ? options.styleReferences : [],
    }),
  });
  return readSceneResponse(response);
}

async function renameScene(slug, title) {
  const response = await fetch(`/api/projects/${encodeURIComponent(slug)}/scenes/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return readSceneResponse(response);
}

async function deleteScene(slug) {
  const response = await fetch(`/api/projects/${encodeURIComponent(slug)}/scenes/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return readSceneResponse(response);
}

async function readSceneResponse(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Scene library is unavailable.");
  }
  return result;
}

function renderSceneLibrary(elements, library, activeSlug) {
  const scenes = Array.isArray(library.scenes) ? [...library.scenes] : [];
  scenes.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const activeScene = scenes.find((scene) => scene.slug === activeSlug);
  const activeProjectRef = activeScene?.projectRef || library.activeProjectRef || activeSlug;
  elements.sceneLibrary = {
    activeSlug,
    activeProjectRef,
    rootSlug: library.rootSlug,
    scenes,
  };

  elements.sceneSelect.replaceChildren(
    ...scenes.map((scene, index) => {
      const option = document.createElement("option");
      option.value = scene.projectRef || scene.slug;
      option.dataset.slug = scene.slug;
      option.textContent = `${String(scene.order || index + 1).padStart(2, "0")} · ${scene.title || scene.slug}`;
      return option;
    }),
  );

  elements.sceneSelect.value = activeProjectRef;
  if (elements.sceneNameInput) {
    elements.sceneNameInput.value = activeScene?.title || activeSlug;
  }
  updateSceneActionStates(elements);
}

function sceneLibraryStatus(library, activeSlug) {
  const scenes = Array.isArray(library.scenes) ? library.scenes : [];
  const activeScene = scenes.find((scene) => scene.slug === activeSlug);
  const sceneNumber = activeScene?.order ? `Scene ${String(activeScene.order).padStart(2, "0")}` : "Current scene";
  return `${sceneNumber} in ${scenes.length || 1} saved scene${scenes.length === 1 ? "" : "s"}.`;
}

function markPendingSceneNavigation(elements, sourceSlug) {
  const scenes = Array.isArray(elements.sceneLibrary?.scenes) ? elements.sceneLibrary.scenes : [];
  try {
    window.sessionStorage.setItem(
      PENDING_SCENE_NAVIGATION_KEY,
      JSON.stringify({
        sourceSlug,
        previousCount: scenes.length,
        createdAt: Date.now(),
      }),
    );
  } catch {
    // Best-effort only; direct navigation still runs when the request returns before a dev reload.
  }
}

function pendingSceneNavigationProjectRef(library, activeSlug) {
  let pending;
  try {
    pending = JSON.parse(window.sessionStorage.getItem(PENDING_SCENE_NAVIGATION_KEY) || "null");
  } catch {
    clearPendingSceneNavigation();
    return "";
  }

  if (!pending || pending.sourceSlug !== activeSlug || Date.now() - Number(pending.createdAt || 0) > 120000) {
    clearPendingSceneNavigation();
    return "";
  }

  const scenes = Array.isArray(library.scenes) ? [...library.scenes] : [];
  scenes.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  if (scenes.length <= Number(pending.previousCount || 0)) return "";

  const newestScene = scenes[scenes.length - 1];
  clearPendingSceneNavigation();
  return newestScene?.projectRef || newestScene?.slug || "";
}

function clearPendingSceneNavigation() {
  try {
    window.sessionStorage.removeItem(PENDING_SCENE_NAVIGATION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function navigateToScene(slug) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("project", slug);
  nextUrl.searchParams.delete("export");
  window.location.href = nextUrl.href;
}

function exposePreviewApp(bundle, player) {
  const projectContext = createProjectContext(bundle.manifest);
  const previewApi = {
    activeProject: projectContext.project.slug,
    activeProjectRef: projectContext.activeProjectRef,
    activeScene: projectContext.scene,
    manifest: bundle.manifest,
    showReference: player.showReference,
    hideReference: player.hideReference,
    setReferenceOpacity: player.setReferenceOpacity,
    analyzeStyle: player.analyzeStyle,
    buildReferenceConstruction: player.buildReferenceConstruction,
    loadReferenceConstruction: player.loadReferenceConstruction,
    loadStyleTokens: player.loadStyleTokens,
    compareReferenceBounds: player.compareReferenceBounds,
    extractPathsFromImage: player.extractPathsFromImage,
    extractPaths: player.extractPathsFromImage,
    sceneGraph: player.sceneGraph,
    captureFrameDataUrl: player.captureFrameDataUrl,
    goToFrame: player.goToFrame,
    inspectFrame: player.inspectFrame,
  };

  window.inkyApp = {
    mode: "preview",
    activeProject: projectContext.project.slug,
    activeProjectRef: projectContext.activeProjectRef,
    activeScene: projectContext.scene,
    project: projectContext.project,
    manifest: bundle.manifest,
    player,
    inky: previewApi,
  };

  window.inky = previewApi;

  window.storyboardApp = {
    activeProject: projectContext.project.slug,
    activeProjectRef: projectContext.activeProjectRef,
    activeScene: projectContext.scene,
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

function normalizeProjectRefForNav(projectRef) {
  const segments = String(projectRef || "")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/^projects[\\/]+/, "")
    .split(/[\\/]+/)
    .map((segment) => normalizeProjectRefSegment(segment))
    .filter(Boolean);
  return segments.join("/");
}

function normalizeProjectRefSegment(segment) {
  return String(segment || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function slugifyFileBase(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "style"
  );
}

function extensionFor(fileName) {
  const match = String(fileName).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "png";
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("Could not read the selected storyboard image.")));
    reader.readAsDataURL(file);
  });
}
