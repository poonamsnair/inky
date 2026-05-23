import { renderMp4FromCanvasFrames } from "./mp4-exporter.js";
import { createAnnotationReviewer } from "./annotation-reviewer.js";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function createPreviewPlayer({ manifest, renderer, params = new URLSearchParams(), exportMode = false }) {
  const canvas = document.querySelector("#whiteboard");
  const ctx = canvas.getContext("2d", { alpha: false });
  const stageShell = document.querySelector(".stage-shell");
  const mp4Preview = document.querySelector("#mp4Preview");
  const playButton = document.querySelector("#play");
  const pauseButton = document.querySelector("#pause");
  const timeline = document.querySelector("#timeline");
  const frameCounter = document.querySelector("#frameCounter");
  const speedSelect = document.querySelector("#playbackSpeed");
  const exportPngButton = document.querySelector("#exportPng");
  const exportMp4Button = document.querySelector("#exportMp4");
  const statusOutput = document.querySelector("#paintStatus");
  const referenceOverlay = document.querySelector("#referenceOverlay");
  const frameDebugger = document.querySelector("#frameDebugger");
  const frameDebuggerOutput = document.querySelector("#frameDebuggerOutput");

  const width = numberOr(renderer.project?.width, manifest.width);
  const height = numberOr(renderer.project?.height, manifest.height);
  const fps = numberOr(renderer.project?.fps, manifest.fps);
  const totalFrames = Math.max(1, numberOr(renderer.project?.totalFrames, manifest.totalFrames));
  const frameMs = 1000 / fps;
  const fixedFrame = params.has("frame") ? clamp(Math.round(Number(params.get("frame"))), 0, totalFrames - 1) : null;
  const requestedSpeed = params.has("speed") ? Number(params.get("speed")) : null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentFrame = fixedFrame ?? 0;
  let isPlaying = !exportMode && !Number.isFinite(fixedFrame) && !reduceMotion;
  let lastFrameTick = 0;
  let animationId = 0;
  let playbackSpeed = nearestPlaybackSpeed(requestedSpeed ?? Number(speedSelect.value));
  let isExportingMp4 = false;
  let previewVideo = mp4PreviewForSpeed(playbackSpeed);
  let referenceState = null;
  let lastRenderError = renderer.loadError || null;
  const hasVideoPreview = !exportMode && Boolean(mp4Preview && previewVideo?.path);
  const annotationReviewer = exportMode
    ? null
    : createAnnotationReviewer({
        manifest,
        width,
        height,
        fps,
        totalFrames,
        goToFrame,
        stopPlayback,
        captureFrameDataUrl,
      });

  canvas.width = width;
  canvas.height = height;
  if (referenceOverlay) referenceOverlay.hidden = true;
  timeline.max = String(totalFrames - 1);
  timeline.value = String(currentFrame);
  speedSelect.value = String(playbackSpeed);
  exportMp4Button.disabled = false;
  stageShell?.classList.toggle("has-video-preview", hasVideoPreview);
  canvas.hidden = hasVideoPreview;

  if (mp4Preview) {
    mp4Preview.hidden = !hasVideoPreview;
    mp4Preview.loop = true;
    mp4Preview.muted = true;
    mp4Preview.playbackRate = previewVideo?.playbackRate ?? playbackSpeed;
    if (hasVideoPreview) mp4Preview.src = projectAssetUrl(manifest.slug, previewVideo.path);
    else mp4Preview.removeAttribute("src");
  }

  const helpers = {
    drawLabel,
    drawRendererError,
    manifest,
    inky: {
      captureFrameDataUrl,
      inspectFrame,
    },
  };

  function paintFrame(targetCtx, frame = currentFrame) {
    const safeFrame = clamp(Math.round(frame), 0, totalFrames - 1);
    targetCtx.save();
    targetCtx.clearRect(0, 0, width, height);
    try {
      if (typeof renderer.drawFrame === "function") {
        renderer.drawFrame(targetCtx, safeFrame, helpers);
        if (lastRenderError?.kind === "renderer-draw") setRenderError(null);
      } else {
        drawMissingRenderer(targetCtx, manifest, safeFrame);
      }
    } catch (error) {
      const renderError = normalizePreviewError(error, {
        kind: "renderer-draw",
        project: manifest.slug,
        renderer: renderer.rendererPath || manifest.renderer || "renderer.js",
        frame: safeFrame,
      });
      console.error("[inky-renderer] Draw failed", renderError.raw || error);
      setRenderError(renderError);
      drawRendererError(targetCtx, renderError, manifest);
    }
    targetCtx.restore();
    return safeFrame;
  }

  function drawFrame(frame = currentFrame) {
    const safeFrame = paintFrame(ctx, frame);
    currentFrame = safeFrame;
    updateUi(safeFrame);
    return safeFrame;
  }

  function start() {
    bindControls();
    annotationReviewer?.start();
    if (lastRenderError) setRenderError(lastRenderError);
    if (hasVideoPreview) {
      bindVideoEvents();
      isPlaying = false;
      updateUi(currentFrame);
    } else {
      drawFrame(currentFrame);
    }
    if (!exportMode && !Number.isFinite(fixedFrame)) {
      animationId = window.requestAnimationFrame(tick);
    }
  }

  function bindControls() {
    playButton.addEventListener("click", () => {
      if (hasVideoPreview) {
        playVideoPreview();
        return;
      }
      isPlaying = true;
      lastFrameTick = 0;
      updateUi(currentFrame);
    });

    pauseButton.addEventListener("click", () => {
      if (hasVideoPreview) {
        pauseVideoPreview();
        return;
      }
      isPlaying = false;
      updateUi(currentFrame);
    });

    timeline.addEventListener("input", (event) => {
      isPlaying = false;
      if (hasVideoPreview) {
        pauseVideoPreview();
        scrubVideoPreview(Number(event.target.value));
        return;
      }
      drawFrame(Number(event.target.value));
    });

    speedSelect.addEventListener("change", (event) => {
      setPlaybackSpeed(event.target.value);
      updateUi(currentFrame);
    });

    exportPngButton.addEventListener("click", exportPng);
    exportMp4Button.addEventListener("click", exportMp4);
  }

  function bindVideoEvents() {
    mp4Preview.addEventListener("loadedmetadata", () => {
      scrubVideoPreview(currentFrame);
      updateUi(currentFrame);
    });
    mp4Preview.addEventListener("play", () => {
      isPlaying = true;
      updateUi(currentFrame);
    });
    mp4Preview.addEventListener("pause", () => {
      isPlaying = false;
      updateUi(currentFrame);
    });
  }

  function tick(timestamp) {
    if (hasVideoPreview) {
      const frame = frameFromVideo();
      if (frame !== currentFrame) {
        currentFrame = frame;
        updateUi(currentFrame);
      }
      if (!exportMode && !Number.isFinite(fixedFrame)) animationId = window.requestAnimationFrame(tick);
      return;
    }

    if (!lastFrameTick) lastFrameTick = timestamp;
    const frameDuration = frameMs / playbackSpeed;
    const elapsed = timestamp - lastFrameTick;
    if (isPlaying && elapsed >= frameDuration) {
      const frameSteps = Math.max(1, Math.floor(elapsed / frameDuration));
      drawFrame((currentFrame + frameSteps) % totalFrames);
      lastFrameTick += frameSteps * frameDuration;
    }
    if (!exportMode && !Number.isFinite(fixedFrame)) animationId = window.requestAnimationFrame(tick);
  }

  function exportPng() {
    if (hasVideoPreview && mp4Preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(mp4Preview, 0, 0, width, height);
    } else {
      drawFrame(currentFrame);
    }
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `${manifest.slug}-frame-${String(currentFrame + 1).padStart(3, "0")}.png`;
    anchor.click();
    statusOutput.textContent = "PNG frame exported";
  }

  async function exportMp4() {
    if (isExportingMp4) return;

    const videoPath = mp4ExportPathForSpeed(playbackSpeed);
    if (!videoPath) {
      await renderAndSaveMp4();
      return;
    }

    downloadProjectMp4(videoPath, playbackSpeed);
    statusOutput.textContent = `MP4 export downloaded at ${formatSpeedLabel(playbackSpeed)}x`;
  }

  async function renderAndSaveMp4() {
    const speedLabel = formatSpeedLabel(playbackSpeed);
    const wasPlaying = isPlaying;
    setMp4Exporting(true);
    isPlaying = false;
    pauseVideoPreview();
    updateUi(currentFrame);

    let exportResult;
    try {
      statusOutput.textContent = `Preparing MP4 at ${speedLabel}x...`;
      exportResult = await renderMp4FromCanvasFrames({
        width,
        height,
        fps,
        totalFrames,
        playbackSpeed,
        drawFrame: (targetCtx, frame) => paintFrame(targetCtx, frame),
        onProgress: ({ phase, frame, totalFrames: frameTotal }) => {
          if (phase === "checking-codec") {
            statusOutput.textContent = "Checking MP4 support...";
          } else if (phase === "rendering") {
            statusOutput.textContent = `Rendering MP4 frame ${frame} / ${frameTotal}`;
          } else if (phase === "finalizing") {
            statusOutput.textContent = "Finishing MP4...";
          }
        },
      });
    } catch (error) {
      console.error("MP4 render failed", error);
      statusOutput.textContent = error?.message || "MP4 export failed.";
      setMp4Exporting(false);
      if (wasPlaying && !hasVideoPreview) isPlaying = true;
      updateUi(currentFrame);
      return;
    }

    let savedExport = null;
    let saveError = null;
    try {
      statusOutput.textContent = "Saving MP4 to project...";
      savedExport = await saveMp4ToProject(exportResult.blob, playbackSpeed);
      registerSavedOutputs(savedExport.outputs);
      refreshVideoPreviewSource();
    } catch (error) {
      saveError = error;
      console.warn("MP4 save endpoint unavailable", error);
    }

    if (savedExport?.path) {
      downloadProjectMp4(savedExport.path, playbackSpeed);
      statusOutput.textContent = `MP4 rendered, saved, and downloaded at ${speedLabel}x`;
    } else {
      downloadBlob(exportResult.blob, `${manifest.slug}-${speedLabel}x.mp4`);
      statusOutput.textContent = saveError
        ? `MP4 downloaded at ${speedLabel}x, but was not saved to the project.`
        : `MP4 downloaded at ${speedLabel}x.`;
    }

    setMp4Exporting(false);
    if (wasPlaying && !hasVideoPreview) isPlaying = true;
    drawFrame(currentFrame);
  }

  function downloadProjectMp4(videoPath, speed) {
    const anchor = document.createElement("a");
    anchor.href = `${projectAssetUrl(manifest.slug, videoPath)}?v=${Date.now()}`;
    anchor.download = `${manifest.slug}-${formatSpeedLabel(speed)}x.mp4`;
    anchor.click();
  }

  function updateUi(frame) {
    if (hasVideoPreview) isPlaying = !mp4Preview.paused;
    timeline.value = String(frame);
    frameCounter.textContent = `${frame + 1} / ${totalFrames}`;
    frameCounter.setAttribute("aria-label", `Frame ${frame + 1} of ${totalFrames}`);
    playButton.setAttribute("aria-pressed", String(isPlaying));
    pauseButton.setAttribute("aria-pressed", String(!isPlaying));
    annotationReviewer?.setFrame(frame);
    updateDebugPanel(frame);
  }

  function goToFrame(frame) {
    isPlaying = false;
    const safeFrame = clamp(Math.round(frame), 0, totalFrames - 1);
    if (hasVideoPreview) {
      pauseVideoPreview();
      scrubVideoPreview(safeFrame);
      currentFrame = safeFrame;
      updateUi(safeFrame);
      return safeFrame;
    }
    return drawFrame(safeFrame);
  }

  function stopPlayback() {
    isPlaying = false;
    pauseVideoPreview();
    updateUi(currentFrame);
  }

  function captureFrameDataUrl(frame = currentFrame) {
    const safeFrame = clamp(Math.round(frame), 0, totalFrames - 1);
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = width;
    captureCanvas.height = height;
    const captureCtx = captureCanvas.getContext("2d", { alpha: false });
    if (frame === currentFrame && hasVideoPreview && mp4Preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      captureCtx.drawImage(mp4Preview, 0, 0, width, height);
    } else {
      paintFrame(captureCtx, safeFrame);
    }
    return captureCanvas.toDataURL("image/png");
  }

  function showReference(src, options = {}) {
    if (!referenceOverlay || exportMode) return null;
    const opacity = clampValue(Number(options.opacity ?? referenceState?.opacity ?? 0.3), 0, 1);
    const offset = normalizeOffset(options.offset ?? referenceState?.offset);
    referenceState = {
      src: resolveReferenceSource(src),
      opacity,
      align: options.align || referenceState?.align || "center",
      fit: options.fit || referenceState?.fit || "contain",
      offset,
      scale: Number(options.scale ?? referenceState?.scale ?? 1) || 1,
    };

    referenceOverlay.src = referenceState.src;
    referenceOverlay.alt = "Reference overlay";
    referenceOverlay.hidden = false;
    applyReferenceState();
    statusOutput.textContent = "Reference overlay shown for visual checking.";
    updateDebugPanel(currentFrame);
    return { ...referenceState, offset: { ...referenceState.offset } };
  }

  function hideReference() {
    if (!referenceOverlay) return null;
    referenceOverlay.hidden = true;
    statusOutput.textContent = "Reference overlay hidden.";
    updateDebugPanel(currentFrame);
    return referenceState ? { ...referenceState, hidden: true } : null;
  }

  function setReferenceOpacity(value) {
    if (!referenceState) return null;
    referenceState.opacity = clampValue(Number(value), 0, 1);
    applyReferenceState();
    updateDebugPanel(currentFrame);
    return referenceState.opacity;
  }

  function applyReferenceState() {
    if (!referenceOverlay || !referenceState) return;
    referenceOverlay.style.opacity = String(referenceState.opacity);
    referenceOverlay.style.objectFit = referenceState.fit;
    referenceOverlay.style.objectPosition = alignToObjectPosition(referenceState.align);
    referenceOverlay.style.transform = `translate(${referenceState.offset.x}px, ${referenceState.offset.y}px) scale(${referenceState.scale})`;
  }

  function inspectFrame(frame = currentFrame) {
    const safeFrame = clamp(Math.round(frame), 0, totalFrames - 1);
    const normalizedTime = totalFrames <= 1 ? 1 : safeFrame / (totalFrames - 1);
    const debug = {
      project: manifest.slug,
      title: manifest.title,
      frame: safeFrame,
      frameLabel: `${safeFrame + 1} / ${totalFrames}`,
      normalizedTime,
      seconds: safeFrame / fps,
      fps,
      totalFrames,
      width,
      height,
      playbackSpeed,
      isPlaying,
      hasVideoPreview,
      reference: referenceState
        ? {
            ...referenceState,
            hidden: Boolean(referenceOverlay?.hidden),
          }
        : null,
      renderer: {
        path: renderer.rendererPath || manifest.renderer || "renderer.js",
        exports: renderer.exportNames || Object.keys(renderer).filter((key) => key !== "project"),
        hasDrawFrame: typeof renderer.drawFrame === "function",
        hasGetFrameDebug: typeof renderer.getFrameDebug === "function",
      },
      error: lastRenderError ? previewErrorSummary(lastRenderError) : null,
    };

    if (typeof renderer.getFrameDebug === "function") {
      try {
        debug.rendererDebug = renderer.getFrameDebug(safeFrame, {
          manifest,
          frame: safeFrame,
          time: normalizedTime,
          totalFrames,
          fps,
        });
      } catch (error) {
        debug.rendererDebugError = previewErrorSummary(normalizePreviewError(error, { kind: "renderer-debug", frame: safeFrame }));
      }
    }

    return debug;
  }

  function updateDebugPanel(frame = currentFrame) {
    if (!frameDebugger || !frameDebuggerOutput || exportMode) return;
    const debug = inspectFrame(frame);
    frameDebuggerOutput.textContent = JSON.stringify(debug, null, 2);
  }

  function setRenderError(error) {
    lastRenderError = error ? normalizePreviewError(error) : null;
    if (lastRenderError) {
      statusOutput.textContent = formatPreviewError(lastRenderError);
    }
    updateDebugPanel(currentFrame);
  }

  function resolveReferenceSource(src) {
    const value = String(src || "").trim();
    if (!value) return "";
    if (/^(?:data:|blob:|https?:\/\/|\/)/i.test(value)) return value;
    return projectAssetUrl(manifest.slug, value.replace(/^\.?\//, ""));
  }

  function setPlaybackSpeed(value) {
    playbackSpeed = nearestPlaybackSpeed(value);
    speedSelect.value = String(playbackSpeed);
    refreshVideoPreviewSource();
    lastFrameTick = 0;
    statusOutput.textContent = `Playback speed ${playbackSpeed}x`;
    return playbackSpeed;
  }

  async function saveMp4ToProject(blob, speed) {
    const response = await fetch(`/api/projects/${manifest.slug}/outputs/mp4?speed=${formatSpeedLabel(speed)}`, {
      method: "POST",
      headers: { "Content-Type": "video/mp4" },
      body: blob,
    });
    const payload = await readJsonResponse(response);
    if (!response.ok || !payload?.ok || !payload.path) {
      throw new Error(payload?.error || "The local app could not save the MP4.");
    }
    return payload;
  }

  function registerSavedOutputs(outputs) {
    manifest.outputs = {
      ...(manifest.outputs || {}),
      ...(outputs || {}),
      videoBySpeed: {
        ...(manifest.outputs?.videoBySpeed || {}),
        ...(outputs?.videoBySpeed || {}),
      },
    };
  }

  function mp4ExportPathForSpeed(speed) {
    const key = formatSpeedLabel(speed);
    if (key === "1") return manifest.outputs?.videoBySpeed?.[key] || manifest.outputs?.video || null;
    return manifest.outputs?.videoBySpeed?.[key] || null;
  }

  function mp4PreviewForSpeed(speed) {
    const key = formatSpeedLabel(speed);
    const exactPath = manifest.outputs?.videoBySpeed?.[key];
    if (exactPath) return { path: exactPath, playbackRate: 1 };
    if (manifest.outputs?.video) return { path: manifest.outputs.video, playbackRate: nearestPlaybackSpeed(speed) };
    return null;
  }

  function setMp4Exporting(exporting) {
    isExportingMp4 = exporting;
    exportMp4Button.disabled = exporting;
    exportMp4Button.setAttribute("aria-busy", String(exporting));
    exportMp4Button.title = exporting ? "Rendering MP4" : "Export MP4";
  }

  function refreshVideoPreviewSource() {
    if (!hasVideoPreview || !mp4Preview) return;
    previewVideo = mp4PreviewForSpeed(playbackSpeed);
    if (!previewVideo?.path) return;

    const previewUrl = projectAssetUrl(manifest.slug, previewVideo.path);
    if (mp4Preview.getAttribute("src") !== previewUrl) mp4Preview.src = previewUrl;
    mp4Preview.playbackRate = previewVideo.playbackRate;
  }

  function stop() {
    if (animationId) window.cancelAnimationFrame(animationId);
    annotationReviewer?.stop();
  }

  return {
    renderer,
    drawFrame,
    start,
    stop,
    setPlaybackSpeed,
    showReference,
    hideReference,
    setReferenceOpacity,
    captureFrameDataUrl,
    goToFrame,
    inspectFrame,
    mp4PathForSpeed: mp4ExportPathForSpeed,
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function playVideoPreview() {
  const video = document.querySelector("#mp4Preview");
  if (!video) return;
  video.play().catch(() => {
    const statusOutput = document.querySelector("#paintStatus");
    if (statusOutput) statusOutput.textContent = "Press play again to start the MP4 preview.";
  });
}

function pauseVideoPreview() {
  const video = document.querySelector("#mp4Preview");
  if (video) video.pause();
}

function scrubVideoPreview(frame) {
  const video = document.querySelector("#mp4Preview");
  const timeline = document.querySelector("#timeline");
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
  const maxFrame = Number(timeline?.max || 0);
  const safeFrame = clamp(Math.round(frame), 0, maxFrame);
  video.currentTime = (safeFrame / Math.max(1, maxFrame)) * video.duration;
}

function frameFromVideo() {
  const video = document.querySelector("#mp4Preview");
  const timeline = document.querySelector("#timeline");
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return 0;
  const maxFrame = Number(timeline?.max || 0);
  return clamp(Math.round((video.currentTime / video.duration) * Math.max(1, maxFrame)), 0, maxFrame);
}

function drawMissingRenderer(ctx, manifest) {
  ctx.fillStyle = "#f6ead5";
  ctx.fillRect(0, 0, manifest.width, manifest.height);
  drawLabel(ctx, "Renderer not built yet", manifest.width / 2, manifest.height / 2);
}

function drawRendererError(ctx, error, manifest) {
  const details = previewErrorSummary(error);
  ctx.save();
  ctx.fillStyle = "#fff5ee";
  ctx.fillRect(0, 0, manifest.width, manifest.height);
  ctx.strokeStyle = "#5f1f1a";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, manifest.width - 48, manifest.height - 48);

  ctx.fillStyle = "#3a1613";
  ctx.font = "900 30px Avenir Next, Trebuchet MS, Verdana, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Renderer error", 54, 54);

  ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const lines = [
    `Project: ${details.project || manifest.slug || "unknown"}`,
    `Renderer: ${details.renderer || manifest.renderer || "renderer.js"}`,
    Number.isFinite(details.frame) ? `Frame: ${details.frame + 1}` : "",
    `Message: ${details.message}`,
    details.suggestion ? `Suggestion: ${details.suggestion}` : "",
    ...(details.stack || []).slice(0, 3),
  ].filter(Boolean);

  wrapCanvasText(ctx, lines.join("\n"), 54, 104, manifest.width - 108, 23);
  ctx.restore();
}

function drawLabel(ctx, text, x, y) {
  ctx.save();
  ctx.font = "800 28px Avenir Next, Trebuchet MS, Verdana, sans-serif";
  ctx.fillStyle = "#1f1b17";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = String(text).split("\n");
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const nextLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(nextLine).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineHeight;
      } else {
        line = nextLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  }
}

function nearestPlaybackSpeed(value) {
  const speed = Number(value);
  if (!Number.isFinite(speed)) return 1;
  return PLAYBACK_SPEEDS.reduce((nearest, option) => {
    return Math.abs(option - speed) < Math.abs(nearest - speed) ? option : nearest;
  }, 1);
}

function formatSpeedLabel(speed) {
  return String(nearestPlaybackSpeed(speed)).replace(/\.0$/, "");
}

function projectAssetUrl(slug, path) {
  return `/projects/${slug}/${path}`;
}

function normalizeOffset(value = {}) {
  return {
    x: Number(value.x ?? value[0] ?? 0) || 0,
    y: Number(value.y ?? value[1] ?? 0) || 0,
  };
}

function alignToObjectPosition(align = "center") {
  const value = String(align || "center").replace(/-/g, " ");
  const positions = new Set([
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top left",
    "top right",
    "bottom left",
    "bottom right",
  ]);
  return positions.has(value) ? value : "center";
}

function normalizePreviewError(error, fallback = {}) {
  const source = error?.inky || error || {};
  const stackSource = Array.isArray(source.stack) ? source.stack.join("\n") : error?.stack || source.stack || "";
  const stack = String(stackSource)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    kind: source.kind || fallback.kind || "renderer-error",
    project: source.project || fallback.project || "",
    renderer: source.renderer || fallback.renderer || "",
    frame: Number.isFinite(source.frame) ? source.frame : fallback.frame,
    message: source.message || error?.message || fallback.message || "The renderer failed.",
    stack,
    suggestion:
      source.suggestion ||
      fallback.suggestion ||
      "Open the renderer file, fix the reported line, then refresh the preview.",
    raw: error,
  };
}

function previewErrorSummary(error) {
  const normalized = normalizePreviewError(error);
  return {
    kind: normalized.kind,
    project: normalized.project,
    renderer: normalized.renderer,
    frame: normalized.frame,
    message: normalized.message,
    suggestion: normalized.suggestion,
    stack: normalized.stack,
  };
}

function formatPreviewError(error) {
  const summary = previewErrorSummary(error);
  const location = [summary.project, summary.renderer, Number.isFinite(summary.frame) ? `frame ${summary.frame + 1}` : ""]
    .filter(Boolean)
    .join(" / ");
  return `Renderer error${location ? ` (${location})` : ""}: ${summary.message}`;
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampValue(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}
