import rough from "roughjs";

export const ROUGH_SAFE_USES = [
  "background poster or wall art texture",
  "paper-edge accent",
  "non-semantic dust or sparkle accent",
  "loose background prop texture",
  "thumbnail-only review sketch",
];

export const ROUGH_AVOID_USES = [
  "speech bubbles and thought bubbles",
  "readable text, captions, labels, and nameplates",
  "faces, eyes, mouths, hands, fingers, and body silhouettes",
  "rigid borders, desks, frames, calculators, certificates, or doors",
  "any object whose exact contact point matters to the story",
];

export function drawSafeRoughAccent(ctx, shape, options = {}) {
  if (!ctx?.canvas || !shape?.kind) return false;
  const rc = rough.canvas(ctx.canvas);
  const roughOptions = {
    stroke: options.stroke || "#17120d",
    strokeWidth: options.strokeWidth ?? 1.4,
    fill: options.fill,
    fillStyle: options.fillStyle || "hachure",
    roughness: Math.min(options.roughness ?? 0.55, 0.9),
    bowing: Math.min(options.bowing ?? 0.35, 0.65),
    hachureGap: options.hachureGap ?? 8,
    hachureAngle: options.hachureAngle ?? -35,
    seed: options.seed ?? 101,
  };

  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  if (shape.kind === "rect") {
    rc.rectangle(shape.x, shape.y, shape.w, shape.h, roughOptions);
  } else if (shape.kind === "ellipse") {
    rc.ellipse(shape.cx, shape.cy, shape.w, shape.h, roughOptions);
  } else if (shape.kind === "line") {
    rc.line(shape.x1, shape.y1, shape.x2, shape.y2, roughOptions);
  } else if (shape.kind === "path") {
    rc.path(shape.d, roughOptions);
  } else {
    ctx.restore();
    return false;
  }
  ctx.restore();
  return true;
}
