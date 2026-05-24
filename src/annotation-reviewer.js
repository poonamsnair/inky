const INACTIVE_STATUSES = new Set(["deleted", "removed", "archived"]);
const DONE_STATUSES = new Set(["done", "complete", "completed"]);
const MAX_REFERENCE_IMAGES = 3;
const REFERENCE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function createAnnotationReviewer({
  manifest,
  width,
  height,
  fps,
  totalFrames,
  goToFrame,
  stopPlayback,
  captureFrameDataUrl,
}) {
  const layer = document.querySelector("#annotationLayer");
  const draftEl = document.querySelector("#annotationDraft");
  const panel = document.querySelector("#annotationPanel");
  const toggleButton = document.querySelector("#toggleAnnotations");
  const editor = document.querySelector("#annotationEditor");
  const editorMeta = document.querySelector("#annotationEditorMeta");
  const commentInput = document.querySelector("#annotationComment");
  const referenceInput = document.querySelector("#annotationReferenceInput");
  const referenceDropzone = document.querySelector("#annotationReferenceDropzone");
  const referenceList = document.querySelector("#annotationReferenceList");
  const referenceCount = document.querySelector("#annotationReferenceCount");
  const saveButton = document.querySelector("#saveAnnotation");
  const cancelButton = document.querySelector("#cancelAnnotation");
  const list = document.querySelector("#annotationList");
  const copyPromptButton = document.querySelector("#copyAnnotationPrompt");
  const promptOutput = document.querySelector("#annotationPromptOutput");
  const statusOutput = document.querySelector("#annotationStatus");

  if (!layer || !draftEl || !panel || !toggleButton || !editor || !commentInput || !list) {
    return {
      start() {},
      setFrame() {},
      stop() {},
    };
  }

  const projectRef = manifest.projectRef || manifest.sceneCollection?.projectRef || manifest.slug;
  const projectPath = `projects/${projectRef}`;
  const storageKey = `inky:${projectRef}:annotations`;
  let annotations = [];
  let isAnnotating = false;
  let currentFrame = 0;
  let draft = null;
  let draftReferences = [];
  let drawStart = null;
  let saveMode = "project";

  function start() {
    bindControls();
    loadAnnotations();
  }

  function bindControls() {
    toggleButton.addEventListener("click", toggleAnnotationMode);
    layer.addEventListener("pointerdown", beginDraw);
    layer.addEventListener("pointermove", updateDraw);
    layer.addEventListener("pointerup", finishDraw);
    layer.addEventListener("pointercancel", cancelDraft);
    editor.addEventListener("submit", saveDraft);
    editor.addEventListener("paste", handleReferencePaste);
    referenceDropzone?.addEventListener("click", () => referenceInput?.click());
    referenceDropzone?.addEventListener("dragenter", handleReferenceDragEnter);
    referenceDropzone?.addEventListener("dragover", handleReferenceDragOver);
    referenceDropzone?.addEventListener("dragleave", handleReferenceDragLeave);
    referenceDropzone?.addEventListener("drop", handleReferenceDrop);
    referenceInput?.addEventListener("change", handleReferenceInput);
    cancelButton?.addEventListener("click", cancelDraft);
    copyPromptButton?.addEventListener("click", copyPrompt);
  }

  async function loadAnnotations() {
    try {
      const response = await fetch(`/api/projects/${manifest.slug}/annotations`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Annotation endpoint unavailable.");
      const payload = await response.json();
      annotations = normalizeAnnotations(payload.annotations || [], fps);
      saveMode = "project";
    } catch (error) {
      annotations = normalizeAnnotations(readLocalAnnotations(), fps);
      saveMode = "browser";
      if (annotations.length) setStatus("Loaded notes from this browser.");
    }
    render();
  }

  function setFrame(frame) {
    currentFrame = clamp(Math.round(frame), 0, totalFrames - 1);
    renderLayer();
    renderList();
  }

  function toggleAnnotationMode() {
    isAnnotating = !isAnnotating;
    if (isAnnotating) stopPlayback?.();
    toggleButton.setAttribute("aria-pressed", String(isAnnotating));
    panel.hidden = false;
    layer.classList.toggle("is-annotating", isAnnotating);
    setStatus(isAnnotating ? "Annotation mode on." : statusForCount());
    render();
  }

  function beginDraw(event) {
    if (!isAnnotating || event.button !== 0) return;
    stopPlayback?.();
    cancelDraft();
    drawStart = pointerToCanvasPoint(event);
    draft = {
      frame: currentFrame,
      time: currentFrame / fps,
      rect: rectFromPoints(drawStart, drawStart),
    };
    layer.setPointerCapture(event.pointerId);
    updateDraftElement();
    event.preventDefault();
  }

  function updateDraw(event) {
    if (!drawStart || !draft) return;
    const current = pointerToCanvasPoint(event);
    draft.rect = rectFromPoints(drawStart, current);
    updateDraftElement();
  }

  function finishDraw(event) {
    if (!drawStart || !draft) return;
    const current = pointerToCanvasPoint(event);
    draft.rect = rectFromPoints(drawStart, current);
    drawStart = null;
    if (draft.rect.width < 8 || draft.rect.height < 8) {
      cancelDraft();
      return;
    }
    updateDraftElement();
    showEditor();
  }

  function showEditor() {
    editor.hidden = false;
    panel.hidden = false;
    editorMeta.textContent = `Frame ${draft.frame + 1} at ${formatSeconds(draft.time)}s`;
    commentInput.value = "";
    draftReferences = [];
    renderDraftReferences();
    window.requestAnimationFrame(() => commentInput.focus());
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (!draft) return;
    const comment = commentInput.value.trim();
    if (!comment) {
      setStatus("Add a comment before saving.");
      return;
    }

    saveButton.disabled = true;
    setStatus("Saving note...");

    let screenshotDataUrl = "";
    try {
      screenshotDataUrl = captureFrameDataUrl?.() || "";
    } catch (error) {
      console.warn("Could not capture annotation screenshot", error);
    }

    const annotation = {
      id: createAnnotationId(),
      status: "to do",
      frame: draft.frame,
      time: draft.time,
      rect: withNormalizedRect(draft.rect, width, height),
      comment,
      createdAt: new Date().toISOString(),
      references: draftReferences.map(({ name, type }) => ({ name, type })),
      referenceDataUrls: draftReferences.map(({ name, type, dataUrl }) => ({ name, type, dataUrl })),
      screenshotDataUrl,
    };

    annotations = [...annotations, annotation];
    draft = null;
    draftReferences = [];
    editor.hidden = true;
    commentInput.value = "";
    await persistAnnotations();
    saveButton.disabled = false;
    render();
  }

  function cancelDraft() {
    draft = null;
    drawStart = null;
    editor.hidden = true;
    draftEl.hidden = true;
    commentInput.value = "";
    draftReferences = [];
    renderDraftReferences();
    renderLayer();
  }

  async function deleteAnnotation(id) {
    annotations = annotations.filter((annotation) => annotation.id !== id);
    await persistAnnotations();
    render();
  }

  function jumpToAnnotation(frame) {
    goToFrame?.(frame);
    setFrame(frame);
    panel.hidden = false;
  }

  async function persistAnnotations({ prompt = "", silent = false } = {}) {
    const payload = {
      version: 1,
      project: manifest.slug,
      updatedAt: new Date().toISOString(),
      annotations,
    };
    if (prompt) payload.prompt = prompt;

    writeLocalAnnotations(annotations);

    try {
      const response = await fetch(`/api/projects/${manifest.slug}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readJsonResponse(response);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not save annotations.");
      annotations = normalizeAnnotations(result.annotations || annotations, fps);
      writeLocalAnnotations(annotations);
      saveMode = "project";
      if (!silent) setStatus(`Saved ${annotations.length} note${annotations.length === 1 ? "" : "s"} to project.`);
    } catch (error) {
      console.warn("Annotation save endpoint unavailable", error);
      saveMode = "browser";
      if (!silent) {
        setStatus(hasUnsavedReferenceData(annotations) ? "Saved in this browser. Reference images are not available to the agent until project save works." : "Saved in this browser. Project save endpoint is unavailable.");
      }
    }
  }

  async function copyPrompt() {
    const active = activePromptAnnotations();
    if (!active.length) {
      setStatus("No active notes to copy.");
      return;
    }

    const prompt = buildAnnotationPrompt(active);
    promptOutput.textContent = prompt;
    promptOutput.hidden = false;

    try {
      await navigator.clipboard.writeText(prompt);
      setStatus(saveMode === "project" ? "Agent prompt copied." : "Agent prompt copied. Reference images need project save before the agent can open them.");
    } catch {
      setStatus("Prompt is shown below. Select it to copy manually.");
    }

    if (saveMode === "project") {
      await persistAnnotations({ prompt, silent: true });
    }
  }

  function render() {
    const shouldShowPanel = isAnnotating || visibleReviewAnnotations().length > 0 || Boolean(draft);
    panel.hidden = !shouldShowPanel;
    renderLayer();
    renderList();
    updateButtonState();
  }

  function renderLayer() {
    layer.querySelectorAll(".annotation-marker").forEach((marker) => marker.remove());

    const frameAnnotations = visibleReviewAnnotations().filter((annotation) => annotation.frame === currentFrame);
    frameAnnotations.forEach((annotation) => {
      const marker = document.createElement("div");
      marker.className = "annotation-marker";
      marker.style.left = `${(annotation.rect.x / width) * 100}%`;
      marker.style.top = `${(annotation.rect.y / height) * 100}%`;
      marker.style.width = `${(annotation.rect.width / width) * 100}%`;
      marker.style.height = `${(annotation.rect.height / height) * 100}%`;
      marker.title = annotation.comment;
      marker.setAttribute("aria-label", `Annotation ${annotation.id}`);
      layer.append(marker);
    });

    if (draft) updateDraftElement();
    else draftEl.hidden = true;

    layer.hidden = !isAnnotating && !draft && frameAnnotations.length === 0;
  }

  function updateDraftElement() {
    if (!draft) return;
    draftEl.hidden = false;
    draftEl.style.left = `${(draft.rect.x / width) * 100}%`;
    draftEl.style.top = `${(draft.rect.y / height) * 100}%`;
    draftEl.style.width = `${(draft.rect.width / width) * 100}%`;
    draftEl.style.height = `${(draft.rect.height / height) * 100}%`;
  }

  function renderList() {
    list.replaceChildren();
    const visibleAnnotations = visibleReviewAnnotations();

    if (!visibleAnnotations.length) {
      const empty = document.createElement("li");
      empty.className = "annotation-empty";
      empty.textContent = "No frame notes yet.";
      list.append(empty);
      copyPromptButton.disabled = true;
      return;
    }

    copyPromptButton.disabled = activePromptAnnotations().length === 0;

    visibleAnnotations.forEach((annotation) => {
      const item = document.createElement("li");
      item.className = "annotation-item";
      item.dataset.annotationId = annotation.id;

      const body = document.createElement("div");
      body.className = "annotation-item-body";

      const meta = document.createElement("p");
      meta.className = "annotation-meta";
      const referenceCountText = annotation.references.length ? ` • ${annotation.references.length} ref${annotation.references.length === 1 ? "" : "s"}` : "";
      meta.textContent = `Frame ${annotation.frame + 1} • ${formatSeconds(annotation.time)}s • ${annotation.status}${referenceCountText}`;

      const comment = document.createElement("p");
      comment.className = "annotation-comment";
      comment.textContent = annotation.comment;

      body.append(meta, comment);

      const actions = document.createElement("div");
      actions.className = "annotation-item-actions";

      const jumpButton = document.createElement("button");
      jumpButton.type = "button";
      jumpButton.className = "secondary-action annotation-small-action";
      jumpButton.textContent = "Jump";
      jumpButton.addEventListener("click", () => jumpToAnnotation(annotation.frame));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "secondary-action annotation-small-action";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteAnnotation(annotation.id));

      actions.append(jumpButton, deleteButton);
      item.append(body, actions);
      list.append(item);
    });
  }

  function updateButtonState() {
    toggleButton.classList.toggle("is-active", isAnnotating);
    toggleButton.title = isAnnotating ? "Stop annotating" : "Annotate frame";
  }

  function activePromptAnnotations() {
    return visibleReviewAnnotations().filter((annotation) => {
      if (INACTIVE_STATUSES.has(annotation.status)) return false;
      if (DONE_STATUSES.has(annotation.status)) return false;
      return true;
    });
  }

  function visibleReviewAnnotations() {
    return annotations.filter((annotation) => !INACTIVE_STATUSES.has(annotation.status) && !DONE_STATUSES.has(annotation.status));
  }

  function pointerToCanvasPoint(event) {
    const rect = layer.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * width, 0, width),
      y: clamp(((event.clientY - rect.top) / rect.height) * height, 0, height),
    };
  }

  function buildAnnotationPrompt(activeAnnotations) {
    const previewUrl = new URL(window.location.href);
    previewUrl.search = "";
    previewUrl.searchParams.set("project", projectRef);
    const port = previewUrl.port || "5176";
    const rendererPath = `${projectPath}/${manifest.renderer || "renderer.js"}`;
    const requirementsPath = `${projectPath}/${manifest.prompt?.requirements || "storyboard/requirements.md"}`;

    const lines = [
      `# Fix Inky annotations: ${manifest.title || manifest.slug}`,
      "",
      "Use the `annotation-fix-pipeline` skill.",
      "",
      "## Project",
      "",
      `- Slug: \`${manifest.slug}\``,
      `- Project ref: \`${projectRef}\``,
      `- Project directory: \`${projectPath}\``,
      `- Manifest: \`${projectPath}/project.json\``,
      `- Renderer: \`${rendererPath}\``,
      `- Requirements: \`${requirementsPath}\``,
      `- Annotations JSON: \`${projectPath}/storyboard/annotations.json\``,
      `- Preview URL: \`${previewUrl.toString()}\``,
      "",
      "## Required Workflow",
      "",
      "1. Read `AGENTS.md`, `DESIGN.md`, the project manifest, requirements, annotation JSON, referenced screenshots, and reference images.",
      "2. Treat current-frame screenshots as evidence of the problem and reference images as visual guidance or coordinate scaffolding only. Use window.inky.extractPathsFromImage() when exact contour alignment matters. Do not paste or hide reference images in final artwork.",
      "3. For each active annotation, do an applicability sweep: decide whether the marked element is one-off or recurring, find the shared renderer helper/scene data/action mode that owns it, and list the annotated frame plus adjacent/related frames that must be checked.",
      "4. Fix the root drawing cause in the shared renderer construction when the issue recurs. Do not cover defects with patches, masks, white fills, opacity tricks, or extra texture.",
      "5. Only use a frame-specific branch when the annotation is truly frame-specific, and state why.",
      "6. Update annotation statuses to `doing`, then `done` or `needs review`.",
      "7. Rerender, run polish, visual diff, inspector, and open the updated browser preview.",
      "8. In the final reply, report the affected frame ranges checked for each annotation and whether the result matches the text comment plus reference images.",
      "",
      "## Verification Commands",
      "",
      "```bash",
      `npm run render -- --project ${projectRef}`,
      `npm run storyboard:polish -- ${projectPath}`,
      `npm run storyboard:visual-diff -- ${projectPath}/outputs/frames ${projectPath}/outputs/review-visual-diff`,
      `npm run storyboard:inspect -- ${projectRef}`,
      `npm run preview -- --port ${port}`,
      "```",
      "",
      "## Active Annotations",
      "",
    ];

    activeAnnotations.forEach((annotation, index) => {
      lines.push(`### ${index + 1}. ${annotation.id}`, "");
      lines.push(`- Status: \`${annotation.status}\``);
      lines.push(`- Frame: \`${annotation.frame}\` zero-based / \`${annotation.frame + 1}\` one-based`);
      lines.push(`- Time: \`${formatSeconds(annotation.time)}s\``);
      lines.push(`- Selected bounds: \`${formatRect(annotation.rect)}\``);
      if (annotation.screenshot) lines.push(`- Current-frame screenshot: \`${projectAssetPath(annotation.screenshot)}\``);
      const savedReferences = annotation.references.filter((reference) => reference.path);
      const unsavedReferences = annotation.references.filter((reference) => !reference.path);
      if (savedReferences.length) {
        lines.push(`- Reference image${savedReferences.length === 1 ? "" : "s"}: ${savedReferences.map((reference) => `\`${projectAssetPath(reference.path)}\``).join(", ")}`);
      }
      if (unsavedReferences.length) {
        lines.push(`- Unsaved reference image${unsavedReferences.length === 1 ? "" : "s"}: ${unsavedReferences.map((reference) => `\`${reference.name || "browser-only image"}\``).join(", ")}. These must be saved to the project before the agent can open them.`);
      }
      lines.push("- User comment:", "", blockquote(annotation.comment), "");
    });

    return lines.join("\n");
  }

  function projectAssetPath(path) {
    const value = String(path || "").trim();
    if (!value || value.startsWith("data:") || /^[a-z]+:\/\//i.test(value) || value.startsWith("/") || value.startsWith("projects/")) {
      return value;
    }
    return `${projectPath}/${value.replace(/^\.?\//, "")}`;
  }

  async function handleReferenceInput(event) {
    await addReferenceFiles(event.currentTarget.files || []);
    event.currentTarget.value = "";
  }

  async function handleReferencePaste(event) {
    const files = Array.from(event.clipboardData?.files || []).filter(isSupportedReferenceFile);
    if (!files.length) return;
    event.preventDefault();
    await addReferenceFiles(files);
  }

  function handleReferenceDragEnter(event) {
    event.preventDefault();
    referenceDropzone?.classList.add("is-dragging");
  }

  function handleReferenceDragOver(event) {
    event.preventDefault();
    referenceDropzone?.classList.add("is-dragging");
  }

  function handleReferenceDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    referenceDropzone?.classList.remove("is-dragging");
  }

  async function handleReferenceDrop(event) {
    event.preventDefault();
    referenceDropzone?.classList.remove("is-dragging");
    await addReferenceFiles(event.dataTransfer?.files || []);
  }

  async function addReferenceFiles(fileList) {
    const files = Array.from(fileList).filter(isSupportedReferenceFile);
    if (!files.length) {
      setStatus("Use PNG, JPEG, WebP, or GIF images as references.");
      return;
    }

    const slots = MAX_REFERENCE_IMAGES - draftReferences.length;
    if (slots <= 0) {
      setStatus(`Each note can have up to ${MAX_REFERENCE_IMAGES} reference images.`);
      return;
    }

    const selected = files.slice(0, slots);
    const nextReferences = await Promise.all(selected.map(referenceFromFile));
    draftReferences = [...draftReferences, ...nextReferences];
    renderDraftReferences();

    if (files.length > selected.length) {
      setStatus(`Added ${selected.length} reference image${selected.length === 1 ? "" : "s"}. Limit is ${MAX_REFERENCE_IMAGES}.`);
    } else {
      setStatus(`Added ${selected.length} reference image${selected.length === 1 ? "" : "s"}.`);
    }
  }

  function renderDraftReferences() {
    if (referenceCount) referenceCount.textContent = `${draftReferences.length} / ${MAX_REFERENCE_IMAGES}`;
    if (referenceDropzone) referenceDropzone.disabled = draftReferences.length >= MAX_REFERENCE_IMAGES;
    if (!referenceList) return;
    referenceList.replaceChildren();

    draftReferences.forEach((reference) => {
      const item = document.createElement("li");
      item.className = "annotation-reference-item";

      const image = document.createElement("img");
      image.className = "annotation-reference-thumb";
      image.src = reference.dataUrl;
      image.alt = "";

      const name = document.createElement("span");
      name.className = "annotation-reference-name";
      name.textContent = reference.name || "reference image";

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "secondary-action annotation-reference-remove";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        draftReferences = draftReferences.filter((candidate) => candidate.id !== reference.id);
        renderDraftReferences();
      });

      item.append(image, name, removeButton);
      referenceList.append(item);
    });
  }

  function readLocalAnnotations() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeLocalAnnotations(nextAnnotations) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextAnnotations));
  }

  function setStatus(message) {
    if (statusOutput) statusOutput.textContent = message;
  }

  function statusForCount() {
    if (!annotations.length) return "No frame notes yet.";
    return `${annotations.length} frame note${annotations.length === 1 ? "" : "s"} saved.`;
  }

  function stop() {
    isAnnotating = false;
    toggleButton.setAttribute("aria-pressed", "false");
    layer.classList.remove("is-annotating");
    cancelDraft();
  }

  return {
    start,
    setFrame,
    stop,
  };
}

function normalizeAnnotations(rawAnnotations, fpsValue = 12) {
  return rawAnnotations.map((annotation, index) => {
    const frame = Math.round(numberOr(annotation.frame, annotation.frameIndex, annotation.startFrame, 0));
    const rect = normalizeRect(annotation.rect || annotation.bounds || annotation.boundingRect || annotation.boundingBox);
    return {
      id: String(annotation.id || `annotation-${String(index + 1).padStart(2, "0")}`),
      status: normalizeStatus(annotation.status || "to do"),
      frame,
      time: numberOr(annotation.time, annotation.seconds, frame / fpsValue),
      rect,
      comment: String(annotation.comment || annotation.note || annotation.text || "").trim(),
      screenshot: annotation.screenshot || annotation.screenshotPath || "",
      references: normalizeReferences(annotation),
      referenceDataUrls: normalizeReferenceDataUrls(annotation.referenceDataUrls),
      createdAt: annotation.createdAt || "",
      updatedAt: annotation.updatedAt || "",
    };
  });
}

function normalizeReferences(annotation) {
  const references = Array.isArray(annotation.references) ? annotation.references : [];
  const referenceDataUrls = normalizeReferenceDataUrls(annotation.referenceDataUrls);
  const normalized = references
    .map((reference, index) => {
      if (typeof reference === "string") {
        return { path: reference, name: reference.split("/").pop() || `reference-${index + 1}`, type: "" };
      }
      if (!reference || typeof reference !== "object") return null;
      return {
        path: String(reference.path || reference.url || reference.href || "").trim(),
        name: String(reference.name || reference.filename || reference.path?.split?.("/")?.pop?.() || `reference-${index + 1}`).trim(),
        type: String(reference.type || reference.mime || "").trim(),
      };
    })
    .filter(Boolean);

  referenceDataUrls.forEach((reference, index) => {
    if (normalized.length >= MAX_REFERENCE_IMAGES) return;
    normalized.push({
      name: reference.name || `browser-reference-${index + 1}`,
      type: reference.type || "",
      dataUrl: reference.dataUrl,
    });
  });

  return normalized.slice(0, MAX_REFERENCE_IMAGES);
}

function normalizeReferenceDataUrls(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((reference, index) => {
      if (typeof reference === "string") {
        return { name: `browser-reference-${index + 1}`, type: "", dataUrl: reference };
      }
      if (!reference || typeof reference !== "object") return null;
      return {
        name: String(reference.name || `browser-reference-${index + 1}`).trim(),
        type: String(reference.type || "").trim(),
        dataUrl: String(reference.dataUrl || reference.data || "").trim(),
      };
    })
    .filter((reference) => reference?.dataUrl?.startsWith("data:image/"))
    .slice(0, MAX_REFERENCE_IMAGES);
}

function normalizeRect(rect = {}) {
  const x = numberOr(rect.x, rect.left, rect.x1, 0);
  const y = numberOr(rect.y, rect.top, rect.y1, 0);
  let width = numberOr(rect.width, rect.w, 0);
  let height = numberOr(rect.height, rect.h, 0);
  const right = numberOr(rect.right, rect.x2, NaN);
  const bottom = numberOr(rect.bottom, rect.y2, NaN);
  if ((!width || !height) && Number.isFinite(right) && Number.isFinite(bottom)) {
    width = right - x;
    height = bottom - y;
  }
  return { x, y, width, height, ...(rect.normalized ? { normalized: rect.normalized } : {}) };
}

function normalizeStatus(status) {
  return String(status || "to do").trim().toLowerCase();
}

function rectFromPoints(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function withNormalizedRect(rect, width, height) {
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
    normalized: {
      x: round(rect.x / width),
      y: round(rect.y / height),
      width: round(rect.width / width),
      height: round(rect.height / height),
    },
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: text };
  }
}

function formatRect(rect) {
  return `x=${round(rect.x)}, y=${round(rect.y)}, width=${round(rect.width)}, height=${round(rect.height)}`;
}

function blockquote(value) {
  return String(value)
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function isSupportedReferenceFile(file) {
  return file && REFERENCE_IMAGE_TYPES.has(file.type);
}

function referenceFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        id: createAnnotationId(),
        name: file.name || "reference image",
        type: file.type,
        dataUrl: String(reader.result || ""),
      });
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read reference image.")));
    reader.readAsDataURL(file);
  });
}

function hasUnsavedReferenceData(annotations) {
  return annotations.some((annotation) => Array.isArray(annotation.referenceDataUrls) && annotation.referenceDataUrls.length > 0);
}

function createAnnotationId() {
  if (window.crypto?.randomUUID) return `ann-${window.crypto.randomUUID()}`;
  return `ann-${Date.now().toString(36)}`;
}

function numberOr(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function formatSeconds(value) {
  return String(round(value)).replace(/\.0$/, "");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
