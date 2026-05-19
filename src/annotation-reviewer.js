const INACTIVE_STATUSES = new Set(["deleted", "removed", "archived"]);
const DONE_STATUSES = new Set(["done", "complete", "completed"]);

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

  const storageKey = `inky:${manifest.slug}:annotations`;
  let annotations = [];
  let isAnnotating = false;
  let currentFrame = 0;
  let draft = null;
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
      screenshotDataUrl,
    };

    annotations = [...annotations, annotation];
    draft = null;
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

  async function persistAnnotations() {
    const prompt = buildAnnotationPrompt(activePromptAnnotations());
    const payload = {
      version: 1,
      project: manifest.slug,
      updatedAt: new Date().toISOString(),
      annotations,
      prompt,
    };

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
      setStatus(`Saved ${annotations.length} note${annotations.length === 1 ? "" : "s"} to project.`);
    } catch (error) {
      console.warn("Annotation save endpoint unavailable", error);
      saveMode = "browser";
      setStatus("Saved in this browser. Project save endpoint is unavailable.");
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
      setStatus(saveMode === "project" ? "Agent prompt copied." : "Agent prompt copied. Notes are saved in this browser only.");
    } catch {
      setStatus("Prompt is shown below. Select it to copy manually.");
    }

    if (saveMode === "project") {
      persistAnnotations();
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
      meta.textContent = `Frame ${annotation.frame + 1} • ${formatSeconds(annotation.time)}s • ${annotation.status}`;

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
    previewUrl.searchParams.set("project", manifest.slug);
    const port = previewUrl.port || "5176";
    const rendererPath = `projects/${manifest.slug}/${manifest.renderer || "renderer.js"}`;
    const requirementsPath = `projects/${manifest.slug}/${manifest.prompt?.requirements || "storyboard/requirements.md"}`;

    const lines = [
      `# Fix Inky annotations: ${manifest.title || manifest.slug}`,
      "",
      "Use the `annotation-fix-pipeline` skill.",
      "",
      "## Project",
      "",
      `- Slug: \`${manifest.slug}\``,
      `- Manifest: \`projects/${manifest.slug}/project.json\``,
      `- Renderer: \`${rendererPath}\``,
      `- Requirements: \`${requirementsPath}\``,
      `- Annotations JSON: \`projects/${manifest.slug}/storyboard/annotations.json\``,
      `- Preview URL: \`${previewUrl.toString()}\``,
      "",
      "## Required Workflow",
      "",
      "1. Read `AGENTS.md`, `DESIGN.md`, the project manifest, requirements, annotation JSON, and referenced screenshots.",
      "2. For each active annotation, do an applicability sweep: decide whether the marked element is one-off or recurring, find the shared renderer helper/scene data/action mode that owns it, and list the annotated frame plus adjacent/related frames that must be checked.",
      "3. Fix the root drawing cause in the shared renderer construction when the issue recurs. Do not cover defects with patches, masks, white fills, opacity tricks, or extra texture.",
      "4. Only use a frame-specific branch when the annotation is truly frame-specific, and state why.",
      "5. Update annotation statuses to `doing`, then `done` or `needs review`.",
      "6. Rerender, run polish, visual diff, inspector, and open the updated browser preview.",
      "7. In the final reply, report the affected frame ranges checked for each annotation.",
      "",
      "## Verification Commands",
      "",
      "```bash",
      `npm run render -- --project ${manifest.slug}`,
      `npm run storyboard:polish -- projects/${manifest.slug}`,
      `npm run storyboard:visual-diff -- projects/${manifest.slug}/outputs/frames projects/${manifest.slug}/outputs/review-visual-diff`,
      `npm run storyboard:inspect -- projects/${manifest.slug}`,
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
      if (annotation.screenshot) lines.push(`- Screenshot: \`${annotation.screenshot}\``);
      lines.push("- User comment:", "", blockquote(annotation.comment), "");
    });

    return lines.join("\n");
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
      createdAt: annotation.createdAt || "",
      updatedAt: annotation.updatedAt || "",
    };
  });
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
