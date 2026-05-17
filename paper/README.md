# Inky Paper Folder

This folder is the working home for the Inky preprint.

## What Is Here

- `main.tex`: arXiv-style LaTeX draft.
- `references.bib`: BibTeX file for related work and format references.
- `scoping-questionnaire.md`: completed 100-question scoping questionnaire.
- `notes/source-evidence.md`: repo and web evidence used while drafting.
- `preview.html`: browser-readable preview of the draft, generated from `main.tex`.
- `inky_paper.pdf`: PDF export generated from the browser preview.
- `build-preview.mjs`: rebuilds `preview.html` and `inky_paper.pdf`.
- `figures/`: copied figures used by the draft, kept local to the paper folder.

## Recommended Paper Format

The current setup uses a conservative `article`-based preprint style instead of a conference-specific class. This is deliberate:

- arXiv accepts standard LaTeX sources and expects the source bundle to contain all local style files, figures, and bibliography material needed for processing.
- A simple single-column article is easier to read as a position paper and avoids implying acceptance at CHI, NeurIPS, or another venue.
- The final venue-specific version can later be ported to `acmart` for CHI/HCI review or a NeurIPS-style class for ML review.

## Build Notes

No LaTeX compiler was found locally on this machine:

- `latexmk`: not found
- `pdflatex`: not found
- `tectonic`: not found

Use the browser-preview build path instead:

```bash
node build-preview.mjs
```

That command uses Pandoc to convert `main.tex` to `preview.html`, inserts browser-native SVG replacements for the TikZ diagrams, and uses Chrome headless printing to write `inky_paper.pdf`.

When a compiler is installed, build from this folder with:

```bash
pdflatex main
bibtex main
pdflatex main
pdflatex main
```

or:

```bash
latexmk -pdf main.tex
```

To preview in a browser, use:

```bash
python3 -m http.server 8026
```

and open:

```text
http://127.0.0.1:8026/preview.html
```

## arXiv Submission Checklist

- Keep the main file and figures inside the final submission bundle.
- Include `references.bib` or compile once locally and include the generated `.bbl`.
- Do not upload auxiliary files such as `.aux`, `.log`, `.out`, `.toc`, or old PDFs.
- Use PNG/JPG/PDF figures already converted locally.
- Avoid `\today`; the draft uses a fixed May 2026 date.
