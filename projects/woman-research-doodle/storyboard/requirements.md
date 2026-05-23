# Woman Research Doodle Requirements

## Scene

Draw an animated narrative of a woman researching at a desk. The animation should read as a sequence: first she writes notes with a pen, then she uses the laptop to Google/search, then she researches and thinks through the result. The desk should include stacked books, sticky notes, loose papers, a pen, a mug, and a few wall notes/posters behind her.

## Style

Use the same doodle reference language:

- White paper background with very light grain.
- Bold imperfect black ink contours.
- Simple face with dot eyes, small nose, light freckles, and round glasses.
- Hair drawn with repeated doodle strokes, not a smooth helmet.
- Organic cartoon hands, not capsule fingers.
- Clothing as attached body shapes with clipped stripe/check marks.
- Mostly black and white with small pink/yellow/blue accents.
- Background sheets stay looser and lighter than the woman and desk.
- Thinking should be visible through a hand-drawn thought cloud, small research symbols, question marks, and idea ticks.

## Doodle Profile

- Profile: `doodle-wall-studio`.
- Main tools: `doodle-ink`, `technical-pen`, `ballpoint-pen`, `charcoal`, `marker`, `colored-pencil`.
- Use `drawInkDoodleHand()` for both visible hands.
- Use the copied reference images only as lighthouse style references. Do not paste or trace them.

## Animation

Animate as a draw-on sequence:

1. Paper and wall notes appear.
2. Desk, laptop, and books sketch in.
3. Woman appears from torso to head.
4. Hands, book pages, search results, and notes draw in.
5. The first beat focuses on pen writing: a hand holds the pen and fresh notes appear on the page.
6. The second beat shifts to the computer: the laptop search UI appears and the query types into the search bar.
7. The third beat opens the research/thinking layer: a thought cloud grows above the researcher with book/search/question/idea symbols.
8. Hand-drawn idea dots connect the book, laptop search, and thought cloud.
9. Final frame settles as an animated narrative of writing, Googling, and researching, not just a static desk scene.

## Quality Checks

- The laptop must clearly read as Google search through a search bar, simple result lines, and small colored search marks.
- The open book must read as an open book with pages, center fold, text lines, and the reading hand attached.
- Hands must feel drawn as continuous shapes.
- The woman, book, and laptop must be visually connected to the desk.
- The thinking concept must read without explanatory labels: thought cloud, idea marks, research flow, and a final lightbulb/question moment.
- The narrative beats must be visually staged: pen-writing first, laptop/Google search second, research/thought cloud third.
- Run `npm run storyboard:doodle-style -- projects/woman-research-doodle` after rendering frames.
- Run inspector and visual-diff review before handoff.
