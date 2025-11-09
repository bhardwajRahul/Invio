# Tailwind CSS Setup

This project uses Tailwind CSS CLI with DaisyUI.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build CSS (one-time):
   ```bash
   npm run build:css
   ```
   Or using Deno:
   ```bash
   deno task css:build
   ```

3. Watch CSS (development):
   ```bash
   npm run watch:css
   ```
   Or using Deno:
   ```bash
   deno task css:watch
   ```

## Development Workflow

Run both the CSS watcher and the Deno dev server in separate terminals:

Terminal 1:
```bash
npm run watch:css
```

Terminal 2:
```bash
deno task start
```

## How it works

- `static/input.css` - Source CSS file with Tailwind directives
- `static/styles.css` - Generated output file (do not edit manually)
- `tailwind.config.js` - Tailwind configuration with DaisyUI plugin
- The build process scans all `.tsx` files in `routes/`, `islands/`, and `components/` for Tailwind classes
