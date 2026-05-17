# Inky: Paper Scoping Questionnaire

Draft answers prepared from the local repo, active project files, and Firecrawl research on May 17, 2026.

## Section 1 - Framing & Motivation

**Q1. What is Inky in one sentence?**  
A: Inky is a coding-agent-driven canvas animation pipeline that turns storyboard references into hand-drawn, code-rendered, inspectable 2D animations.

**Q2. Why drawing specifically?**  
A: Drawing exposes a gap between language fluency and spatial execution. The repo is full of rules for problems that feel simple to a human viewer but brittle for an LLM/code agent: floating limbs, disconnected clothing, mistaken speech-bubble ownership, guide marks becoming visible objects, and texture hiding unclear construction.

**Q3. Who is the imagined reader?**  
A: Primary: ML and multimodal-model researchers. Secondary: HCI researchers studying creative tools and generative-art practitioners who care about controllable process.

**Q4. What is the single claim the paper must defend?**  
A: Current LLMs can describe drawings and generate drawing code, but they do not yet maintain a reliable latent canvas of object identity, attachment, and spatial continuity; Inky shows that explicit construction artifacts, visual feedback, and root-cause redraw rules are needed to make drawings coherent.

**Q5. What does "drawing" mean operationally?**  
A: A process trace that places visual marks on a 2D canvas so that objects, bodies, text, motion, and material texture are readable without the source prompt. In Inky this includes storyboard redraws, comic frames, captions, speech bubbles, hand-drawn texture, and frame-by-frame animation.

**Q6. What does "bad at drawing" mean?**  
A: Bad relative to the model's language competence and to a competent human sketcher. The failure is not only aesthetic; it is structural: parts detach, proportions drift, intended objects become blobs, and repairs are made with patches rather than rebuilt geometry.

**Q7. Is the paper critique, position, or constructive?**  
A: A constructive position paper. It critiques current model behavior, but the main contribution is a practical pipeline and a benchmark agenda.

**Q8. Why now?**  
A: In 2025-26, multimodal models, tool use, and agentic coding loops make it plausible for LLMs to act through canvases, SVG, browsers, and visual feedback. That makes the drawing gap visible in a new way: models can now try, inspect, and revise, but the revision loop still needs external structure.

**Q9. What is out of scope?**  
A: Photorealistic text-to-image diffusion, 3D modeling, music notation, handwriting as a separate recognition problem, and claims about final production art quality. Inky focuses on 2D storyboard/comic/illustration drawing through code and agent workflows.

**Q10. What 3 takeaways should abstract-only readers keep?**  
A: First, drawing failures reveal missing spatial and object-continuity capabilities in LLMs. Second, Inky's best results come from explicit intermediate artifacts, not from one-shot generation. Third, future drawing benchmarks should grade process, structure, and repair behavior, not only final image likeness.

## Section 2 - Inky The System

**Q11. What is Inky's drawing primitive?**  
A: The visible primitive is JavaScript Canvas drawing: paths, ellipses, fills, text, material strokes, procedural texture, and frame schedules. Internally, higher-level helper functions wrap these primitives into material strokes, speech bubbles, captions, body parts, props, and animated scenes.

**Q12. Why choose that primitive?**  
A: Canvas is deterministic, browser-native, easy to capture frame by frame, and compatible with procedural brush systems. The repo avoids simply pasting the source image or relying on diffusion output because the point is controllable construction and editable animation.

**Q13. What is the canvas?**  
A: The current app example uses a 960 by 620 pixel canvas, 12 FPS, and 96 total frames in `src/main.js`. The background is usually a warm paper color with stable procedural paper grain.

**Q14. What model(s) does Inky currently use as the drawing brain?**  
A: The runtime app does not call a model API. The "brain" is an external coding agent such as Codex, Claude, or another code-writing model operating over repo instructions, skills, and project files.

**Q15. What is the prompt structure?**  
A: The effective prompt is file-based: `AGENTS.md`, `DESIGN.md`, relevant `skills/*/SKILL.md`, and the active `projects/<project>/storyboard/requirements.md`. These define the rules, tools, failure modes, project brief, and quality gates the agent should follow before editing drawing code.

**Q16. How is canvas state fed back?**  
A: Through rendered images, browser preview, contact sheets, visual-diff reports, semantic review boards, construction blueprints, and project files. It is both visual and textual feedback.

**Q17. Is there a planning step before drawing?**  
A: Yes. The pipeline requires requirements, source-lighthouse interpretation, construction blueprints, attachment chains, object identity checks, and material selection before detailed rendering.

**Q18. How does Inky terminate a drawing?**  
A: There is no autonomous runtime STOP signal. A drawing is done when the agent/user accepts the frame sequence after browser review, polish pass, visual diff, export checks, and any project-specific validation gates.

**Q19. Typical step count?**  
A: At the animation level, projects usually start from 12 storyboard key beats. The active stickman project has an in-between plan of 80 frames at 12 FPS. The current wired browser example uses 96 total frames.

**Q20. What is the user-facing interaction?**  
A: Prompt-and-wait with iterative review: the user gives a storyboard/request, the agent edits code and assets, then the user reviews a browser animation with Play/Pause, timeline scrub, speed control, PNG export, and MP4 export.

**Q21. What stack is Inky built on?**  
A: Vite, vanilla HTML/CSS/JS, Canvas 2D, Node scripts, Playwright screenshots, ImageMagick contact sheets/crops, `pixelmatch`/`pngjs` for visual diffs, `d3-ease` for timing, `perfect-freehand`, `chroma-js`, and `simplex-noise` for material rendering.

**Q22. Any non-LLM components in the loop?**  
A: Yes: storyboard extraction, construction blueprint generation, speech-bubble and caption-track generation, in-between schedule generation, frame rendering, visual diffing, semantic review board generation, browser preview, and MP4 assets.

**Q23. What does failure look like to the user?**  
A: Failure appears as visible drawing defects or review warnings: detached limbs, bubble tails pointing at the wrong speaker, guide marks left in final art, shimmering backgrounds, hidden props, unreadable text, or browser/export controls failing.

**Q24. Is there memory across sessions?**  
A: There is file-based project memory, not learned personal memory. Requirements, prompts, ledgers, blueprints, speech-bubble JSON, in-between plans, outputs, and polish notes persist under each project folder.

**Q25. Smallest example to show?**  
A: A three-part figure: original storyboard panel, Inky construction blueprint/crop, and final rendered frame or storyboard contact sheet. The leafy-plant project is currently the cleanest completed example; the stickman project is the clearest speech-bubble pipeline example.

## Section 3 - Why LLMs Are Bad At This

**Q26. Top-line hypothesis?**  
A: LLMs struggle to draw because they tokenize spatial instructions without maintaining a stable, inspectable latent scene graph of parts, anchors, contacts, and material strokes.

**Q27. Is coordinate tokenization a fundamental bottleneck?**  
A: It is a bottleneck but not the whole problem. Coordinates are awkward as digits, yet the deeper failure is that the model lacks durable object ownership: a hand, sleeve, wrist, shirt hem, waistband, and leg opening must move as a connected chain.

**Q28. Concrete spatial failure?**  
A: The repo repeatedly guards against heads detached from bodies, hands without wrists, legs appearing beside shorts instead of exiting openings, and speech-bubble tails pointing to props or wrong speakers. The active stickman brief specifically names floating fingers and wrong bubble ownership risks.

**Q29. Where does composition break?**  
A: Composition breaks when several relations must hold at once: a character talks while holding papers, a bubble must avoid the face, a prop must remain on the desk, and the same object must stay visible across frames.

**Q30. Proportion and scale?**  
A: The project compensates with explicit anchors and repeated identity checks. Without that, small parts like eyes, hands, mouths, labels, and object openings tend to drift, shrink, enlarge, or become visually detached.

**Q31. Closure and continuity?**  
A: Closure is fragile enough that speech bubbles have a special tool requiring body and tail to be one continuous closed path. The rules explicitly reject wedges, eraser seams, patches, and visible socket rings.

**Q32. Symmetry?**  
A: The model can name symmetry conceptually, but execution is unreliable when symmetry depends on many coordinates and attachments. Inky reduces that risk by using reusable drawing functions and shared anchors rather than expecting symmetry from freehand code each time.

**Q33. Iteration: improve, plateau, or degrade?**  
A: It improves when the feedback is specific and visual, such as "tail points to wrong speaker" or "shorts need waistband and leg openings." It degrades when asked to generally "make it better," because the model may add texture or patches instead of fixing structure.

**Q34. Style transfer?**  
A: Useful but shallow unless translated into material recipes. "Crayon" only becomes meaningful when it maps to wax gaps, dry scumbling, pressure variation, and stable paper tooth.

**Q35. Things it cannot draw reliably?**  
A: Hands, faces, text inside drawings, speech-bubble ownership, clothing attachments, perspective/contact points, and repeated props across frames are the riskiest categories in this repo.

**Q36. Self-knowledge?**  
A: The model often knows the words for the failure but can still produce confident flawed geometry. Inky therefore treats self-evaluation as insufficient and requires rendered review artifacts.

**Q37. Does vision improve quality?**  
A: Yes, qualitatively. The pipeline depends on visual contact sheets, browser screenshots, semantic crops, and visual diffs. The expected gain is largest for defects that are obvious to the eye but hard to infer from code text.

**Q38. Training-data hypothesis?**  
A: Pretraining likely contains SVG snippets, canvas examples, ASCII diagrams, and image captions, but not enough aligned process traces showing how human marks become coherent bodies, props, captions, and repairs over time.

**Q39. Architectural hypothesis?**  
A: Autoregressive code generation makes early spatial choices sticky. Diffusion-style iterative refinement, a latent canvas, or differentiable rendering feedback could help, but only if it preserves symbolic object identity.

**Q40. Planning vs execution?**  
A: Both fail, but Inky's evidence suggests execution divergence is the bigger practical issue. The plan can say "connect hand to wrist," while the rendered result still shows a floating blob.

**Q41. Most surprising failure?**  
A: That storyboard guide marks can become accidental final objects: arrows, panel borders, long arcs, or construction lines can be mistaken for wires, strings, limbs, or decorative elements.

**Q42. Most surprising success?**  
A: A coding agent can produce credible hand-drawn material texture when the medium is decomposed into procedural strokes, seeded noise, pressure profiles, and stable grain rather than a vague style word.

**Q43. Model size correlation?**  
A: Not measured in this repo. Working hypothesis: larger models improve planning and code syntax, but the gains plateau without visual feedback and explicit construction constraints.

**Q44. Reasoning-token correlation?**  
A: Reasoning helps when it produces compact plans, anchors, and checklists. It hurts when it consumes context without creating reusable artifacts or when the model rationalizes a flawed drawing.

**Q45. Nameable phenomenon?**  
A: Three useful terms: "stroke amnesia" for losing ownership of earlier marks, "compositional collapse" for relation failures under multiple objects, and "patch reflex" for covering visual bugs instead of rebuilding geometry.

## Section 4 - Workarounds & Engineering Tricks

**Q46. Biggest quality jump?**  
A: The source-lighthouse plus construction-anchor workflow. It forces the agent to name body chains, contact points, risky shapes, and storyboard-only marks before detailed drawing.

**Q47. Grid overlays or coordinate hints?**  
A: The repo uses a fixed design coordinate system and generated crop boards rather than visible grid overlays. The 960 by 620 canvas and source-crop blueprints are practical coordinate hints.

**Q48. Higher-level DSL?**  
A: Yes, informally. Inky uses helper functions like material strokes, speech-bubble tracks, captions, and object-specific drawing functions rather than raw canvas commands everywhere.

**Q49. Decompose into background/midground/foreground?**  
A: Yes. Design rules require paper, background architecture, body chains, silhouettes, ink, color/material texture, and final clarity in order. This improves attachment and layering.

**Q50. Multi-agent setups?**  
A: Not as a runtime feature. The repo uses skill specialization instead: planner, lighthouse, construction, semantic audit, consistency audit, polish, captions, and speech bubbles behave like role-separated procedures.

**Q51. Visual feedback?**  
A: Yes. Browser screenshots, rendered PNG frames, contact sheets, semantic crops, and visual diffs are central. The cost is extra render/review time, but it catches failures that text-only inspection misses.

**Q52. External tools?**  
A: Yes: ImageMagick for crop/contact sheets, Playwright for frame screenshots, `pixelmatch` for diffs, `d3-ease` for timing, and material helper libraries for strokes, color, and noise.

**Q53. Few-shot examples?**  
A: The repo uses example projects and documentation images as patterns, but not direct few-shot model prompts. The risk of literal copying is handled by the lighthouse rule: source guides structure but is not pasted or traced.

**Q54. Fine-tuning?**  
A: Not used. The project is structured around promptable agents and deterministic tools because the missing capability is process control, not only style imitation.

**Q55. Temperature/sampling?**  
A: Not measured. For code drawing, lower randomness is likely better for geometry; controlled seeded randomness is used inside the renderer for material texture.

**Q56. Canvas representation changes?**  
A: The repo favors Canvas JS over SVG for final animation because frame rendering, procedural texture, and deterministic browser capture are central. SVG remains relevant for related work, but it is not the chosen final primitive.

**Q57. Prompt patterns that degrade performance?**  
A: Vague style prompts degrade results when not paired with object-part rules. "Make it more hand drawn" can encourage noisy texture over unclear geometry.

**Q58. Chain-of-thought/scratchpad?**  
A: Useful when converted into checklists, blueprints, and requirements. Harmful if it remains private reasoning that is not tied to visual inspection or code changes.

**Q59. Context window handling?**  
A: Inky externalizes context into files: requirements, ledgers, blueprints, generated JSON, polish notes, and review artifacts. The agent can reread the relevant artifact instead of carrying everything in prompt memory.

**Q60. User correction mid-stream?**  
A: Yes as an iterative repo workflow. A user can point out a defect, the agent updates requirements/code/tooling, rerenders, and records the fix. It is not live co-drawing stroke capture yet.

**Q61. Evaluator?**  
A: The repo has structural evaluators: semantic review boards, adjacent-frame review sheets, visual diffs, speech-bubble ownership validation, and browser/export checks. It does not yet use CLIP, OCR, or an LLM-as-judge metric.

**Q62. Workaround that did not work?**  
A: Patch-style repairs are explicitly rejected. White plugs, eraser seams, opacity tricks, or extra texture may hide a defect briefly but create visible seams and fail under animation.

**Q63. Most fragile workaround?**  
A: Handwritten prompt rules that depend on one model's compliance. A model swap could ignore subtle constraints such as "do not use RoughJS for speech bubbles" unless encoded in tools.

**Q64. Most general workaround?**  
A: Persistent intermediate artifacts: requirements, blueprints, explicit body chains, rendered frames, and visual diffs. These survive model swaps because they are external process structure.

**Q65. If only one workaround remains?**  
A: Keep root-cause redraw from construction anchors. It directly attacks the main failure: patches that mask but do not repair drawing structure.

## Section 5 - What Needs To Change

**Q66. Single desired capability?**  
A: A durable latent canvas that tracks object identity, part ownership, contact, occlusion, and mark history across generation and revision.

**Q67. Native modality or tool-mediated?**  
A: Tool-mediated for now, eventually hybrid. Drawing is action in a space, not only image synthesis; tools expose actions and make failures inspectable.

**Q68. Dedicated drawing benchmark?**  
A: Yes. Existing text-to-image benchmarks often grade final image alignment, while Inky needs benchmarks for construction, continuity, repair, and process.

**Q69. Three benchmark tasks?**  
A: (1) Draw a seated person holding a mug; grade wrist, fingers, mug handle, and table contact. (2) Draw two speakers with crossed speech-bubble risks; grade text wrapping and tail ownership. (3) Animate a ball handoff across five frames; grade object persistence, contact, and absence of guide marks.

**Q70. Right grading signal?**  
A: A mix: human raters for readability, structural metrics for known anchors, OCR/geometry checks for text and bubbles, and visual-diff metrics for flicker/drift.

**Q71. One capability or decomposed?**  
A: Decomposed. Drawing blends spatial reasoning, motor planning, symbolic representation, visual memory, text layout, style control, and repair.

**Q72. What data would unlock progress?**  
A: Human sketch process traces, paired storyboard-to-stroke datasets, captioned SVG/Canvas code, repair traces before/after critique, and frame-by-frame animation construction data.

**Q73. Differentiable canvas?**  
A: Likely helpful, especially for closure, contact, and silhouette metrics. But gradients alone will not solve semantic ownership unless object identity is also modeled.

**Q74. Unit of training?**  
A: A hierarchy: stroke for motor execution, primitive/object for structure, frame for composition, and sequence for continuity.

**Q75. Frontier-lab hypothesis to test?**  
A: Train models on explicit draw-inspect-repair traces with object-part annotations and compare against models trained only on final images or code.

**Q76. Architectural change?**  
A: A hybrid autoregressive-plus-canvas architecture: text/code planning, latent scene graph, differentiable rendering feedback, and image-space refinement.

**Q77. Tool use long term?**  
A: Correct primitive, not crutch. People draw through tools too; the key is whether the model understands what the tool action means visually.

**Q78. Draw vs invoke draw tools?**  
A: Models should know how to invoke drawing tools with semantic intent. The distinction matters because tool invocation can be audited and repaired, while opaque image generation hides process.

**Q79. Field in 24 months?**  
A: Better SVG and canvas benchmarks, stronger multimodal feedback loops, and more agentic drawing demos. The hard unsolved part will still be reliable repair and multi-frame continuity.

**Q80. Risk of fixing this?**  
A: Stroke-channel forgery and provenance laundering: if models can produce convincing process traces, not just final pixels, it becomes harder to distinguish human drawing from synthetic drawing.

## Section 6 - Evaluation & Evidence

**Q81. Illustrative failure examples?**  
A: Yes. Use 6-8 examples: detached hand, wrong bubble tail, guide mark becoming object, shorts/blob clothing, text clipping, disappearing prop, background shimmer, and patch-reflex repair.

**Q82. Small empirical study?**  
A: Yes, informal first. Ask several models to produce Canvas/SVG drawings for a fixed prompt suite, then score final output and repair behavior.

**Q83. Candidate prompts?**  
A: (1) Cat left of kettle on table. (2) Person wearing shorts sitting on chair. (3) Two characters talking with bubble tails. (4) Hand holding mug by handle. (5) Office scene with five labeled notes. (6) Ball moving through three frames without drawing guide arrows. (7) Thought bubble versus speech bubble. (8) Plant in pot with rim, soil, stem, leaves, and water spill.

**Q84. Models to compare?**  
A: GPT, Claude, Gemini, and at least one open-weight coding-capable model. The exact model names should be frozen at evaluation time because available versions change.

**Q85. Scoring scheme?**  
A: Decomposed 0-2 scores for recognizability, spatial relation, part attachment, text readability, repair quality, and continuity. Also include binary failure tags.

**Q86. Release prompts/outputs/grades?**  
A: Yes, as supplementary material, with source prompts, generated code, rendered outputs, and scoring sheets.

**Q87. Existing benchmarks to position against?**  
A: DrawBench, GenEval, SVGenius, VCode, CLIPDraw, SketchRNN, Sketchy Database, and spatial-reasoning-with-drawing work.

**Q88. Quantitative figure?**  
A: A bar chart showing failure rates by category across prompts/models: attachment failure, relation failure, text failure, closure failure, repair patching, and continuity drift.

**Q89. Hero figure?**  
A: A single panel showing the same prompt through four layers: naive LLM drawing, Inky construction blueprint, polished Inky output, and visual-diff/semantic checks. The caption should make the thesis obvious.

**Q90. Ethical/data considerations?**  
A: Avoid prompts involving real people's likenesses, private photos, copyrighted characters, or harmful imagery. Use synthetic/simple scenes and release all prompts transparently.

## Section 7 - Positioning & Logistics

**Q91. Must-cite related work?**  
A: SVGenius; VCode/SVG as symbolic visual representation; DrawBench/Imagen; GenEval; CLIPDraw; SketchRNN; Sketchy Database; spatial-reasoning-with-visual-drawing work; arXiv TeX guidance for format; CHI/ACM format guidance if targeting HCI.

**Q92. Who are you positioning against?**  
A: Gentle pushback against claims that LLMs "can draw" because they can emit SVG/Canvas snippets or because text-to-image models produce attractive final pixels.

**Q93. Who are you building on?**  
A: Work on text-to-image evaluation, vector/SVG benchmarks, sketch generation, multimodal spatial reasoning, and HCI process tools for creative work.

**Q94. Three contributions?**  
A: We contribute: (1) a failure taxonomy for LLM-mediated drawing grounded in Inky's pipeline, (2) an engineering pattern for storyboard-to-canvas animation with explicit review artifacts, and (3) a benchmark agenda for evaluating drawing as process, not only final image.

**Q95. Single author or co-authors?**  
A: Draft as single author: Poonam Nair. Add co-authors only if someone contributes experiments, evaluation design, or substantial writing/review.

**Q96. Target length?**  
A: 8-10 pages for a crisp arXiv position/preprint, plus appendices for questionnaire, prompt suite, and examples.

**Q97. Tone?**  
A: Sober but slightly polemical. It should read like an engineering-grounded position paper, not a product blog post.

**Q98. Working titles?**  
A: (1) Drawing Is Not Seeing: What Storyboard Animation Reveals About LLMs. (2) Stroke Amnesia: Why Language Models Still Need a Canvas. (3) From Prompts to Parts: Engineering Around LLM Drawing Failures.

**Q99. Timeline?**  
A: First internal draft now; small empirical study next; revised draft after scoring and figure selection; arXiv submission after the paper builds cleanly and examples are packaged.

**Q100. Money quote?**  
A: "A model that can describe a hand is not yet a model that can keep the wrist attached."
