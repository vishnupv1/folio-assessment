# Submission

Folio, a shared document editor for the Ajaia assignment.

## Live product

Live URL: not deployed from this machine. No host login was available. Deploy with the Docker or Render steps in README.md. The app needs a persistent disk. Do not put it on a serverless host.

## Walkthrough

Video URL: see WALKTHROUGH_URL.txt. The script is in WALKTHROUGH.txt. A local recording is at walkthrough.mp4. It still needs an unlisted Loom or YouTube link.

## Accounts

Password for every account: `folio-demo`

- alex@ajaia.dev — Alex Rivera, owner of Q3 planning
- jordan@ajaia.dev — Jordan Hale, editor on Q3 planning, owner of Interview notes
- sam@ajaia.dev — Sam Okonkwo, viewer on Q3 planning

## Included

- Source code
- README.md — local setup and run instructions
- ARCHITECTURE.md
- AI_WORKFLOW.md
- SUBMISSION.md
- WALKTHROUGH.txt — script
- WALKTHROUGH_URL.txt — video URL slot
- samples/weekly-update.md, samples/plain-notes.txt, samples/weekly-update.docx
- Automated tests in tests/
- Dockerfile and render.yaml

No screenshots. Local setup is `npm install` and `npm run dev`. Nothing else is required.

## Working

- Create, rename, edit, autosave, and reopen documents
- Bold, italic, underline, headings, bullets, numbered lists
- Import .txt, .md, and .docx into a new document
- Export Markdown
- Owner, editor, and viewer sharing, with separate owned and shared lists
- Data kept in MongoDB across refresh and restart
- Tests for access, import, and the session cookie

## Incomplete

- No public deployment URL yet
- Walkthrough is recorded locally as walkthrough.mp4. The public video URL is still empty.
- No live multiplayer, comments, or version history

## Next 2–4 hours

1. Deploy to a host with a disk and paste the URL above.
2. Upload walkthrough.mp4 and paste the unlisted link into WALKTHROUGH_URL.txt.
3. Save the last 20 versions of a document so a conflicting save can be restored.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000.
