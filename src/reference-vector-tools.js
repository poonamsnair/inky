export const REFERENCE_VECTOR_PIPELINE = {
  name: "reference-vector-lighthouse",
  purpose: "Use computer-vision contours and vectorized path suggestions as planning evidence for a newly drawn Inky renderer.",
  stages: [
    {
      id: "preprocess",
      tool: "canvas-or-opencv",
      output: "high-contrast grayscale and binary masks",
      useFor: "separating ink, clothing patterns, hands, hair, wall doodles, and large silhouettes from the reference",
    },
    {
      id: "contours",
      tool: "opencv-find-contours",
      output: "ranked contour loops, bounding boxes, hierarchy, area, and simplified polylines",
      useFor: "finding structural anchors, repeated stripe direction, hand silhouettes, poster sheets, glasses, hair masses, and clothing edges",
    },
    {
      id: "vectorize",
      tool: "potrace",
      output: "smooth Bezier path suggestions from selected black-and-white masks",
      useFor: "turning high-confidence ink silhouettes into editable path hints",
    },
    {
      id: "interpret",
      tool: "agent-and-project-requirements",
      output: "semantic object plan with named body, clothing, prop, and background parts",
      useFor: "deciding what each contour means before drawing",
    },
    {
      id: "redraw",
      tool: "inky-deterministic-canvas",
      output: "new doodle artwork drawn with material tools and construction helpers",
      useFor: "final frames, MP4 export, and browser preview",
    },
  ],
};

export const VECTOR_TOOL_ROLES = {
  opencv: {
    appRole: "reference analysis",
    fit: "best for finding structural contours, bounding boxes, hierarchy, connected components, and shape features",
    browserPath: "OpenCV.js in a worker for lightweight previews and manual reference inspection",
    nodePath: "node-side OpenCV or a CLI preprocessing tool for batch project generation",
    caution: "contours are evidence, not final art; classify them into semantic parts before drawing",
  },
  potrace: {
    appRole: "bitmap-to-path suggestion",
    fit: "best for converting clean black-and-white masks into smooth SVG/Bezier path hints",
    browserPath: "optional WASM wrapper only after the deterministic renderer can import its output",
    nodePath: "CLI stage that writes SVG/path JSON into storyboard/vector-hints/",
    caution: "raw Potrace paths are often too sleek; re-ink them with doodle-ink and intentional wobble",
  },
  paperjs: {
    appRole: "path planning and cleanup",
    fit: "best for simplifying, offsetting, smoothing, splitting, joining, and editing contour/path candidates",
    browserPath: "interactive editor or debug overlay",
    nodePath: "optional path cleanup script before renderer generation",
    caution: "convert planned paths back to deterministic canvas drawing for final export",
  },
  roughjs: {
    appRole: "safe non-semantic background accents",
    fit: "wall scraps, poster texture, dust, paper edges, and harmless doodle accents",
    browserPath: "already guarded through rough accent helpers",
    nodePath: "not needed for core semantic drawing",
    caution: "do not use for faces, hands, text, body silhouettes, clothing edges, or contact points",
  },
  zimjs: {
    appRole: "future live pen and nib simulation",
    fit: "interactive pen-drag replay, brush dampening, custom nib configurations, and ink-spread feel",
    browserPath: "future live drawing layer or style-capture tool",
    nodePath: "not a default batch renderer path",
    caution: "needs a deterministic replay/export bridge before final MP4 rendering can depend on it",
  },
};

export function referenceVectorPlanForStyle(styleName = "bold-ink-character") {
  const needsMasks = /doodle|ink|portrait|fashion|stripe|wall/i.test(styleName);
  return {
    styleName,
    recommended: needsMasks,
    pipeline: REFERENCE_VECTOR_PIPELINE.stages.map((stage) => stage.id),
    writeOutputsTo: {
      masks: "storyboard/vector-hints/masks",
      contours: "storyboard/vector-hints/contours.json",
      potraceSvg: "storyboard/vector-hints/potrace.svg",
      semanticPlan: "storyboard/vector-hints/semantic-plan.md",
    },
    finalRendererRule: "Use vector hints as lighthouse evidence only; redraw semantic objects with Inky material and illustration tools.",
  };
}
