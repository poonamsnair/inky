import { renderMp4FromCanvasFrames } from "./mp4-exporter.js";
import { createAnnotationReviewer } from "./annotation-reviewer.js";
import { extractPathsFromImage as extractImagePaths } from "./image-path-extractor.js";
import { createSceneGraphRuntime } from "./inky-scene-graph.js";
import { analyzeStyle as analyzeImageStyle } from "./style-analyzer.js";
import { createProjectContext } from "./project-context.js";
import {
  buildReferenceConstruction as buildConstructionMap,
  compareBoundsToConstruction,
} from "./reference-construction.js";

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
  const sceneGraphEditorLayer = document.querySelector("#sceneGraphEditorLayer");
  const toggleSceneGraphEditButton = document.querySelector("#toggleSceneGraphEdit");
  const undoSceneGraphEditButton = document.querySelector("#undoSceneGraphEdit");
  const redoSceneGraphEditButton = document.querySelector("#redoSceneGraphEdit");
  const deleteSceneGraphObjectButton = document.querySelector("#deleteSceneGraphObject");
  const saveSceneGraphEditsButton = document.querySelector("#saveSceneGraphEdits");
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
  const projectContext = createProjectContext(manifest);
  const projectRef = projectContext.activeProjectRef;
  const sceneGraph = createSceneGraphRuntime({ manifest, projectRef, width, height, exportMode, statusOutput });

  let currentFrame = fixedFrame ?? 0;
  let isPlaying = !exportMode && !Number.isFinite(fixedFrame) && !reduceMotion;
  let lastFrameTick = 0;
  let animationId = 0;
  let playbackSpeed = nearestPlaybackSpeed(requestedSpeed ?? Number(speedSelect.value));
  let isExportingMp4 = false;
  let previewVideo = mp4PreviewForSpeed(playbackSpeed);
  let referenceState = null;
  let lastRenderError = renderer.loadError || null;
  let sceneFrameCountWarning = null;
  let hasVideoPreview = !exportMode && Boolean(mp4Preview && previewVideo?.path);
  const sceneGraphEditor = sceneGraph.createEditor({
    container: sceneGraphEditorLayer,
    getFrame: () => currentFrame,
    redrawFrame: () => drawFrame(currentFrame),
  });
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
  applyPreviewSurface();

  if (mp4Preview) {
    mp4Preview.loop = true;
    mp4Preview.muted = true;
    mp4Preview.playbackRate = previewVideo?.playbackRate ?? playbackSpeed;
    if (hasVideoPreview) mp4Preview.src = projectAssetUrl(projectRef, previewVideo.path);
    else mp4Preview.removeAttribute("src");
  }

  const helpers = {
    drawLabel,
    drawRendererError,
    manifest,
    sceneGraph: sceneGraph.rendererHelpers(),
    inky: {
      analyzeStyle,
      buildReferenceConstruction,
      loadReferenceConstruction,
      loadStyleTokens,
      compareReferenceBounds,
      extractPathsFromImage,
      extractPaths: extractPathsFromImage,
      captureFrameDataUrl,
      inspectFrame,
    },
  };

  function paintFrame(targetCtx, frame = currentFrame) {
    const safeFrame = clamp(Math.round(frame), 0, totalFrames - 1);
    sceneGraph.beginFrame();
    targetCtx.save();
    targetCtx.clearRect(0, 0, width, height);
    try {
      if (typeof renderer.drawFrame === "function") {
        renderer.drawFrame(targetCtx, safeFrame, helpers);
        if (lastRenderError?.kind === "renderer-draw") setRenderError(null);
      } else {
        drawMissingRenderer(targetCtx, manifest, safeFrame);
      }
      sceneGraph.drawAutomatic(targetCtx, safeFrame);
    } catch (error) {
      const renderError = normalizePreviewError(error, {
        kind: "renderer-draw",
        project: projectContext.project.slug,
        projectRef,
        scene: projectContext.scene?.slug || "",
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
    warnIfSceneFrameCountMatchesPrevious();
    annotationReviewer?.start();
    sceneGraph.subscribe(() => {
      syncGraphPreviewMode();
      updateSceneGraphControls();
      if (!hasVideoPreview) drawFrame(currentFrame);
    });
    sceneGraph.load().then(() => {
      syncGraphPreviewMode();
      updateSceneGraphControls();
      if (!hasVideoPreview) drawFrame(currentFrame);
    });
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

  function warnIfSceneFrameCountMatchesPrevious() {
    if (exportMode || !projectContext.isNestedScene) return;
    if (manifest.scenePlan?.copiedFrom) return;
    loadPreviousSceneFrameCount()
      .then((previousScene) => {
        if (!previousScene || previousScene.totalFrames !== totalFrames) return;
        sceneFrameCountWarning = {
          kind: "scene-frame-count-collision",
          currentScene: projectContext.activeSlug,
          currentProjectRef: projectContext.activeProjectRef,
          previousScene: previousScene.slug,
          previousProjectRef: previousScene.projectRef,
          totalFrames,
          suggestion: "Choose totalFrames from this scene's own action, pacing, and emotional beat if this match is accidental.",
        };
        console.warn("[inky-scenes] Scene frame count matches the previous scene.", sceneFrameCountWarning);
        updateDebugPanel(currentFrame);
      })
      .catch((error) => {
        console.warn("[inky-scenes] Could not compare this scene's frame count with the previous scene.", error);
      });
  }

  async function loadPreviousSceneFrameCount() {
    const collection = manifest.sceneCollection;
    const rootSlug = collection?.rootSlug || projectContext.project.slug;
    const libraryUrl = sceneLibraryUrl(collection?.scenes, rootSlug);
    const library = await fetchJsonUrl(libraryUrl, { label: "scene library" });
    const scenes = Array.isArray(library?.scenes) ? [...library.scenes] : [];
    scenes.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const activeRef = normalizeProjectRef(projectContext.activeProjectRef);
    const activeIndex = scenes.findIndex((scene) => {
      return (
        normalizeProjectRef(scene.projectRef || "") === activeRef ||
        normalizeProjectRef(scene.slug || "") === normalizeProjectRef(projectContext.activeSlug) ||
        (projectContext.scene?.id && scene.id === projectContext.scene.id)
      );
    });
    const previousScene =
      activeIndex > 0 ? scenes[activeIndex - 1] : scenes.find((scene) => scene.slug && scene.slug === projectContext.scene?.previousSlug);

    if (!previousScene) return null;
    const previousProjectRef = sceneProjectRef(rootSlug, previousScene);
    const previousManifest = await fetchJsonUrl(`/projects/${previousProjectRef}/project.json`, { label: "previous scene manifest" });
    const previousTotalFrames = numberOr(previousManifest?.totalFrames, NaN);
    if (!Number.isFinite(previousTotalFrames)) return null;

    return {
      slug: previousScene.slug || previousProjectRef,
      projectRef: previousProjectRef,
      totalFrames: Math.max(1, previousTotalFrames),
    };
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
    toggleSceneGraphEditButton?.addEventListener("click", toggleSceneGraphEdit);
    undoSceneGraphEditButton?.addEventListener("click", () => {
      if (!sceneGraph.undo()) return;
      drawFrame(currentFrame);
      statusOutput.textContent = "Object edit undone.";
    });
    redoSceneGraphEditButton?.addEventListener("click", () => {
      if (!sceneGraph.redo()) return;
      drawFrame(currentFrame);
      statusOutput.textContent = "Object edit redone.";
    });
    deleteSceneGraphObjectButton?.addEventListener("click", () => {
      if (sceneGraphEditor.deleteSelected()) updateSceneGraphControls();
    });
    saveSceneGraphEditsButton?.addEventListener("click", saveSceneGraphEdits);
    updateSceneGraphControls();
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

  function toggleSceneGraphEdit() {
    if (exportMode) return;
    const nextEditing = !sceneGraphEditor.isEnabled();
    if (nextEditing) {
      stopPlayback();
      hasVideoPreview = false;
      applyPreviewSurface();
      drawFrame(currentFrame);
      sceneGraphEditor.enable();
      statusOutput.textContent = sceneGraph.hasGraphContent()
        ? "Edit mode on. Select an object, drag it, then save edits."
        : "Edit mode on, but this scene has no editable graph objects yet.";
    } else {
      sceneGraphEditor.disable();
      syncGraphPreviewMode();
      applyPreviewSurface();
      drawFrame(currentFrame);
      statusOutput.textContent = "Edit mode off.";
    }
    updateSceneGraphControls();
  }

  async function saveSceneGraphEdits() {
    if (exportMode) return;
    if (saveSceneGraphEditsButton) {
      saveSceneGraphEditsButton.disabled = true;
      saveSceneGraphEditsButton.setAttribute("aria-busy", "true");
    }
    try {
      statusOutput.textContent = "Saving object edits...";
      await sceneGraph.save();
      syncGraphPreviewMode();
      applyPreviewSurface();
      drawFrame(currentFrame);
      statusOutput.textContent = "Object edits saved.";
    } catch (error) {
      console.warn("[inky-scene-graph] Save failed", error);
      statusOutput.textContent = error?.message || "Could not save object edits.";
    } finally {
      saveSceneGraphEditsButton?.removeAttribute("aria-busy");
      updateSceneGraphControls();
    }
  }

  function syncGraphPreviewMode() {
    if (exportMode) {
      hasVideoPreview = false;
      return;
    }
    if (sceneGraphEditor.isEnabled() || sceneGraph.hasPersistentGraphContent()) {
      hasVideoPreview = false;
      return;
    }
    previewVideo = mp4PreviewForSpeed(playbackSpeed);
    hasVideoPreview = Boolean(mp4Preview && previewVideo?.path);
  }

  function applyPreviewSurface() {
    stageShell?.classList.toggle("has-video-preview", hasVideoPreview);
    canvas.hidden = hasVideoPreview && !sceneGraphEditor.isEnabled();
    if (!mp4Preview) return;
    mp4Preview.hidden = !hasVideoPreview || sceneGraphEditor.isEnabled();
    if (hasVideoPreview && previewVideo?.path) {
      mp4Preview.src = projectAssetUrl(projectRef, previewVideo.path);
      mp4Preview.playbackRate = previewVideo.playbackRate ?? playbackSpeed;
    } else {
      mp4Preview.pause();
      mp4Preview.removeAttribute("src");
    }
  }

  function updateSceneGraphControls() {
    if (exportMode) return;
    const editing = sceneGraphEditor.isEnabled();
    if (toggleSceneGraphEditButton) {
      toggleSceneGraphEditButton.setAttribute("aria-pressed", String(editing));
      toggleSceneGraphEditButton.classList.toggle("is-active", editing);
      toggleSceneGraphEditButton.disabled = false;
    }
    if (undoSceneGraphEditButton) undoSceneGraphEditButton.disabled = !editing || !sceneGraph.canUndo();
    if (redoSceneGraphEditButton) redoSceneGraphEditButton.disabled = !editing || !sceneGraph.canRedo();
    if (deleteSceneGraphObjectButton) deleteSceneGraphObjectButton.disabled = !editing;
    if (saveSceneGraphEditsButton) saveSceneGraphEditsButton.disabled = !editing;
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

    if (sceneGraph.hasPersistentGraphContent()) {
      await renderAndSaveMp4();
      return;
    }

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
    anchor.href = `${projectAssetUrl(projectRef, videoPath)}?v=${Date.now()}`;
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
    sceneGraphEditor.updateFrame(frame);
    updateSceneGraphControls();
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

  async function extractPathsFromImage(src, options = {}) {
    const resolvedSource = typeof src === "string" ? resolveReferenceSource(src) : src;
    try {
      statusOutput.textContent = "Extracting reference paths...";
      const result = await extractImagePaths(resolvedSource, options);
      statusOutput.textContent = `Extracted ${result.pathCount} path${result.pathCount === 1 ? "" : "s"} from reference.`;
      return result;
    } catch (error) {
      const failure = helperFailure("path-extraction", src, resolvedSource, error, {
        message: "Path extraction failed.",
        suggestion: "Check that the image path exists inside the active project, then try window.inky.extractPathsFromImage() again.",
      });
      console.warn("[inky-path-extraction] Failed", failure.error, error);
      statusOutput.textContent = `${failure.error.message} ${failure.error.suggestion}`;
      return {
        ok: false,
        version: 1,
        engine: "imagetracerjs",
        source: failure.source,
        options: { ...options },
        paths: [],
        pathCount: 0,
        pointCount: 0,
        bounds: null,
        svg: null,
        error: failure.error,
        notes: [failure.error.suggestion],
      };
    }
  }

  async function analyzeStyle(src, options = {}) {
    const resolvedSource = typeof src === "string" ? resolveReferenceSource(src) : src;
    try {
      statusOutput.textContent = "Analyzing style reference...";
      const result = await analyzeImageStyle(resolvedSource, options);
      const colorCount = result.palette?.dominant?.length || 0;
      statusOutput.textContent = `Analyzed style reference: ${colorCount} color${colorCount === 1 ? "" : "s"}, ${result.suggested?.brush || "brush"} brush hint.`;
      return result;
    } catch (error) {
      const failure = helperFailure("style-analysis", src, resolvedSource, error, {
        message: "Style analysis failed.",
        suggestion: "Check that the style image path exists inside the active project or insp folder, then try window.inky.analyzeStyle() again.",
      });
      console.warn("[inky-style-analysis] Failed", failure.error, error);
      statusOutput.textContent = `${failure.error.message} ${failure.error.suggestion}`;
      return {
        ok: false,
        version: 1,
        engine: "inky-style-analyzer",
        source: failure.source,
        palette: { dominant: [], background: null, accents: [], dark: null, light: null },
        metrics: null,
        suggested: null,
        suggestedBrush: null,
        suggestedRoughness: null,
        suggestedTextureScale: null,
        texture: null,
        error: failure.error,
        notes: [
          failure.error.suggestion,
          "This failure object is safe to inspect; it does not include source pixels as finished artwork.",
        ],
      };
    }
  }

  async function buildReferenceConstruction(src = manifest.storyboard?.sourceImage || "image/storyboard.png", options = {}) {
    const imageSource = String(src || manifest.storyboard?.sourceImage || "").trim();
    if (!imageSource) throw new Error("No reference image path is available for alignment mapping.");
    statusOutput.textContent = "Building an optional reference alignment map...";
    const extracted = await extractPathsFromImage(imageSource, {
      mode: "outline",
      ...(options.extract || {}),
    });
    const construction = buildConstructionMap(extracted, {
      ...options,
      projectRef,
      sourceImage: imageSource,
      canvas: { width, height, ...(options.canvas || {}) },
    });
    statusOutput.textContent = `Built optional alignment map with ${construction.objects.length} object${construction.objects.length === 1 ? "" : "s"}.`;
    return construction;
  }

  async function loadReferenceConstruction(path = manifest.storyboard?.construction || "storyboard/construction.json") {
    return fetchProjectJson(path, { label: "reference alignment map", optional: true });
  }

  async function loadStyleTokens(path = manifest.style?.tokens || "style-tokens.json") {
    return fetchProjectJson(path, { label: "style tokens", optional: true });
  }

  async function compareReferenceBounds(bounds, constructionOrOptions = {}, maybeOptions = {}) {
    const hasConstruction = constructionOrOptions?.objects || constructionOrOptions?.engine === "inky-reference-construction";
    const construction = hasConstruction ? constructionOrOptions : await loadReferenceConstruction(constructionOrOptions.path);
    if (!construction) return [];
    const options = hasConstruction ? maybeOptions : constructionOrOptions;
    const boxes = bounds || importantBoundsForFrame(currentFrame);
    const result = compareBoundsToConstruction(boxes, construction, {
      canvas: { width, height },
      ...options,
    });
    const warnCount = result.filter((item) => item.verdict !== "pass").length;
    statusOutput.textContent = warnCount
      ? `Optional reference-bounds review found ${warnCount} item${warnCount === 1 ? "" : "s"} to check.`
      : "Optional reference-bounds review passed.";
    return result;
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
      project: projectContext.project.slug,
      projectRef: projectContext.project.projectRef,
      activeProjectRef: projectContext.activeProjectRef,
      activeSlug: projectContext.activeSlug,
      isSceneLibrary: projectContext.isSceneLibrary,
      isNestedScene: projectContext.isNestedScene,
      scene: projectContext.scene,
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
      sceneFrameCountWarning,
      sceneGraph: {
        loaded: sceneGraph.isLoaded(),
        hasGraphContent: sceneGraph.hasGraphContent(),
        hasPersistentGraphContent: sceneGraph.hasPersistentGraphContent(),
        editMode: sceneGraphEditor.isEnabled(),
        canUndo: sceneGraph.canUndo(),
        canRedo: sceneGraph.canRedo(),
        objectCount: sceneGraph.getEffectiveObjects(safeFrame).length,
      },
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
          project: projectContext.project,
          scene: projectContext.scene,
          activeProjectRef: projectContext.activeProjectRef,
          frame: safeFrame,
          time: normalizedTime,
          totalFrames,
          fps,
        });
      } catch (error) {
        debug.rendererDebugError = previewErrorSummary(normalizePreviewError(error, { kind: "renderer-debug", frame: safeFrame }));
      }
    }

    const importantBounds = importantBoundsForFrame(safeFrame);
    if (importantBounds.length) debug.importantBounds = importantBounds;

    return debug;
  }

  function importantBoundsForFrame(frame) {
    const getBounds = renderer.inspectImportantBounds || renderer.getImportantBounds;
    if (typeof getBounds !== "function") return [];
    try {
      const rawBounds = getBounds(frame, { manifest, width, height, totalFrames, fps }) || [];
      return Array.isArray(rawBounds) ? rawBounds : rawBounds.boxes || [];
    } catch {
      return [];
    }
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
    return projectAssetUrl(projectRef, value.replace(/^\.?\//, ""));
  }

  async function fetchProjectJson(path, options = {}) {
    const value = String(path || "").trim();
    if (!value) return null;
    const response = await fetch(resolveReferenceSource(value), { cache: "no-store" });
    if (response.status === 404 && options.optional) return null;
    if (!response.ok) {
      throw new Error(`Could not load ${options.label || "project JSON"}: ${response.status}`);
    }
    return response.json();
  }

  function setPlaybackSpeed(value) {
    playbackSpeed = nearestPlaybackSpeed(value);
    speedSelect.value = String(playbackSpeed);
    syncGraphPreviewMode();
    applyPreviewSurface();
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

    const previewUrl = projectAssetUrl(projectRef, previewVideo.path);
    if (mp4Preview.getAttribute("src") !== previewUrl) mp4Preview.src = previewUrl;
    mp4Preview.playbackRate = previewVideo.playbackRate;
  }

  function stop() {
    if (animationId) window.cancelAnimationFrame(animationId);
    annotationReviewer?.stop();
    sceneGraphEditor.destroy();
  }

  return {
    renderer,
    sceneGraph,
    drawFrame,
    start,
    stop,
    setPlaybackSpeed,
    showReference,
    hideReference,
    setReferenceOpacity,
    analyzeStyle,
    buildReferenceConstruction,
    loadReferenceConstruction,
    loadStyleTokens,
    compareReferenceBounds,
    extractPathsFromImage,
    captureFrameDataUrl,
    goToFrame,
    inspectFrame,
    mp4PathForSpeed: mp4ExportPathForSpeed,
  };
}

async function fetchJsonUrl(url, options = {}) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${options.label || "JSON"}: ${response.status}`);
  return response.json();
}

function sceneLibraryUrl(path, rootSlug) {
  const rootRef = normalizeProjectRef(rootSlug);
  const value = String(path || "").trim();
  if (/^(?:https?:\/\/|\/)/i.test(value)) return value;

  const cleaned = value
    .replace(/^\.?\//, "")
    .replace(/^projects[\\/]+/, "")
    .replace(/\\/g, "/");

  if (!cleaned || cleaned === "scenes.json") return `/projects/${rootRef}/scenes.json`;
  return `/projects/${cleaned}`;
}

function sceneProjectRef(rootSlug, scene = {}) {
  const explicitRef = normalizeProjectRef(scene.projectRef || "");
  if (explicitRef) return explicitRef;

  const rootRef = normalizeProjectRef(rootSlug);
  const sceneSlug = normalizeProjectRef(scene.slug || "");
  if (!sceneSlug || sceneSlug === rootRef) return rootRef;
  return `${rootRef}/scenes/${sceneSlug}`;
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

function normalizeProjectRef(projectRef) {
  const segments = String(projectRef || "")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/^projects[\\/]+/, "")
    .split(/[\\/]+/)
    .map((segment) =>
      String(segment || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);
  return segments.join("/");
}

function helperFailure(kind, requestedSource, resolvedSource, error, fallback = {}) {
  const fallbackMessage = fallback.message || "Preview helper failed.";
  const sourceError = error?.message ? `${fallbackMessage} ${error.message}` : fallbackMessage;
  return {
    source: {
      requested: describeHelperSource(requestedSource),
      resolved: describeHelperSource(resolvedSource),
    },
    error: {
      kind,
      message: sourceError,
      suggestion: fallback.suggestion || "Check the input and try again.",
      stack: String(error?.stack || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4),
    },
  };
}

function describeHelperSource(source) {
  if (typeof source === "string") return source;
  if (isImageDataLike(source)) return `ImageData(${source.width}x${source.height})`;
  if (typeof Blob !== "undefined" && source instanceof Blob) return `Blob(${source.type || "application/octet-stream"})`;
  if (source?.src) return source.src;
  if (source?.width && source?.height) return `${source.constructor?.name || "Canvas"}(${source.width}x${source.height})`;
  return "provided image source";
}

function isImageDataLike(source) {
  return (
    source &&
    typeof source === "object" &&
    Number.isFinite(source.width) &&
    Number.isFinite(source.height) &&
    source.data instanceof Uint8ClampedArray
  );
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
    projectRef: source.projectRef || fallback.projectRef || "",
    scene: source.scene || fallback.scene || "",
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
    projectRef: normalized.projectRef,
    scene: normalized.scene,
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
