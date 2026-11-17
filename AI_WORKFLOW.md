# AI workflow

I built Folio in Cursor with the coding agent. I used it as a pair programmer for a scope I kept narrow, then checked the result with tests and an HTTP walkthrough. The agent did not decide the product.

## What the agent sped up

- The document storage, route handlers, and the TipTap toolbar wiring
- The first pass of the library and editor layout
- Test scaffolding for sharing, import, and the session cookie

That was most of the typing. It was not most of the decisions.

## What I kept or changed

I rejected a few things the tools would happily have generated:

- **Live cursors or a CRDT.** They would have looked like collaboration and broken as soon as two people typed. The page tells the truth instead: the last save wins, and a stale save gets a 409 and a reload.
- **A public link.** The brief asked for one person sharing with another. Shares are rows for seeded users, with owner, editor, and viewer spelled out.
- **Saving uploaded HTML.** Imports are sanitized, mapped to a small set of nodes, and rejected if the TipTap schema cannot open them. I did not use server-side `generateJSON`, because that hides the formatting that actually survives and it wants a DOM.
- **A local database file on Vercel.** Documents live in MongoDB so a serverless instance can read the same notes after a cold start.
- **A generic dashboard.** The home page is two lists, owned and shared, because that is the distinction the review needs to see.
- **Plaintext demo passwords.** The password is public, and it is still stored as a scrypt hash.

I also kept editors from resharing or deleting. That was a product choice, not an accident of generating CRUD.

## How I checked it

- `npm test` — 17 tests: the role matrix, a stale save, reopening the database, Markdown and Word import, and a tampered session cookie.
- `npx tsc --noEmit` and `npm run build` both succeed.
- `scripts/smoke.sh` against the running app signs in as Alex and confirms Sam gets a 403 on edit.
- A second HTTP pass signs in as Jordan, opens Q3 planning as an editor, imports `samples/weekly-update.md`, and deletes that import so the demo library stays clean.
- I read the sharing and import code against those tests rather than trusting the first generated shape. The production build rejected the first route-handler types. I changed the helper to match Next's context type. The behavior tests did not need a product change.

I did not treat a green test run as a visual design review. The walkthrough is the right place to judge whether the editor feels usable.
