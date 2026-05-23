export const DOODLE_STYLE_PROFILES = {
  "bold-ink-character": {
    useWhen: "black-ink character drawings with simple faces, chunky outlines, organic hands, black fills, and minimal color accents",
    finalRenderer: "deterministic-canvas",
    primaryTools: ["doodle-ink", "technical-pen", "charcoal"],
    constructionHelpers: ["drawInkDoodleHand", "fillConstructedShape", "drawProgressiveContour"],
    optionalLibraries: {
      roughjs: "safe background posters, loose paper edges, dust, and non-semantic doodle texture only",
      opencv: "extract structural contour candidates from the reference before the agent assigns semantic meaning",
      potrace: "convert selected high-contrast ink masks into smooth path hints that are re-inked, not pasted",
      paperjs: "plan and simplify organic contour paths before converting them back to deterministic canvas drawing",
      zimjs: "future interactive/live pen capture with custom nibs, brush dampening, and ink-spread simulation",
    },
    avoid: ["watercolor-heavy fills", "smooth vector-icon hands", "separate capsule fingers", "speckle-only texture"],
  },
  "striped-fashion-doodle": {
    useWhen: "doodle people with striped/checkered clothing, overalls, shirts, pinafores, shoes, pockets, and tool details",
    finalRenderer: "deterministic-canvas",
    primaryTools: ["doodle-ink", "marker", "technical-pen", "colored-pencil"],
    constructionHelpers: ["fillConstructedShape", "drawProgressiveContour", "drawInkDoodleHand"],
    optionalLibraries: {
      roughjs: "only for non-semantic wall marks or background scraps",
      opencv: "detect garment silhouettes, stripe direction, tool pockets, hands, and shoe contours from references",
      potrace: "vectorize clean clothing/hand/tool masks into path suggestions for redraw",
      paperjs: "build clipped stripe paths and smooth garment silhouettes",
      zimjs: "future pressure/nib replay for fashion-sketch linework",
    },
    avoid: ["unanchored clothing", "rounded garment blobs without seams", "perfectly parallel machine stripes"],
  },
  "doodle-wall-studio": {
    useWhen: "studio scenes with posters, sticky notes, sketch sheets, laptops, notebooks, and loose background marks",
    finalRenderer: "deterministic-canvas",
    primaryTools: ["doodle-ink", "ballpoint-pen", "graphite-pencil"],
    constructionHelpers: ["drawProgressiveContour", "fillConstructedShape"],
    optionalLibraries: {
      roughjs: "good fit for wall sheets, taped notes, harmless poster doodles, and non-story background texture",
      opencv: "find poster boundaries, page rectangles, laptop shapes, and repeated background contour groups",
      potrace: "vectorize selected poster marks only when they are background hints",
      paperjs: "arrange and smooth repeated paper/poster paths",
      zimjs: "not needed unless the user wants live-drawn interactive wall doodles",
    },
    avoid: ["RoughJS hands", "RoughJS faces", "RoughJS text", "background doodles that read as story props"],
  },
  "inky-portrait-doodle": {
    useWhen: "head-and-shoulder portraits with bob hair, glasses, freckles, checkered shirts, black pinafores, or dry black shirts",
    finalRenderer: "deterministic-canvas",
    primaryTools: ["doodle-ink", "technical-pen", "ballpoint-pen", "charcoal"],
    constructionHelpers: ["fillConstructedShape", "drawProgressiveContour"],
    optionalLibraries: {
      roughjs: "safe only for background paper or non-semantic signature marks",
      opencv: "find face, glasses, hair, shirt, and shoulder contours from portrait references",
      potrace: "vectorize strong black hair, glasses, or shirt masks into path hints for hand re-inking",
      paperjs: "fit face, hair, glasses, and shoulder curves as editable spline anchors",
      zimjs: "future custom nib portrait sketching and automatic pen-drag replay",
    },
    avoid: ["over-rendered paint", "floating glasses/eyes", "hair blobs without strand rhythm"],
  },
};

export function doodleStyleNames() {
  return Object.keys(DOODLE_STYLE_PROFILES);
}

export function resolveDoodleStyleProfile(name = "bold-ink-character") {
  return DOODLE_STYLE_PROFILES[name] || DOODLE_STYLE_PROFILES["bold-ink-character"];
}

export function recommendDoodleStyleProfile(notes = "") {
  const text = String(notes).toLowerCase();
  if (/(overall|stripe|striped|fashion|pocket|shoe|scissor|tool)/.test(text)) {
    return resolveDoodleStyleProfile("striped-fashion-doodle");
  }
  if (/(poster|wall|studio|laptop|note|desk|sheet)/.test(text)) {
    return resolveDoodleStyleProfile("doodle-wall-studio");
  }
  if (/(portrait|glasses|freckle|bob|hair|shirt|pinafore)/.test(text)) {
    return resolveDoodleStyleProfile("inky-portrait-doodle");
  }
  return resolveDoodleStyleProfile("bold-ink-character");
}

export function buildDoodleToolBrief(profileName, options = {}) {
  const profile = resolveDoodleStyleProfile(profileName);
  return {
    profile: profileName,
    useWhen: profile.useWhen,
    finalRenderer: profile.finalRenderer,
    primaryTools: profile.primaryTools,
    constructionHelpers: profile.constructionHelpers,
    optionalLibraries: profile.optionalLibraries,
    styleChecks: [
      "Use continuous silhouettes for hands, hair, clothing, and props before adding detail.",
      "Use OpenCV/Potrace outputs as contour hints, not visible final layers.",
      "Use doodle-ink for final semantic contours and technical-pen/ballpoint for small marks.",
      "Keep RoughJS away from faces, hands, body silhouettes, text, labels, and contact points.",
      "Use Paper.js only to plan or smooth paths unless the project explicitly needs Paper rendering.",
      "Treat ZIMjs-style pen behavior as a live/interactable pen-capture path until a deterministic export bridge exists.",
      ...(options.styleChecks || []),
    ],
  };
}
