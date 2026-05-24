import Konva from "konva";
import { createBrush } from "./inky-canvas.js";

const EMPTY_BASE_GRAPH = Object.freeze({ version: 1, objects: [] });
const EMPTY_EDIT_LAYER = Object.freeze({
  version: 1,
  baseHash: "",
  deletedIds: [],
  overrides: {},
  addedObjects: [],
});

const GRAPH_OBJECT_TYPES = new Set(["path", "polyline", "rect", "ellipse"]);

export function createSceneGraphRuntime({ manifest, projectRef, width, height, exportMode = false, statusOutput = null } = {}) {
  const projectSlug = manifest?.slug || projectRef || "untitled-project";
  const listeners = new Set();
  const codeObjects = new Map();
  let baseGraph = cloneJson(EMPTY_BASE_GRAPH);
  let editLayer = cloneJson(EMPTY_EDIT_LAYER);
  let history = [cloneJson(editLayer)];
  let historyIndex = 0;
  let loaded = false;
  let rendererDrewGraph = false;

  const runtime = {
    async load() {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}/edit-layer`, { cache: "no-store" });
        const payload = await readJsonResponse(response);
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Scene graph is unavailable.");
        baseGraph = normalizeBaseGraph(payload.baseGraph, { width, height });
        editLayer = normalizeEditLayer(payload.editLayer, baseHash(baseGraph));
        resetHistory();
        loaded = true;
        emit();
      } catch (error) {
        console.warn("[inky-scene-graph] Could not load edit layer", error);
        baseGraph = cloneJson(EMPTY_BASE_GRAPH);
        editLayer = normalizeEditLayer(null, "");
        resetHistory();
        loaded = true;
        emit();
      }
      return runtime;
    },
    isLoaded() {
      return loaded;
    },
    beginFrame() {
      rendererDrewGraph = false;
    },
    draw(ctx, frame, options = {}) {
      if (!ctx) return [];
      rendererDrewGraph = options.markRendererDraw !== false;
      const includeCodeObjects = options.includeCodeObjects !== false;
      return drawObjectsToContext(ctx, effectiveObjects(frame, { includeCodeObjects }), frame);
    },
    drawAutomatic(ctx, frame) {
      if (rendererDrewGraph) return [];
      return drawObjectsToContext(ctx, effectiveObjects(frame, { includeCodeObjects: false }), frame);
    },
    drawObject(ctx, frame, object) {
      const normalized = normalizeGraphObject(object);
      if (!normalized) return null;
      codeObjects.set(normalized.id, normalized);
      const effective = effectiveObjectForFrame(normalized, frame);
      if (!effective) return null;
      drawSceneGraphObject(ctx, effective, frame);
      return effective;
    },
    isDeleted(id) {
      return deletedSet().has(String(id || ""));
    },
    getOverride(id) {
      const override = editLayer.overrides?.[String(id || "")];
      return override ? cloneJson(override) : null;
    },
    getBaseGraph() {
      return cloneJson(baseGraph);
    },
    getEditLayer() {
      return cloneJson(editLayer);
    },
    getEffectiveObjects(frame, options = {}) {
      return effectiveObjects(frame, options).map((object) => cloneJson(object));
    },
    hasGraphContent() {
      return Boolean(baseGraph.objects?.length || editLayer.addedObjects?.length || codeObjects.size);
    },
    hasPersistentGraphContent() {
      return Boolean(baseGraph.objects?.length || editLayer.addedObjects?.length || editLayer.deletedIds?.length || Object.keys(editLayer.overrides || {}).length);
    },
    setObjectOverride(id, overridePatch, options = {}) {
      const objectId = String(id || "").trim();
      if (!objectId) return;
      const overrides = { ...(editLayer.overrides || {}) };
      overrides[objectId] = normalizeOverride({
        ...(overrides[objectId] || {}),
        ...(overridePatch || {}),
      });
      editLayer = normalizeEditLayer({ ...editLayer, overrides }, baseHash(baseGraph));
      if (options.record !== false) recordHistory();
      emit();
    },
    deleteObject(id, options = {}) {
      const objectId = String(id || "").trim();
      if (!objectId) return;
      const deletedIds = new Set(editLayer.deletedIds || []);
      deletedIds.add(objectId);
      editLayer = normalizeEditLayer({ ...editLayer, deletedIds: [...deletedIds] }, baseHash(baseGraph));
      if (options.record !== false) recordHistory();
      emit();
    },
    restoreObject(id, options = {}) {
      const objectId = String(id || "").trim();
      if (!objectId) return;
      editLayer = normalizeEditLayer(
        {
          ...editLayer,
          deletedIds: (editLayer.deletedIds || []).filter((deletedId) => deletedId !== objectId),
        },
        baseHash(baseGraph),
      );
      if (options.record !== false) recordHistory();
      emit();
    },
    undo() {
      if (historyIndex <= 0) return false;
      historyIndex -= 1;
      editLayer = cloneJson(history[historyIndex]);
      emit();
      return true;
    },
    redo() {
      if (historyIndex >= history.length - 1) return false;
      historyIndex += 1;
      editLayer = cloneJson(history[historyIndex]);
      emit();
      return true;
    },
    canUndo() {
      return historyIndex > 0;
    },
    canRedo() {
      return historyIndex < history.length - 1;
    },
    async save() {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}/edit-layer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editLayer),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Could not save scene edits.");
      editLayer = normalizeEditLayer(payload.editLayer, baseHash(baseGraph));
      resetHistory();
      emit();
      return payload;
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    rendererHelpers() {
      return {
        draw: (ctx, frame) => runtime.draw(ctx, frame, { includeCodeObjects: false }),
        drawObject: (ctx, frame, object) => runtime.drawObject(ctx, frame, object),
        isDeleted: (id) => runtime.isDeleted(id),
        getOverride: (id) => runtime.getOverride(id),
        getEffectiveObjects: (frame) => runtime.getEffectiveObjects(frame),
      };
    },
    createEditor(options = {}) {
      return createSceneGraphEditor({ ...options, runtime, width, height, exportMode, statusOutput });
    },
  };

  function effectiveObjects(frame, options = {}) {
    const includeCodeObjects = options.includeCodeObjects !== false;
    const objects = [
      ...(baseGraph.objects || []),
      ...(editLayer.addedObjects || []),
      ...(includeCodeObjects ? [...codeObjects.values()] : []),
    ];
    return objects.map((object) => effectiveObjectForFrame(object, frame)).filter(Boolean);
  }

  function effectiveObjectForFrame(object, frame, options = {}) {
    const normalized = normalizeGraphObject(object);
    if (!normalized || !isObjectActiveAtFrame(normalized, frame)) return null;
    if (!options.ignoreDeleted && runtime.isDeleted(normalized.id)) return null;
    const override = options.ignoreOverride ? null : editLayer.overrides?.[normalized.id];
    if (override?.visible === false) return null;

    return {
      ...normalized,
      effectiveTransform: combineTransform(normalized, frame, override),
      override: override ? cloneJson(override) : null,
    };
  }

  function deletedSet() {
    return new Set((editLayer.deletedIds || []).map((id) => String(id)));
  }

  function resetHistory() {
    history = [cloneJson(editLayer)];
    historyIndex = 0;
  }

  function recordHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(cloneJson(editLayer));
    historyIndex = history.length - 1;
  }

  function emit() {
    for (const listener of listeners) listener(runtime);
  }

  return runtime;
}

export function drawObjectsToContext(ctx, objects, frame = 0) {
  const rendered = [];
  for (const object of objects || []) {
    if (drawSceneGraphObject(ctx, object, frame)) rendered.push(object.id);
  }
  return rendered;
}

export function drawSceneGraphObject(ctx, object, frame = 0, options = {}) {
  const normalized = object.effectiveTransform ? object : normalizeGraphObject(object);
  if (!ctx || !normalized || !GRAPH_OBJECT_TYPES.has(normalized.type)) return false;
  const transform = options.transform === false ? identityTransform() : normalized.effectiveTransform || combineTransform(normalized, frame, null);
  const opacity = clamp01((normalized.opacity ?? 1) * (transform.opacity ?? 1));

  ctx.save();
  ctx.globalAlpha *= opacity;
  applyCanvasTransform(ctx, transform);

  if (normalized.type === "rect") {
    drawRectObject(ctx, normalized);
  } else if (normalized.type === "ellipse") {
    drawEllipseObject(ctx, normalized);
  } else {
    drawPathObject(ctx, normalized);
  }

  ctx.restore();
  return true;
}

function createSceneGraphEditor({ runtime, container, width, height, exportMode, statusOutput, getFrame, redrawFrame }) {
  if (!container || exportMode) return createNoopEditor();

  const stage = new Konva.Stage({
    container,
    width,
    height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  let enabled = false;
  let selectedId = "";
  let unsubscribe = null;

  container.hidden = true;
  container.classList.remove("is-editing");

  function enable() {
    enabled = true;
    container.hidden = false;
    container.classList.add("is-editing");
    syncStageSize();
    render();
    if (!unsubscribe) unsubscribe = runtime.subscribe(render);
  }

  function disable() {
    enabled = false;
    selectedId = "";
    container.hidden = true;
    container.classList.remove("is-editing");
    layer.destroyChildren();
    layer.draw();
    unsubscribe?.();
    unsubscribe = null;
  }

  function render() {
    if (!enabled) return;
    syncStageSize();
    const frame = currentFrame();
    const selectedBefore = selectedId;
    layer.destroyChildren();

    const objects = runtime.getEffectiveObjects(frame);
    for (const object of objects) {
      const node = createKonvaNode(object, frame);
      if (!node) continue;
      layer.add(node);
      node.on("click tap", (event) => {
        event.cancelBubble = true;
        selectNode(node);
      });
      node.on("dragstart", () => {
        selectNode(node);
      });
      node.on("dragend", () => {
        commitNodeMove(node, frame);
      });
    }

    const selectedNode = selectedBefore ? layer.findOne(`#${konvaId(selectedBefore)}`) : null;
    if (selectedNode) selectNode(selectedNode, { silent: true });
    else selectedId = "";
    layer.draw();
  }

  function createKonvaNode(object, frame) {
    const transform = object.effectiveTransform || identityTransform();
    const draggable = object.draggable !== false && object.locked !== true;
    const strokeWidth = Math.max(2, Number(object.brush?.size || object.strokeWidth || 3));
    const baseConfig = {
      id: konvaId(object.id),
      name: "scene-graph-edit-object",
      objectId: object.id,
      baseStrokeWidth: strokeWidth,
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      opacity: transform.opacity,
      draggable,
      listening: true,
    };

    if (object.type === "rect") {
      return new Konva.Rect({
        ...baseConfig,
        width: Number(object.width || object.w || 1),
        height: Number(object.height || object.h || 1),
        fill: object.fill ? "rgba(143, 90, 31, 0.08)" : undefined,
      stroke: "#8f5a1f",
      strokeWidth,
        hitStrokeWidth: Math.max(24, strokeWidth + 18),
      });
    }

    if (object.type === "ellipse") {
      const ellipseWidth = Number.isFinite(Number(object.width)) ? Number(object.width) : Number(object.rx || 1) * 2;
      const ellipseHeight = Number.isFinite(Number(object.height)) ? Number(object.height) : Number(object.ry || 1) * 2;
      return new Konva.Ellipse({
        ...baseConfig,
        radiusX: Math.max(1, ellipseWidth / 2),
        radiusY: Math.max(1, ellipseHeight / 2),
        fill: object.fill ? "rgba(143, 90, 31, 0.08)" : undefined,
      stroke: "#8f5a1f",
      strokeWidth,
        hitStrokeWidth: Math.max(24, strokeWidth + 18),
      });
    }

    const points = normalizePoints(object.points).flat();
    if (points.length < 4) return null;
    return new Konva.Line({
      ...baseConfig,
      points,
      closed: Boolean(object.fill && object.type !== "polyline"),
      fill: object.fill ? "rgba(143, 90, 31, 0.08)" : undefined,
      stroke: "#8f5a1f",
      baseStrokeWidth: Math.max(2, strokeWidth / 2),
      strokeWidth: Math.max(2, strokeWidth / 2),
      hitStrokeWidth: Math.max(24, strokeWidth + 18),
      lineCap: "round",
      lineJoin: "round",
    });
  }

  function selectNode(node, options = {}) {
    selectedId = node?.attrs?.objectId || "";
    layer.find(".scene-graph-edit-object").forEach((shape) => {
      const isSelected = shape === node;
      shape.stroke(isSelected ? "#1b1712" : "#8f5a1f");
      shape.opacity(isSelected ? 1 : 0.68);
      if (typeof shape.strokeWidth === "function") {
        const baseWidth = Number(shape.attrs.baseStrokeWidth || shape.strokeWidth() || 2);
        shape.strokeWidth(isSelected ? baseWidth + 1 : baseWidth);
      }
    });
    if (!options.silent) setStatus(selectedId ? `Selected ${selectedId}. Drag to move or press Delete.` : "No object selected.");
    layer.draw();
  }

  function commitNodeMove(node, frame) {
    const objectId = node?.attrs?.objectId;
    if (!objectId) return;
    const baseObject = runtime.getEffectiveObjects(frame, { includeCodeObjects: true }).find((object) => object.id === objectId);
    if (!baseObject) return;
    const baseTransform = combineTransform(baseObject, frame, null);
    runtime.setObjectOverride(objectId, {
      offsetX: node.x() - baseTransform.x,
      offsetY: node.y() - baseTransform.y,
      rotationDelta: node.rotation() - baseTransform.rotation,
      scaleXDelta: safeScale(node.scaleX() / (baseTransform.scaleX || 1)),
      scaleYDelta: safeScale(node.scaleY() / (baseTransform.scaleY || 1)),
      visible: true,
    });
    redrawFrame?.();
    setStatus(`Moved ${objectId}. Save edits to keep the change.`);
  }

  function deleteSelected() {
    if (!selectedId) return false;
    runtime.deleteObject(selectedId);
    selectedId = "";
    redrawFrame?.();
    setStatus("Object deleted. Save edits to keep the change.");
    return true;
  }

  function updateFrame() {
    render();
  }

  function destroy() {
    unsubscribe?.();
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("keydown", handleKeyDown);
    stage.destroy();
  }

  stage.on("click tap", (event) => {
    if (event.target === stage) selectNode(null);
  });

  function handleResize() {
    if (!enabled) return;
    syncStageSize();
    render();
  }

  function handleKeyDown(event) {
    if (!enabled) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelected();
    }
  }

  function syncStageSize() {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    stage.width(rect.width);
    stage.height(rect.height);
    stage.scale({
      x: rect.width / Math.max(1, width),
      y: rect.height / Math.max(1, height),
    });
  }

  window.addEventListener("resize", handleResize);
  window.addEventListener("keydown", handleKeyDown);

  function currentFrame() {
    const value = Number(getFrame?.() ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function setStatus(message) {
    if (statusOutput) statusOutput.textContent = message;
  }

  return {
    enable,
    disable,
    toggle() {
      if (enabled) disable();
      else enable();
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    render,
    updateFrame,
    deleteSelected,
    destroy,
  };
}

function createNoopEditor() {
  return {
    enable() {},
    disable() {},
    toggle() {
      return false;
    },
    isEnabled() {
      return false;
    },
    render() {},
    updateFrame() {},
    deleteSelected() {
      return false;
    },
    destroy() {},
  };
}

function drawPathObject(ctx, object) {
  const points = normalizePoints(object.points);
  if (points.length < 2) return;
  if (object.fill) {
    ctx.save();
    ctx.fillStyle = object.fill;
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const brush = createBrush({
    type: object.brush?.type || "pencil",
    color: object.brush?.color || object.stroke || "#201b15",
    size: Number(object.brush?.size ?? object.strokeWidth ?? 3),
    roughness: Number(object.brush?.roughness ?? 0.35),
    textureScale: Number(object.brush?.textureScale ?? 0.9),
    opacity: Number(object.brush?.opacity ?? object.opacity ?? 1),
    seed: Number(object.brush?.seed ?? object.seed ?? 1),
    thinning: Number(object.brush?.thinning ?? 0.45),
    smoothing: Number(object.brush?.smoothing ?? 0.35),
    streamline: Number(object.brush?.streamline ?? 0.18),
    jitter: Number(object.brush?.jitter ?? 0.2),
  });
  if (object.type === "polyline") brush.polyline(ctx, points, object.brush || {});
  else brush.stroke(ctx, points, object.brush || {});
}

function drawRectObject(ctx, object) {
  const brush = createBrush({ ...(object.brush || {}), color: object.brush?.color || object.stroke || "#201b15" });
  const width = Number(object.width ?? object.w ?? 0);
  const height = Number(object.height ?? object.h ?? 0);
  if (object.fill) {
    ctx.fillStyle = object.fill;
    ctx.fillRect(0, 0, width, height);
  }
  brush.polyline(
    ctx,
    [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
      [0, 0],
    ],
    object.brush || {},
  );
}

function drawEllipseObject(ctx, object) {
  const width = Number.isFinite(Number(object.width)) ? Number(object.width) : Number(object.rx || 0) * 2;
  const height = Number.isFinite(Number(object.height)) ? Number(object.height) : Number(object.ry || 0) * 2;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
  if (object.fill) {
    ctx.fillStyle = object.fill;
    ctx.fill();
  }
  ctx.lineWidth = Number(object.brush?.size ?? object.strokeWidth ?? 3);
  ctx.strokeStyle = object.brush?.color || object.stroke || "#201b15";
  ctx.globalAlpha *= Number(object.brush?.opacity ?? object.opacity ?? 1);
  ctx.stroke();
  ctx.restore();
}

function drawHitRegion(ctx, object) {
  const points = normalizePoints(object.points);
  ctx.save();
  ctx.beginPath();
  if (points.length >= 2) {
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  } else if (object.type === "rect") {
    ctx.rect(0, 0, Number(object.width || 1), Number(object.height || 1));
  } else if (object.type === "ellipse") {
    ctx.ellipse(0, 0, Number(object.width || 12) / 2, Number(object.height || 12) / 2, 0, 0, Math.PI * 2);
  }
  ctx.lineWidth = Math.max(16, Number(object.brush?.size || object.strokeWidth || 3) + 12);
  ctx.strokeStyle = "#000";
  ctx.stroke();
  ctx.restore();
}

function applyCanvasTransform(ctx, transform) {
  ctx.translate(transform.x || 0, transform.y || 0);
  ctx.rotate(((transform.rotation || 0) * Math.PI) / 180);
  ctx.scale(safeScale(transform.scaleX), safeScale(transform.scaleY));
}

function combineTransform(object, frame, override) {
  const base = normalizeTransform(object.transform);
  const animated = animationTransformForFrame(object.animation, frame);
  const merged = {
    x: base.x + animated.x,
    y: base.y + animated.y,
    rotation: base.rotation + animated.rotation,
    scaleX: base.scaleX * animated.scaleX,
    scaleY: base.scaleY * animated.scaleY,
    opacity: base.opacity * animated.opacity,
  };

  if (!override) return merged;
  return {
    x: merged.x + Number(override.offsetX || 0),
    y: merged.y + Number(override.offsetY || 0),
    rotation: merged.rotation + Number(override.rotationDelta || 0),
    scaleX: merged.scaleX * safeScale(override.scaleXDelta),
    scaleY: merged.scaleY * safeScale(override.scaleYDelta),
    opacity: merged.opacity,
  };
}

function animationTransformForFrame(animation, frame) {
  if (!animation || typeof animation !== "object") return identityTransform();
  if (Array.isArray(animation.keyframes)) {
    return transformFromKeyframes(animation.keyframes, frame);
  }
  return {
    x: animatedNumber(animation.x, frame, 0),
    y: animatedNumber(animation.y, frame, 0),
    rotation: animatedNumber(animation.rotation, frame, 0),
    scaleX: animatedNumber(animation.scaleX, frame, 1),
    scaleY: animatedNumber(animation.scaleY, frame, 1),
    opacity: animatedNumber(animation.opacity, frame, 1),
  };
}

function transformFromKeyframes(keyframes, frame) {
  const sorted = keyframes
    .map((keyframe) => ({
      frame: Number(keyframe.frame ?? keyframe.at ?? 0),
      transform: normalizeTransform(keyframe.transform || keyframe),
    }))
    .filter((keyframe) => Number.isFinite(keyframe.frame))
    .sort((a, b) => a.frame - b.frame);
  if (!sorted.length) return identityTransform();
  if (frame <= sorted[0].frame) return sorted[0].transform;
  if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].transform;
  const nextIndex = sorted.findIndex((keyframe) => keyframe.frame >= frame);
  const previous = sorted[nextIndex - 1];
  const next = sorted[nextIndex];
  const span = Math.max(1, next.frame - previous.frame);
  const t = clamp01((frame - previous.frame) / span);
  return {
    x: lerp(previous.transform.x, next.transform.x, t),
    y: lerp(previous.transform.y, next.transform.y, t),
    rotation: lerp(previous.transform.rotation, next.transform.rotation, t),
    scaleX: lerp(previous.transform.scaleX, next.transform.scaleX, t),
    scaleY: lerp(previous.transform.scaleY, next.transform.scaleY, t),
    opacity: lerp(previous.transform.opacity, next.transform.opacity, t),
  };
}

function animatedNumber(value, frame, fallback) {
  if (Array.isArray(value)) {
    const points = value
      .map((entry) => (Array.isArray(entry) ? { frame: Number(entry[0]), value: Number(entry[1]) } : { frame: Number(entry.frame), value: Number(entry.value) }))
      .filter((entry) => Number.isFinite(entry.frame) && Number.isFinite(entry.value))
      .sort((a, b) => a.frame - b.frame);
    if (!points.length) return fallback;
    if (frame <= points[0].frame) return points[0].value;
    if (frame >= points[points.length - 1].frame) return points[points.length - 1].value;
    const nextIndex = points.findIndex((point) => point.frame >= frame);
    const previous = points[nextIndex - 1];
    const next = points[nextIndex];
    return lerp(previous.value, next.value, clamp01((frame - previous.frame) / Math.max(1, next.frame - previous.frame)));
  }
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeBaseGraph(value, size = {}) {
  const graph = value && typeof value === "object" ? value : {};
  return {
    version: Number(graph.version) || 1,
    width: Number(graph.width) || size.width || null,
    height: Number(graph.height) || size.height || null,
    objects: Array.isArray(graph.objects) ? graph.objects.map(normalizeGraphObject).filter(Boolean) : [],
  };
}

function normalizeEditLayer(value, fallbackHash = "") {
  const edit = value && typeof value === "object" ? value : {};
  const overrides = {};
  for (const [id, override] of Object.entries(edit.overrides || {})) {
    const objectId = String(id || "").trim();
    if (objectId) overrides[objectId] = normalizeOverride(override);
  }
  return {
    version: Number(edit.version) || 1,
    baseHash: String(edit.baseHash || fallbackHash || ""),
    deletedIds: Array.isArray(edit.deletedIds) ? [...new Set(edit.deletedIds.map((id) => String(id || "").trim()).filter(Boolean))] : [],
    overrides,
    addedObjects: Array.isArray(edit.addedObjects) ? edit.addedObjects.map(normalizeGraphObject).filter(Boolean) : [],
  };
}

function normalizeGraphObject(value) {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id || "").trim();
  if (!id) return null;
  const type = String(value.type || "path").trim();
  if (!GRAPH_OBJECT_TYPES.has(type)) return null;
  return {
    ...cloneJson(value),
    id,
    type,
    points: normalizePoints(value.points),
    frameRange: normalizeFrameRange(value.frameRange),
    transform: normalizeTransform(value.transform),
    brush: normalizeBrush(value.brush),
    opacity: Number.isFinite(Number(value.opacity)) ? Number(value.opacity) : 1,
    draggable: value.draggable !== false,
    locked: value.locked === true,
  };
}

function normalizeOverride(value) {
  const override = value && typeof value === "object" ? value : {};
  return {
    offsetX: Number(override.offsetX || 0),
    offsetY: Number(override.offsetY || 0),
    rotationDelta: Number(override.rotationDelta || 0),
    scaleXDelta: safeScale(override.scaleXDelta),
    scaleYDelta: safeScale(override.scaleYDelta),
    visible: override.visible !== false,
  };
}

function normalizeBrush(value) {
  const brush = value && typeof value === "object" ? value : {};
  return {
    ...cloneJson(brush),
    type: String(brush.type || "pencil"),
    color: String(brush.color || "#201b15"),
    size: Number(brush.size || 3),
    roughness: Number(brush.roughness ?? 0.35),
    textureScale: Number(brush.textureScale ?? 0.9),
    opacity: Number(brush.opacity ?? 1),
  };
}

function normalizeTransform(value) {
  const transform = value && typeof value === "object" ? value : {};
  return {
    x: Number(transform.x || 0),
    y: Number(transform.y || 0),
    rotation: Number(transform.rotation || 0),
    scaleX: safeScale(transform.scaleX),
    scaleY: safeScale(transform.scaleY),
    opacity: Number.isFinite(Number(transform.opacity)) ? Number(transform.opacity) : 1,
  };
}

function identityTransform() {
  return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 };
}

function normalizePoints(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((point) => {
      if (Array.isArray(point)) return [Number(point[0]), Number(point[1])];
      if (point && typeof point === "object") return [Number(point.x), Number(point.y)];
      return null;
    })
    .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function normalizeFrameRange(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const start = Math.max(0, Math.round(Number(value[0]) || 0));
  const end = Math.max(start, Math.round(Number(value[1]) || start));
  return [start, end];
}

function isObjectActiveAtFrame(object, frame) {
  if (!object.frameRange) return true;
  return frame >= object.frameRange[0] && frame <= object.frameRange[1];
}

function safeScale(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : 1;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function konvaId(id) {
  return `scene-object-${String(id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function baseHash(graph) {
  const source = JSON.stringify(graph?.objects || []);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return `base-${Math.abs(hash).toString(36)}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
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

export const __sceneGraphInternals = {
  normalizeBaseGraph,
  normalizeEditLayer,
  normalizeGraphObject,
  combineTransform,
};
