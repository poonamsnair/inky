# Security Policy

## Supported Versions

Inky is currently pre-1.0 application code. Security fixes should target the latest `main` branch unless a maintainer documents release branches later.

## Reporting A Vulnerability

Please do not open a public issue for a suspected security problem.

Instead, contact the repository owner privately through GitHub, or use GitHub private vulnerability reporting if it is enabled for the repository.

Include:

- a short description of the issue
- steps to reproduce it
- affected files or features
- any known workaround

The maintainers will review the report and decide on a fix path before public disclosure.

## Scope

Security-sensitive areas include:

- browser export and download behavior
- generated HTML previews
- file paths handled by project tools
- future integrations with external services

Generated storyboard images and videos are user content. Do not commit private or sensitive source material to public repositories.
