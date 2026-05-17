export const project = {
  width: 960,
  height: 620,
  fps: 12,
  totalFrames: 96,
};

export function drawFrame(ctx, frame, helpers) {
  ctx.fillStyle = "#faf8f0";
  ctx.fillRect(0, 0, project.width, project.height);

  helpers.drawLabel?.(
    ctx,
    `MP4 preview available - frame ${String(frame + 1).padStart(2, "0")}`,
    project.width / 2,
    project.height / 2,
  );
}
