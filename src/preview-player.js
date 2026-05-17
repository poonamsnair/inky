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
  const videoPath = mp4PathForSpeed(playbackSpeed);
  const hasVideoPreview = !exportMode && Boolean(mp4Preview && videoPath);

  canvas.width = width;
  canvas.height = height;
  timeline.max = String(totalFrames - 1);
  timeline.value = String(currentFrame);
  speedSelect.value = String(playbackSpeed);
  exportMp4Button.disabled = !manifest.outputs?.video;
  stageShell?.classList.toggle("has-video-preview", hasVideoPreview);
  canvas.hidden = hasVideoPreview;

  if (mp4Preview) {
    mp4Preview.hidden = !hasVideoPreview;
    mp4Preview.loop = true;
    mp4Preview.muted = true;
    mp4Preview.playbackRate = playbackSpeed;
    if (hasVideoPreview) mp4Preview.src = projectAssetUrl(manifest.slug, videoPath);
    else mp4Preview.removeAttribute("src");
  }

  const helpers = {
    drawLabel,
    manifest,
  };

  function drawFrame(frame = currentFrame) {
    const safeFrame = clamp(Math.round(frame), 0, totalFrames - 1);
    currentFrame = safeFrame;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    if (typeof renderer.drawFrame === "function") {
      renderer.drawFrame(ctx, safeFrame, helpers);
    } else {
      drawMissingRenderer(ctx, manifest, safeFrame);
    }
    ctx.restore();
    updateUi(safeFrame);
    return safeFrame;
  }

  function start() {
    bindControls();
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

  function exportMp4() {
    const videoPath = mp4PathForSpeed(playbackSpeed);
    if (!videoPath) {
      statusOutput.textContent = "No MP4 output is registered for this project yet.";
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = `/projects/${manifest.slug}/${videoPath}`;
    anchor.download = `${manifest.slug}-${formatSpeedLabel(playbackSpeed)}x.mp4`;
    anchor.click();
    statusOutput.textContent = `MP4 export opened at ${formatSpeedLabel(playbackSpeed)}x`;
  }

  function updateUi(frame) {
    if (hasVideoPreview) isPlaying = !mp4Preview.paused;
    timeline.value = String(frame);
    frameCounter.textContent = `${frame + 1} / ${totalFrames}`;
    frameCounter.setAttribute("aria-label", `Frame ${frame + 1} of ${totalFrames}`);
    playButton.setAttribute("aria-pressed", String(isPlaying));
    pauseButton.setAttribute("aria-pressed", String(!isPlaying));
  }

  function setPlaybackSpeed(value) {
    playbackSpeed = nearestPlaybackSpeed(value);
    speedSelect.value = String(playbackSpeed);
    if (hasVideoPreview) mp4Preview.playbackRate = playbackSpeed;
    lastFrameTick = 0;
    statusOutput.textContent = `Playback speed ${playbackSpeed}x`;
    return playbackSpeed;
  }

  function mp4PathForSpeed(speed) {
    const key = formatSpeedLabel(speed);
    return manifest.outputs?.videoBySpeed?.[key] || manifest.outputs?.video || null;
  }

  function stop() {
    if (animationId) window.cancelAnimationFrame(animationId);
  }

  return {
    renderer,
    drawFrame,
    start,
    stop,
    setPlaybackSpeed,
    mp4PathForSpeed,
  };
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

function drawLabel(ctx, text, x, y) {
  ctx.save();
  ctx.font = "800 28px Avenir Next, Trebuchet MS, Verdana, sans-serif";
  ctx.fillStyle = "#1f1b17";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
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

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
