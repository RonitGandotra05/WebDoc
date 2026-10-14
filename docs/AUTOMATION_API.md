# Editor automation and future AI integration

The React application exposes a local, provider-neutral bridge as `window.webdoc` once the document is ready. React code can access the same bridge through `editor.automation.current`. It calls the document runtime API; it does not emulate keyboard/mouse events for editing. No model, credentials, cloud endpoint, MCP listener, or network document transport is configured.

## Discover, read, edit, verify

```js
const api = window.webdoc;
const current = await api.context();
const catalogue = await api.describe({ query: "replace", limit: 20 });
const match = await api.execute({
  id: "doc.query.match",
  input: {
    select: { type: "text", pattern: "Old phrase" },
    require: "exactlyOne",
  },
});
if (!match.ok) throw new Error(match.error.message);
const edit = await api.execute({
  id: "doc.replace",
  input: {
    target: match.result.items[0].target,
    expectedText: "Old phrase",
    text: "Improved phrase",
  },
  documentId: match.documentId,
  expectedRevision: match.revision.after,
  requestId: crypto.randomUUID(),
});
if (!edit.ok) throw new Error(edit.error.message);
const verification = await api.execute({ id: "doc.getText", input: {} });
```

`describe` returns stable command IDs, descriptions, input/option JSON Schemas, runtime availability, tracked/dry-run support and history safety. Definitions include only transitive dependencies of each operation, avoiding sending the entire contract for one tool. `schema()` returns the full generated contract for tooling.

There are **440 operation definitions** generated from the pinned runtime's public TypeScript contract. This is not a claim that every operation is available or tested: inspect `available`, engine receipts and contextual restrictions. Some capabilities are unavailable in particular documents. Mutability is conservatively classified by operation name; uncertain operations require mutation guards. Engine validation remains authoritative for semantic constraints and unit conversions.

### Request and receipt

`execute({ id, input?, options?, documentId?, expectedRevision?, requestId?, allowHistoryUnsafe? })` always returns an `ok` envelope for engine commands. Inputs/options are checked with Ajv against generated structural schemas before dispatch. Mutations require exact document identity and revision; engine mutation options receive the revision guard where supported. The engine invokes the same document model used by the ribbon. The application write queue serializes commands with ribbon actions; native edits still advance the model revision and invalidate stale requests.

Successful receipts include `requestId`, `commandId`, `documentId`, before/after revision, `changed`, `undoable`, `undoSteps` and the engine result. Failed receipts include an error code and message. Read results remain structured, including search ranges and model nodes; they are not clipboard strings.

For example, `doc.insert` takes **`value`**, not `text`; `doc.replace` takes `text` for plain-text replacement. Discover each schema rather than assuming verbs have identical arguments. Style/format directives, paragraph addressing, tables, images, sections, headers, footnotes, comments and review use their respective generated schemas. Engine-specific units are described by those schemas.

A `requestId` retry is deduplicated, including simultaneous requests. Reusing it for another payload produces `REQUEST_ID_CONFLICT`. The in-memory deduplication cache is bounded to 128 requests, so it is not a durable exactly-once transport. The journal retains 200 metadata-only receipts, without request text, model output, audio data or saved document content. No journal is sent over the network.

### Page 10 without screenshots

```js
const page = await api.readPage({ page: 10 });
// Equivalent callable tool:
const receipt = await api.execute({ id: "app.readPage", input: { page: 10 } });
console.log(page.text, page.parts);
```

Pages are 1-based. Reads return document ID, revision, page geometry, ordered parts, exact text targets, objects and diagnostics. `app.context` is another discoverable tool.

The installed engine does not expose a complete semantic page-content index through its public page-metrics API. The compatibility adapter scrolls/hydrates the requested page and reads **layout identities and offsets only**, then reads paragraph text from the public Document API. It uses no screenshots, OCR or DOM text copy. Document text and structural targets remain model-based. This small layout adapter is version-specific and isolated in `pageReader.js`.

A paragraph crossing two pages returns only its page portion when its plain-text offsets can be resolved safely. For a paragraph spanning more than two pages, or a partial paragraph with complex inline structures, `target: null`, `scope: "whole-paragraph-context"` and diagnostics are returned. Do not replace that full paragraph merely because it is included as context. `complete: false` means the exact page extraction is incomplete. Tables/images are listed as objects; use their dedicated operations and model nodes for detailed content. Headers/footers are separate stories accessed through their dedicated APIs, not concatenated into body text.

Offsets are UTF-16 code units, start inclusive and end exclusive. Paragraph IDs are best-effort document identities; splits, merges and external Word round trips can replace them. Re-query targets after every edit or file switch. Page numbers are layout positions, not permanent paragraph addresses.

### Atomic plans and undo

Resolve refs with `doc.query.match`, build a plan with unique step IDs and `atomic: true`, and use `doc.mutations.preview` before `doc.mutations.apply`. The plan itself must include `expectedRevision` matching the execution envelope. Supported step operations are discoverable via `doc.capabilities`. `plan.execute` is deliberately blocked in this bridge: use the narrower atomic mutation-plan surface.

```js
const undo = await api.undoAction({
  requestId: edit.requestId,
  documentId: edit.documentId,
  expectedRevision: edit.revision.after,
});
```

Undo by ID is allowed only for the latest changed action, when the document revision still matches and exactly one native undo entry was created. It fails with `UNDO_CONFLICT` rather than undoing unrelated human edits. Explicit `doc.history.undo/redo` use the native history and require fresh revision guards. History coalescing and non-history mutations mean **not every action is independently undoable**. Many section/header/style operations bypass history and are blocked unless the caller explicitly sets `allowHistoryUnsafe: true`. Such authorization does not make them undoable. For broader reversible workflows, use application version snapshots in a future integration.

## Attach a model later

`src/automation/assistant.js` exports `AGENT_INSTRUCTIONS` and `runAssistant`. A provider implements:

```js
const result = await runAssistant({
  api,
  instruction: "Refine the first paragraph on page 10.",
  provider: {
    async next({ instructions, messages, tools, signal }) {
      // Host-owned model implementation. Return either:
      // { calls: [{ id, input, documentId, expectedRevision, requestId }] }
      // or { done: true, answer: "..." }
    },
  },
  authorize: async (call, tool) => /* host-owned review/authorization */ false,
});
```

The default write policy denies model mutations. Hosts must provide authorization appropriate to the user's request or a preview/review flow. Tool allowlists, max-step limits, AbortSignal, input validation and revision guards remain active. Default tools cover context, page reading, search, rewriting, bold formatting, plan preview/apply and history inspection. Expand the allowlist explicitly when needed. A model's `done` claim is not proof of a successful edit; verify receipts and read back content.

The bridge accepts no arbitrary JS, shell, network or reflection command. Document content is untrusted data, not tool-use permission. The global bridge is a same-page application API, **not an authentication/security boundary against scripts already executing in the page**. Do not expose it through unauthenticated cross-origin messaging or a server.

Provider credentials must not be embedded in shipped frontend code. A future integration must explicitly choose a local model, user-owned browser-compatible provider flow, or an optional authenticated proxy; it must disclose data transmission. The current editor remains frontend-only and offline with respect to document processing. No OpenAI/Gemini SDK or endpoint is installed.

## Audio integration boundary

`api.audio` is a working local adapter around HTMLAudioElement, ready for a future React player. It does not add placeholder player controls to the ribbon.

```js
await api.audio.load(localAudioFile); // File/Blob only, never a remote URL
await api.audio.execute({ id: "audio.play" });
await api.audio.execute({ id: "audio.seek", input: { seconds: 30 } });
await api.audio.execute({ id: "audio.rate", input: { rate: 1.25 } });
await api.audio.execute({ id: "audio.pause" });
const unsubscribe = api.audio.subscribe((state) => console.log(state));
```

`audioTools` defines JSON inputs for playback commands. Attach cues with `setCues([{seconds, documentId, revision, target}])`, then `revealCue(index)` to select the corresponding model range. Cues are invalidated by document revisions, preventing navigation to stale offsets. Media object URLs are revoked on reload/disposal. Audio and cues are session-local, outside DOCX exports. Transcription, automatic cue highlighting, waveform rendering, persistence, recording and AI speech are not implemented. Playback requires browser permission/user activation and a supported codec.

## Contract maintenance

After updating the document runtime, run `npm run api:generate` and `npm run api:check` to regenerate and validate the command contract. Capability flags and command receipts remain authoritative for the active document.
