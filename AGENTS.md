# Repository Instructions

## Code Quality

- The main goal of this repository is to have high-quality components, layouts and templates.
- To achive this the exportable components must be written to prioritize simplicity of import, and code readability.

## Screenshot Coverage

- Whenever a screenshot is requested, captured, or used for visual verification, capture and review both a desktop and a mobile variant before considering the work complete.
- Use these standard CSS viewport sizes unless the task specifies a device or resolution:
  - Desktop: `1920 × 1080` at device scale factor `1`.
  - Mobile: `390 × 844` at device scale factor `1`.
- Treat these as browser viewport dimensions. Full-page screenshots may be taller than the viewport when content scrolls.
- Name paired files with `-desktop` and `-mobile` suffixes, for example `login-split-desktop.png` and `login-split-mobile.png`.
- Use `390 × 844` instead of a literal `1080 × 1920` mobile viewport because responsive CSS is evaluated in CSS pixels; a 1080-pixel-wide viewport commonly activates tablet or desktop breakpoints.
- When a high-resolution mobile asset is required, keep the mobile CSS viewport narrow and increase the device scale factor. Do not widen the CSS viewport merely to reach a desired output pixel count.
- A single-viewport screenshot is allowed only when the user explicitly requests one variant or the target cannot render responsively. State the exception when handing off the work.
