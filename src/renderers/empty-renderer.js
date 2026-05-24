export function createEmptyRenderer(message = "Renderer not built yet") {
  const project = {
    width: 960,
    height: 620,
    fps: 12,
    totalFrames: 1,
  };

  return {
    project,
    drawFrame(ctx, frame, helpers = {}) {
      ctx.fillStyle = "#f6ead5";
      ctx.fillRect(0, 0, project.width, project.height);
      helpers.drawLabel?.(ctx, message, project.width / 2, project.height / 2);
    },
  };
}
