# Folio

Folio is a small shared document editor for an internal team. You can create a document, format it, import a file, and share it with another person. It is deliberately not Google Docs.

## Accounts

Every account uses the password `folio-demo`.

| Name | Email | What you should see |
| --- | --- | --- |
| Alex Rivera | alex@ajaia.dev | Owns **Q3 planning**, shared with Jordan (edit) and Sam (view) |
| Jordan Hale | jordan@ajaia.dev | Can edit Q3 planning, and owns a private **Interview notes** |
| Sam Okonkwo | sam@ajaia.dev | Can only view Q3 planning |

The sign-in screen lists these accounts. Pick one and press Continue.

## Run locally

Requires Node 20 or newer.

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000.

`npm run dev` is the path to use for review. Put your connection string in `.env` as `MONGODB_URI`. Documents survive refresh and restart.

Reset the demo documents with:

```bash
npm run db:reset
```

The next start recreates the three accounts and the two sample documents.

## Five-minute review

1. Sign in as Alex and open **Q3 planning**. The heading, list, bold, italic, and underline were loaded from the database.
2. Change a sentence. The status goes to **Saved** without a manual save button.
3. Open **Share**. Jordan can edit. Sam can view. Only Alex can change that.
4. Log out. Sign in as Sam. The same document is view only, and it appears under **Shared with you**, not **Your documents**.
5. Sign in as Jordan. Edit Q3 planning, then open **Interview notes** and confirm Sam cannot see it (it is absent from Sam's library).
6. From the library, import `samples/weekly-update.md` or `samples/weekly-update.docx`.

Supported imports are `.txt`, `.md`, `.markdown`, and `.docx`, up to 2 MB. Images in Word files are dropped. Tables become plain lines.

## What works

- Create, rename, edit, autosave, reopen
- Bold, italic, underline, headings, bulleted lists, numbered lists, undo, redo
- Owned and shared libraries, with editor and viewer roles
- Owner-only sharing and deletion
- Import to a new document, and export the current document as Markdown
- If two people save over each other, the second save is rejected and that person reloads

## What is not in this build

- Live cursors or realtime merging
- Comments, suggestions, or version history
- Public links, password reset, or SSO
- Images, tables, fonts, and page layout inside the editor

## What I would do next

With another two to four hours I would:

1. Put this on a host with a persistent disk and record the walkthrough.
2. Keep the last 20 saves so an overwrite can be restored. That is more useful than a fake presence indicator.
3. Show "Alex has this open" with a heartbeat, still without collaborative text merging.

## Tests

```bash
npm test
```

The tests cover the sharing rules, a stale save, import of Markdown and Word, and the session signature. `scripts/smoke.sh` runs the same sharing check against a live server.

## Deploy

Folio stores documents in MongoDB. Set `MONGODB_URI` in `.env` locally and in the Vercel project settings. The same database is what the live site reads.

Local Docker:

```bash
docker build -t folio .
docker run --rm -p 3000:3000 \
  -e SESSION_SECRET=replace-with-at-least-16-characters \
  -e COOKIE_SECURE=false \
  -e MONGODB_URI \
  folio
```

Pass your real `MONGODB_URI` into that command. Use `COOKIE_SECURE=true` only when the public URL is HTTPS. `render.yaml` is a starting point for a Render web service; set `MONGODB_URI` there too.

For a local production build over HTTP:

```bash
COOKIE_SECURE=false npm run build
COOKIE_SECURE=false npm start
```

## Project layout

- `src/app` — pages and route handlers
- `src/components` — library, editor, sharing
- `src/lib` — auth, documents, import, permissions
- `tests` — access, import, and session tests
- `samples` — files to import during review

More detail is in [ARCHITECTURE.md](ARCHITECTURE.md). How this was built with Cursor is in [AI_WORKFLOW.md](AI_WORKFLOW.md).
