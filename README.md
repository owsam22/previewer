# Live Web Previewer

A modern, fast, and feature-rich Live Web Previewer built with pure HTML, CSS, and Vanilla JavaScript. It allows you to preview your web projects instantly without needing a backend or a local server.

live link: https://owsam22.github.io/previewer/

## Features
- **Upload Entire Folders**: Select a folder containing HTML, CSS, and JS files, and it will stitch them together.
- **Drag & Drop**: Easily drag and drop files into the dashboard upload zone.
- **Paste Mode**: Paste your code snippets directly into the built-in text areas for HTML, CSS, and JS.
- **Responsive Viewports**: Switch between Desktop, Tablet, and Mobile views within the preview screen to test your responsive designs.
- **Premium Pixel Theme**: Features a bright, warm, and professional pixel-art inspired UI theme with an animated gradient mesh background.
- **Local Processing**: Code is stitched on the client-side using JavaScript, keeping your code secure and private.

## How It Works
1. **File Merging:** When you upload files or paste code, the application uses JavaScript to merge the external CSS and JS directly into the HTML's `<head>` and `<body>`.
2. **Local Assets:** Image files (PNG, JPG, SVG, WebP) are processed directly in your browser using the `FileReader` API (converting to base64) so they don't break when offline!
3. **Iframe Sandboxing:** The combined code is safely injected and rendered inside a browser window in the `preview.html` iframe.


## Built With
- Vanilla JavaScript
- HTML5 File & Drag/Drop API
- Pixel-Flavored Glassmorphism CSS Theme
- Fonts: `DotGothic16` and `Outfit` (Google Fonts)

---
*Built with ❤️ for rapid prototyping and frontend testing.*
