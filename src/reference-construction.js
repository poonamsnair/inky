const DEFAULT_ROLE_PRIORITY = Object.freeze({
  character: 100,
  figure: 95,
  head: 90,
  hair: 88,
  face: 84,
  arm: 78,
  hand: 76,
  lettering: 72,
  underline: 68,
  emphasis: 50,
  prop: 42,
  contour: 20,
});

export function buildReferenceConstruction(extracted, options = {}) {
  const paths = Array.isArray(extracted) ? extracted : extracted?.paths || [];
  const source = normalizeSource(extracted?.source, options);
  const canvas = normalizeCanvas(options.canvas || options, source);
  const pathInfos = paths.map((path, index) => normalizePathInfo(path, index, source)).filter(Boolean);
  const objects = classifyPathObjects(pathInfos, source, options);
  const groups = groupConstructionObjects(objects);

  return {
    version: 1,
    engine: "inky-reference-construction",
    createdAt: options.createdAt || new Date().toISOString(),
    projectRef: String(options.projectRef || "").trim(),
    sourceImage: String(options.sourceImage || options.image || "").trim(),
    coordinateSpace: "source-image",
    source,
    canvas,
    fitToCanvas: fitReferenceToCanvas(source, canvas, options.fit || "contain"),
    pathCount: pathInfos.length,
    objects,
    groups,
    guidance: [
      "Use this optional map as optical alignment evidence for proportions, contact points, and placement only.",
      "Redraw final artwork with Canvas and Inky brushes; never paste or hide the source image.",
      "Prefer the browser reference overlay and canvas captures for judgment; use bounds review only when a project explicitly needs a numeric check.",
      "Build readable large shapes first, then attach sleeves, wrists, hands, face, hair, props, and lettering.",
    ],
  };
}

export function fitReferenceToCanvas(source = {}, canvas = {}, fit = "contain") {
  const sourceWidth = positiveNumber(source.width || source.naturalWidth, 1);
  const sourceHeight = positiveNumber(source.height || source.naturalHeight, 1);
  const canvasWidth = positiveNumber(canvas.width, sourceWidth);
  const canvasHeight = positiveNumber(canvas.height, sourceHeight);
  const mode = fit === "cover" ? "cover" : "contain";
  const scale =
    mode === "cover"
      ? Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight)
      : Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    fit: mode,
    scale: round(scale),
    x: round((canvasWidth - width) / 2),
    y: round((canvasHeight - height) / 2),
    width: round(width),
    height: round(height),
  };
}

export function scaleConstructionBoundsToCanvas(bounds, construction, options = {}) {
  const fit = options.fitToCanvas || construction?.fitToCanvas || fitReferenceToCanvas(construction?.source, construction?.canvas, options.fit);
  return scaleBounds(bounds, fit);
}

export function compareBoundsToConstruction(bounds, construction, options = {}) {
  const boxes = Array.isArray(bounds) ? bounds : bounds?.boxes || [];
  const objects = Array.isArray(construction?.objects) ? construction.objects : [];
  const canvas = normalizeCanvas(construction?.canvas || options.canvas, construction?.source || {});
  const tolerance = {
    center: positiveNumber(options.centerTolerance, Math.max(42, Math.min(canvas.width, canvas.height) * 0.075)),
    sizeMin: positiveNumber(options.sizeMin, 0.52),
    sizeMax: positiveNumber(options.sizeMax, 1.9),
  };

  return boxes.map((box, index) => {
    const normalizedBox = normalizeBox(box);
    const match = findConstructionMatch(box, objects);
    const scaledReference = match ? scaleConstructionBoundsToCanvas(match.bounds, construction, options) : null;
    const metrics = scaledReference && finiteBox(normalizedBox) ? compareBoxes(normalizedBox, scaledReference) : null;
    const verdict =
      !finiteBox(normalizedBox) || !insideCanvas(normalizedBox, canvas)
        ? "fail"
        : !match
          ? "needs-target"
          : metrics.centerDistance <= tolerance.center &&
              metrics.widthRatio >= tolerance.sizeMin &&
              metrics.widthRatio <= tolerance.sizeMax &&
              metrics.heightRatio >= tolerance.sizeMin &&
              metrics.heightRatio <= tolerance.sizeMax
            ? "pass"
            : "warn";

    return {
      id: String(box?.id || box?.label || `important-shape-${index + 1}`).trim(),
      role: String(box?.role || "").trim(),
      frame: Number.isFinite(Number(box?.frame)) ? Number(box.frame) : null,
      bounds: normalizedBox,
      referenceObject: match
        ? {
            id: match.id,
            role: match.role,
            label: match.label,
            bounds: match.bounds,
            canvasBounds: scaledReference,
          }
        : null,
      metrics,
      verdict,
    };
  });
}

function classifyPathObjects(pathInfos, source, options) {
  const minArea = positiveNumber(options.minObjectArea, Math.max(18, source.width * source.height * 0.00025));
  const candidates = pathInfos.filter((path) => path.area >= minArea);
  const objects = [];
  const used = new Set();
  const sortedByArea = [...candidates].sort((a, b) => b.area - a.area);
  const largest = sortedByArea[0] || null;

  const characterPaths = candidates.filter((path) => {
    if (!largest) return false;
    const center = centerOf(path.bounds);
    return (
      path === largest ||
      (center.x < source.width * 0.46 && center.y > source.height * 0.08 && center.y < source.height * 0.96) ||
      overlaps(path.bounds, largest.bounds, 0.08)
    );
  });

  if (characterPaths.length) {
    const bounds = boundsUnion(characterPaths.map((path) => path.bounds));
    objects.push(objectFromPaths("character", "character", "Full character silhouette", characterPaths, bounds));
    characterPaths.forEach((path) => used.add(path.id));
  }

  for (const path of candidates) {
    const role = classifySinglePath(path, source, used);
    if (!role) continue;
    objects.push(objectFromPaths(stableObjectId(role, objects), role, labelForRole(role), [path], path.bounds));
    used.add(path.id);
  }

  return objects
    .sort((a, b) => (DEFAULT_ROLE_PRIORITY[b.role] || 0) - (DEFAULT_ROLE_PRIORITY[a.role] || 0) || b.area - a.area)
    .map((object, index) => ({
      ...object,
      order: index + 1,
      importance: DEFAULT_ROLE_PRIORITY[object.role] || 10,
    }));
}

function classifySinglePath(path, source, used) {
  const bounds = path.bounds;
  const center = centerOf(bounds);
  const areaRatio = path.area / Math.max(1, source.width * source.height);
  const aspect = bounds.w / Math.max(1, bounds.h);
  const dark = Number(path.color?.lightness) < 96;
  const rightSide = center.x > source.width * 0.44;
  const topBand = center.y < source.height * 0.42;
  const midBand = center.y >= source.height * 0.32 && center.y < source.height * 0.72;
  const smallMark = areaRatio < 0.012;

  if (used.has(path.id)) {
    if (topBand && dark && center.x < source.width * 0.45) return "hair";
    if (topBand && center.x < source.width * 0.45) return "head";
    return "";
  }

  if (rightSide && aspect > 5 && bounds.h < source.height * 0.08) return "underline";
  if (rightSide && dark && areaRatio > 0.0025 && bounds.h > source.height * 0.05) return "lettering";
  if (rightSide && smallMark) return "emphasis";
  if (topBand && dark && center.x < source.width * 0.45) return "hair";
  if (topBand && center.x < source.width * 0.45) return "head";
  if (midBand && center.x < source.width * 0.45 && bounds.w < source.width * 0.18 && bounds.h > source.height * 0.1) return "arm";
  if (center.y > source.height * 0.42 && center.y < source.height * 0.76 && bounds.w < source.width * 0.12 && bounds.h < source.height * 0.12) return "hand";
  if (areaRatio > 0.02) return "figure";
  return "contour";
}

function objectFromPaths(id, role, label, paths, bounds) {
  return {
    id,
    role,
    label,
    sourcePathIds: paths.map((path) => path.id),
    bounds: normalizeBounds(bounds),
    area: round(paths.reduce((total, path) => total + path.area, 0)),
    pointCount: paths.reduce((total, path) => total + path.pointCount, 0),
    notes: notesForRole(role),
  };
}

function groupConstructionObjects(objects) {
  const groups = {
    character: [],
    head: [],
    limbs: [],
    lettering: [],
    emphasis: [],
    props: [],
  };
  for (const object of objects) {
    if (["character", "figure"].includes(object.role)) groups.character.push(object.id);
    if (["head", "hair", "face"].includes(object.role)) groups.head.push(object.id);
    if (["arm", "hand"].includes(object.role)) groups.limbs.push(object.id);
    if (["lettering", "underline"].includes(object.role)) groups.lettering.push(object.id);
    if (object.role === "emphasis") groups.emphasis.push(object.id);
    if (object.role === "prop") groups.props.push(object.id);
  }
  return groups;
}

function findConstructionMatch(box, objects) {
  const explicitId = normalizeMatchKey(box?.constructionId || box?.referenceId || "");
  if (explicitId) {
    const explicit = objects.find((object) => normalizeMatchKey(object.id) === explicitId);
    if (explicit) return explicit;
  }

  const key = normalizeMatchKey([box?.id, box?.label, box?.role].filter(Boolean).join(" "));
  if (!key) return null;
  const direct = objects.find((object) => {
    return [object.id, object.role, object.label].some((value) => key.includes(normalizeMatchKey(value)));
  });
  if (direct) return direct;

  const roleMatch = roleFromKey(key);
  if (roleMatch) {
    return objects.find((object) => object.role === roleMatch || object.id === roleMatch) || null;
  }

  return null;
}

function roleFromKey(key) {
  if (/(full|character|body|figure|silhouette)/.test(key)) return "character";
  if (/(hair|head|face|glasses|bob)/.test(key)) return "head";
  if (/(word|inky|letter|text|type)/.test(key)) return "lettering";
  if (/underline/.test(key)) return "underline";
  if (/(arm|sleeve)/.test(key)) return "arm";
  if (/(hand|finger|wrist)/.test(key)) return "hand";
  return "";
}

function normalizePathInfo(path, index, source) {
  const bounds = normalizeBounds(path?.bounds);
  if (!finiteBox(bounds)) return null;
  return {
    id: String(path.id || `path-${String(index + 1).padStart(3, "0")}`),
    color: path.color || null,
    bounds,
    area: positiveNumber(path.area, bounds.w * bounds.h),
    pointCount: Array.isArray(path.points) ? path.points.length : 0,
    center: centerOf(bounds),
    source,
  };
}

function normalizeSource(source = {}, options = {}) {
  const width = positiveNumber(source.width || source.naturalWidth || options.sourceWidth || options.width, 1);
  const height = positiveNumber(source.height || source.naturalHeight || options.sourceHeight || options.height, 1);
  return {
    width: round(width),
    height: round(height),
    naturalWidth: round(positiveNumber(source.naturalWidth, width)),
    naturalHeight: round(positiveNumber(source.naturalHeight, height)),
    scale: round(positiveNumber(source.scale, 1)),
  };
}

function normalizeCanvas(canvas = {}, source = {}) {
  return {
    width: round(positiveNumber(canvas.width, source.width || 960)),
    height: round(positiveNumber(canvas.height, source.height || 620)),
  };
}

function normalizeBox(box = {}) {
  const x = Number(box.x ?? box.left ?? box[0]);
  const y = Number(box.y ?? box.top ?? box[1]);
  const width = Number(box.width ?? box.w ?? box[2]);
  const height = Number(box.height ?? box.h ?? box[3]);
  return {
    x: round(x),
    y: round(y),
    width: round(width),
    height: round(height),
  };
}

function normalizeBounds(bounds = {}) {
  const x = Number(bounds.x ?? bounds.left ?? bounds[0]);
  const y = Number(bounds.y ?? bounds.top ?? bounds[1]);
  const w = Number(bounds.w ?? bounds.width ?? bounds[2]);
  const h = Number(bounds.h ?? bounds.height ?? bounds[3]);
  return {
    x: round(x),
    y: round(y),
    w: round(w),
    h: round(h),
    x2: round(Number(bounds.x2 ?? x + w)),
    y2: round(Number(bounds.y2 ?? y + h)),
  };
}

function boundsUnion(boundsList) {
  const boxes = boundsList.filter(finiteBounds);
  if (!boxes.length) return { x: 0, y: 0, w: 0, h: 0, x2: 0, y2: 0 };
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const x2 = Math.max(...boxes.map((box) => box.x2 ?? box.x + box.w));
  const y2 = Math.max(...boxes.map((box) => box.y2 ?? box.y + box.h));
  return { x, y, w: x2 - x, h: y2 - y, x2, y2 };
}

function scaleBounds(bounds, fit) {
  const normalized = normalizeBounds(bounds);
  return {
    x: round(fit.x + normalized.x * fit.scale),
    y: round(fit.y + normalized.y * fit.scale),
    width: round(normalized.w * fit.scale),
    height: round(normalized.h * fit.scale),
  };
}

function compareBoxes(box, reference) {
  const boxCenter = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const referenceCenter = { x: reference.x + reference.width / 2, y: reference.y + reference.height / 2 };
  return {
    centerDistance: round(distance(boxCenter, referenceCenter)),
    widthRatio: round(box.width / Math.max(1, reference.width), 3),
    heightRatio: round(box.height / Math.max(1, reference.height), 3),
    areaRatio: round((box.width * box.height) / Math.max(1, reference.width * reference.height), 3),
  };
}

function overlaps(a, b, ratio = 0.1) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x2 ?? a.x + a.w, b.x2 ?? b.x + b.w);
  const y2 = Math.min(a.y2 ?? a.y + a.h, b.y2 ?? b.y + b.h);
  const area = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return area / Math.max(1, Math.min(a.w * a.h, b.w * b.h)) >= ratio;
}

function insideCanvas(box, canvas) {
  return box.x >= 0 && box.y >= 0 && box.x + box.width <= canvas.width && box.y + box.height <= canvas.height;
}

function finiteBox(box) {
  return box && [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width >= 0 && box.height >= 0;
}

function finiteBounds(bounds) {
  return bounds && [bounds.x, bounds.y, bounds.w, bounds.h].every(Number.isFinite);
}

function centerOf(bounds) {
  return {
    x: bounds.x + bounds.w / 2,
    y: bounds.y + bounds.h / 2,
  };
}

function stableObjectId(role, objects) {
  const count = objects.filter((object) => object.role === role).length + 1;
  return count === 1 ? role : `${role}-${String(count).padStart(2, "0")}`;
}

function labelForRole(role) {
  return {
    character: "Full character",
    figure: "Main figure",
    head: "Head and face area",
    hair: "Hair mass",
    face: "Face details",
    arm: "Arm or sleeve",
    hand: "Hand or wrist",
    lettering: "Lettering",
    underline: "Underline",
    emphasis: "Emphasis mark",
    prop: "Prop",
    contour: "Reference contour",
  }[role] || role;
}

function notesForRole(role) {
  return {
    character: "Lock the silhouette before drawing hair, stripes, or watercolor texture.",
    head: "Keep the head, face, glasses, and hair aligned as one attached layout group.",
    hair: "Draw as a soft ink cap with interior locks, not as a flat pasted mask.",
    arm: "Attach shoulder, sleeve, wrist, and hand in one chain.",
    hand: "Add wrist/cuff contact before fingers.",
    lettering: "Match position and scale, then redraw letters with ink strokes.",
    underline: "Use as a placement guide for the word baseline.",
    emphasis: "Small decorative marks should support the action, not fix anatomy.",
  }[role] || "Use this contour as placement evidence only.";
}

function normalizeMatchKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round(value, decimals = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const factor = 10 ** decimals;
  return Math.round(parsed * factor) / factor;
}
