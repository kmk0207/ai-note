# AI Note

Personal paper-study notes as a public GitHub Pages site.

## Features

- Collapsible sidebar with study sections
- Markdown paper notes
- Preview and edit modes
- Local browser drafts
- Local note deletion through the local editor server
- No build step

## Local preview

For normal viewing, run a small static server from this folder:

```bash
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

For local editing features that must change files, such as deleting a note from
`notes/` and updating `notes/manifest.json`, use the local editor server instead:

```bash
node local-server.mjs
```

Then open:

```text
http://localhost:5173
```

After deleting a note, publish the change with:

```bash
git add .
git commit -m "Delete note"
git push
```

## GitHub setup

1. Create a repository named `ai-note` or `ai-notes`.
2. Push this folder to the repository.
3. In GitHub, go to Settings > Pages.
4. Set the source to GitHub Actions.
5. The included workflow will publish the site whenever `main` changes.

## Web editing

The site can save drafts in the browser without a GitHub login.

For public publishing, make sure file changes are committed and pushed to GitHub.
