# Francesco Piatti - Personal Academic Website

A modern, glassmorphism-themed academic website built with pure HTML/CSS/JS.

## Local Preview

Open `index.html` directly in your browser, or run a local server:

```bash
cd Website
python3 -m http.server 8000
# Then open http://localhost:8000
```

## How to Update Content

| To update...       | Edit this file       | What to do                                      |
|--------------------|----------------------|-------------------------------------------------|
| Add publication    | `publications.html`  | Copy a `<!-- PUBLICATION ITEM -->` block        |
| Add project        | `publications.html`  | Copy a `<!-- PROJECT ITEM -->` block            |
| Update CV          | `cv.html` + replace `assets/docs/cv.pdf` | Edit HTML and replace PDF |
| Add course         | `teaching.html`      | Copy a `<!-- COURSE ITEM -->` block             |
| Change colors      | `css/variables.css`  | Edit CSS custom property values                 |
| Update bio         | `index.html`         | Edit the About section                          |
| Update photo       | Replace `assets/images/profile.jpg` | Keep same filename           |

## Deploy to GitHub Pages

1. Create a GitHub repository (e.g., `yourusername.github.io`)
2. Push all files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/yourusername.github.io.git
   git push -u origin main
   ```
3. Go to repo **Settings > Pages > Source: Deploy from branch > main / (root)**
4. Site will be live at `https://yourusername.github.io/` within 1-2 minutes

## Tech Stack

- Pure HTML, CSS, JavaScript (no build tools)
- Google Fonts: Space Grotesk + Inter
- CSS glassmorphism with backdrop-filter
- Responsive: mobile, tablet, desktop
