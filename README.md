# AI Note

Personal paper-study notes as a public GitHub Pages site.

## Features

- Collapsible sidebar with study sections
- Markdown paper notes
- Preview and edit modes
- Local browser drafts
- Optional GitHub commit from the web UI through the GitHub Contents API
- No build step

## Local preview

Run a small static server from this folder:

```bash
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

## GitHub setup

1. Create a repository named `ai-note` or `ai-notes`.
2. Push this folder to the repository.
3. In GitHub, go to Settings > Pages.
4. Set the source to GitHub Actions.
5. The included workflow will publish the site whenever `main` changes.

## Web editing

The site can save drafts in the browser without a GitHub login.

To commit edits back to GitHub from the site:

1. Create a fine-grained GitHub token for this repository.
2. Give it Contents read/write permission.
3. Open Settings in the site.
4. Enter owner, repository, branch, and token.
5. Edit a note and use Commit to GitHub.

For public visitors, keep editing disabled by not giving them a token.
