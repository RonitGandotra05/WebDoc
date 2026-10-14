const flatten = (inline) => {
  if (inline.kind === "run") return inline.run.text || "";
  if (inline.kind === "hyperlink")
    return (inline.hyperlink.inlines || []).map(flatten).join("");
  if (inline.kind === "tab") return "\t";
  if (inline.kind === "lineBreak") return "\n";
  if (inline.kind === "field") return inline.field.resultText || "";
  return "\uFFFC";
};
const point = (blockId, offset) => ({ kind: "text", blockId, offset });
export function createPageReader(port, api) {
  return async ({ page, documentId, expectedRevision } = {}) => {
    const before = await api.context();
    if (documentId && documentId !== before.documentId)
      throw new Error("DOCUMENT_MISMATCH");
    if (expectedRevision && expectedRevision !== before.revision)
      throw new Error("REVISION_MISMATCH");
    if (!Number.isInteger(page) || page < 1 || page > before.pages)
      throw new Error("INVALID_PAGE");
    const engine = port.instance.current.activeEditor;
    // This engine does not expose a complete semantic page index. Hydrate the
    // requested page, read ONLY layout identities/offsets, then obtain text from
    // the Document API. No screenshot/OCR/clipboard or DOM text copy is used.
    engine.pageMetrics.scrollToPage(page - 1);
    let element;
    for (let i = 0; i < 120; i++) {
      element = port.container.current.querySelector(
        `[data-page-index="${page - 1}"]`,
      );
      if (
        element?.querySelector('.superdoc-fragment[data-layout-story="body"]')
      )
        break;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    if (!element?.querySelector('.superdoc-fragment[data-layout-story="body"]'))
      throw new Error("PAGE_NOT_READY");
    const parts = [],
      objects = [],
      diagnostics = [];
    const seen = new Set();
    for (const fragment of element.querySelectorAll(
      '.superdoc-fragment[data-layout-story="body"][data-source-node-id]',
    )) {
      const id = fragment.dataset.sourceNodeId;
      if (seen.has(id)) continue;
      seen.add(id);
      const projected = await engine.doc.getNodeById({ nodeId: id });
      const node = projected.node;
      if (!["paragraph", "heading"].includes(node.kind)) {
        objects.push({ address: projected.address, kind: node.kind });
        continue;
      }
      const inlines = (node.paragraph || node.heading)?.inlines || [];
      const fullText = inlines.map(flatten).join("");
      const lines = [...fragment.querySelectorAll(".superdoc-line")];
      const first = Number(lines[0]?.dataset.pmStart),
        last = Number(lines.at(-1)?.dataset.pmEnd);
      const length = last - first;
      const prev = fragment.dataset.continuesFromPrev === "true";
      const next =
        fragment.dataset.continuesOnNext === "true" ||
        fragment.dataset.continuesToNext === "true";
      let start = 0,
        end = fullText.length;
      if (prev && next) {
        diagnostics.push({
          code: "PARTIAL_RANGE_UNAVAILABLE",
          blockId: projected.address.nodeId,
          message:
            "Paragraph spans more than two pages. Read the block and resolve a text query; no unsafe page-only target is returned.",
        });
        parts.push({
          blockId: projected.address.nodeId,
          text: fullText,
          target: null,
          scope: "whole-paragraph-context",
        });
        continue;
      }
      if (
        (prev || next) &&
        !inlines.every((x) => ["run", "tab", "lineBreak"].includes(x.kind))
      ) {
        diagnostics.push({
          code: "COMPLEX_PARTIAL_RANGE",
          blockId: projected.address.nodeId,
        });
        parts.push({
          blockId: projected.address.nodeId,
          text: fullText,
          target: null,
          scope: "whole-paragraph-context",
        });
        continue;
      }
      if (prev) start = Math.max(0, fullText.length - length);
      if (next) end = Math.min(fullText.length, length);
      const blockId = projected.address.nodeId;
      parts.push({
        blockId,
        nodeType: projected.address.nodeType,
        text: fullText.slice(start, end),
        start,
        end,
        target: {
          kind: "selection",
          start: point(blockId, start),
          end: point(blockId, end),
        },
        scope: "page-fragment",
      });
    }
    const after = await api.context();
    if (
      before.documentId !== after.documentId ||
      before.revision !== after.revision
    )
      throw new Error("REVISION_MISMATCH");
    return {
      documentId: before.documentId,
      revision: before.revision,
      page,
      parts,
      objects,
      diagnostics,
      complete: diagnostics.length === 0,
      text: parts.map((x) => x.text).join("\n"),
      layout: engine.pageMetrics.getSnapshot().pages[page - 1].base,
    };
  };
}
