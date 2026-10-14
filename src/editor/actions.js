export async function actionDialog(type, editor, capture, imageId) {
  const number = (name, label, value, min = 0, max = 100) => ({
    name,
    label,
    type: "number",
    value,
    min,
    max,
    step: "any",
  });
  const text = (name, label, value = "") => ({ name, label, value });
  const options = (name, label, value, values) => ({
    name,
    label,
    value,
    options: values,
  });
  const selected = async (action) => {
    await editor.restore(capture);
    return action();
  };
  const doc = () => editor.instance.current.activeEditor.doc;
  switch (type) {
    case "table":
      return {
        title: "Insert table",
        fields: [
          number("rows", "Rows", 3, 1, 50),
          number("columns", "Columns", 3, 1, 20),
        ],
        submit: (v) =>
          selected(() =>
            editor.command("table-insert", {
              rows: Number(v.rows),
              columns: Number(v.columns),
            }),
          ),
      };
    case "mergeCells": {
      const context = editor.instance.current.ui.tables.getContext();
      if (!context.inTable)
        throw new Error("Place the cursor in a table first.");
      const row = context.rowIndex + 1,
        col = Math.min(
          context.columnIndex + 1,
          Math.max(1, context.columns - 1),
        );
      return {
        title: "Merge cells",
        description:
          "Choose a rectangular range. Row and column numbers start at 1.",
        fields: [
          number("startRow", "First row", row, 1, context.rows),
          number("endRow", "Last row", row, 1, context.rows),
          number("startColumn", "First column", col, 1, context.columns),
          number(
            "endColumn",
            "Last column",
            Math.min(col + 1, context.columns),
            1,
            context.columns,
          ),
        ],
        submit: (v) =>
          editor.run(async () => {
            const start = {
                rowIndex: Number(v.startRow) - 1,
                columnIndex: Number(v.startColumn) - 1,
              },
              end = {
                rowIndex: Number(v.endRow) - 1,
                columnIndex: Number(v.endColumn) - 1,
              };
            if (
              start.rowIndex > end.rowIndex ||
              start.columnIndex > end.columnIndex ||
              (start.rowIndex === end.rowIndex &&
                start.columnIndex === end.columnIndex)
            )
              throw new Error(
                "Choose at least two adjacent cells in a valid rectangular range.",
              );
            return doc().tables.mergeCells({
              nodeId: context.tableNodeId,
              start,
              end,
            });
          }),
      };
    }
    case "splitCell": {
      const context = editor.instance.current.ui.tables.getContext();
      if (!context.cellNodeId)
        throw new Error("Place the cursor inside a cell first.");
      return {
        title: "Split cell",
        fields: [
          number("rows", "Rows", 1, 1, 20),
          number("columns", "Columns", 2, 1, 20),
        ],
        submit: (v) =>
          editor.run(() =>
            doc().tables.splitCell({
              nodeId: context.cellNodeId,
              rows: Number(v.rows),
              columns: Number(v.columns),
            }),
          ),
      };
    }
    case "link":
      return {
        title: "Insert hyperlink",
        fields: [
          { ...text("href", "Address", "https://"), type: "url" },
          text(
            "text",
            "Display text",
            editor.ui?.selection?.quotedText || "Link",
          ),
        ],
        submit: (v) => {
          if (!/^https?:\/\//i.test(v.href))
            throw new Error("Use an http or https address.");
          return selected(() => editor.command("link", v));
        },
      };
    case "saveAs":
      return {
        title: "Save as DOCX",
        fields: [text("name", "Document name", editor.name)],
        submit: (v) => editor.exportFile(v.name),
      };
    case "page":
      return {
        title: "Go to page",
        fields: [number("page", "Page number", editor.page, 1, editor.pages)],
        submit: (v) => editor.navigate(Number(v.page)),
      };
    case "margins":
      return {
        title: "Page margins",
        description:
          "Inches. Applies to the active section; without a cursor, the first section.",
        fields: ["top", "bottom", "left", "right"].map((x) =>
          number(x, x[0].toUpperCase() + x.slice(1), 1, 0, 3),
        ),
        submit: (v) =>
          selected(() =>
            editor.layout(
              "setPageMargins",
              Object.fromEntries(
                Object.entries(v).map(([k, val]) => [k, Number(val)]),
              ),
            ),
          ),
      };
    case "orientation":
      return {
        title: "Page orientation",
        fields: [
          options("orientation", "Orientation", "portrait", [
            ["portrait", "Portrait"],
            ["landscape", "Landscape"],
          ]),
        ],
        submit: (v) => selected(() => editor.layout("setPageSetup", v)),
      };
    case "paper":
      return {
        title: "Paper size",
        fields: [
          options("paper", "Size", "letter", [
            ["letter", "Letter · 8.5 × 11 in"],
            ["a4", "A4 · 210 × 297 mm"],
            ["legal", "Legal · 8.5 × 14 in"],
          ]),
        ],
        submit: (v) =>
          selected(() =>
            editor.layout("setPageSetup", {
              width: v.paper === "a4" ? 210 / 25.4 : 8.5,
              height:
                v.paper === "a4" ? 297 / 25.4 : v.paper === "legal" ? 14 : 11,
              orientation: "portrait",
            }),
          ),
      };
    case "columns":
      return {
        title: "Section columns",
        fields: [number("count", "Columns", 1, 1, 3)],
        submit: (v) =>
          selected(() =>
            editor.layout("setColumns", {
              count: Number(v.count),
              gap: 0.5,
              equalWidth: true,
            }),
          ),
      };
    case "spacing":
      return {
        title: "Paragraph spacing",
        description: "Space before and after in points.",
        fields: [
          number("before", "Before", 0, 0, 120),
          number("after", "After", 8, 0, 120),
        ],
        submit: (v) =>
          selected(() =>
            editor.formatParagraph("setSpacing", {
              before: Number(v.before) * 20,
              after: Number(v.after) * 20,
            }),
          ),
      };
    case "border":
      return {
        title: "Paragraph border",
        fields: [
          options("side", "Border", "bottom", [
            ["bottom", "Bottom"],
            ["top", "Top"],
            ["left", "Left"],
            ["right", "Right"],
            ["all", "Remove all"],
          ]),
        ],
        submit: (v) =>
          selected(() =>
            editor.formatParagraph(
              v.side === "all" ? "clearBorder" : "setBorder",
              {
                side: v.side,
                style: "single",
                color: "000000",
                size: 6,
                space: 4,
              },
            ),
          ),
      };
    case "pageBreak":
      await selected(() =>
        editor.run(async (s) => {
          const target = editor.paragraph();
          const selection = editor.selectTarget();
          let tail;
          if (target && selection?.start?.kind === "text") {
            const split = await doc().blocks.split({
              target,
              offset: selection.start.offset,
            });
            if (!split.success) return split;
            tail = split.inserted;
          } else {
            const created = await doc().create.paragraph({
              at: { kind: "documentEnd" },
            });
            if (!created.success) return created;
            tail = created.paragraph;
          }
          const result = await doc().format.paragraph.setFlowOptions({
            target: tail,
            pageBreakBefore: true,
          });
          if (result.success) {
            await s.activeEditor.authoring.setSelectionTarget({
              target: {
                kind: "selection",
                start: { kind: "text", blockId: tail.nodeId, offset: 0 },
                end: { kind: "text", blockId: tail.nodeId, offset: 0 },
              },
              focus: true,
            });
          }
          return result;
        }),
      );
      return;
    case "sectionBreak":
      return {
        title: "Insert section break",
        description:
          "Adds a new section at the end of the document. Inserting a section boundary inside existing content is not supported yet.",
        fields: [
          options("breakType", "Break type", "nextPage", [
            ["nextPage", "Next page"],
            ["continuous", "Continuous"],
            ["evenPage", "Even page"],
            ["oddPage", "Odd page"],
          ]),
        ],
        submit: (v) =>
          selected(() =>
            editor.run(() =>
              doc().create.sectionBreak({
                at: { kind: "documentEnd" },
                breakType: v.breakType,
              }),
            ),
          ),
      };
    case "header":
    case "footer":
      return {
        title: `Add ${type} paragraph`,
        description:
          "Adds text to the default header or footer of the active section. Double-click an existing header/footer on the page to edit it.",
        fields: [text("text", `${type} text`)],
        submit: (v) =>
          selected(() =>
            editor.run(async () => {
              const section = await editor.section();
              const target = {
                kind: "headerFooterSlot",
                section: section.address,
                headerFooterKind: type,
                variant: "default",
              };
              let resolved = await doc().headerFooters.resolve({ target });
              if (resolved.status === "none") {
                const part = await doc().headerFooters.parts.create({
                  kind: type,
                });
                if (!part.success) return part;
                const refId = part.part?.refId || part.refId;
                const receipt = await doc().headerFooters.refs.set({
                  target,
                  refId,
                });
                if (!receipt.success) return receipt;
                resolved = { refId };
              }
              return doc().create.paragraph({
                in: {
                  kind: "story",
                  storyType: "headerFooterPart",
                  refId: resolved.refId,
                },
                text: v.text,
              });
            }),
          ),
      };
    case "symbol":
      return {
        title: "Insert symbol",
        fields: [
          options(
            "symbol",
            "Symbol",
            "©",
            [
              "©",
              "®",
              "™",
              "€",
              "£",
              "₹",
              "±",
              "×",
              "÷",
              "→",
              "✓",
              "∞",
              "α",
              "β",
              "π",
              "Ω",
              "—",
            ].map((x) => [x, x]),
          ),
        ],
        submit: (v) => selected(() => editor.insert(v.symbol)),
      };
    case "caption":
      return {
        title: "Insert caption",
        description:
          "Inserts caption text at the cursor. Automatic caption numbering is not implemented.",
        fields: [text("text", "Caption", "Figure 1: ")],
        submit: (v) => selected(() => editor.insert(v.text)),
      };
    case "footnote":
    case "endnote":
      return {
        title: `Insert ${type}`,
        description:
          "Place the cursor in an ordinary text paragraph. Notes inside generated fields or a table of contents are not supported.",
        fields: [{ name: "content", label: "Note text", type: "textarea" }],
        submit: (v) =>
          selected(() =>
            editor.run(() =>
              doc().footnotes.insert({
                type,
                content: v.content,
                at:
                  editor.selectTarget()?.end?.kind === "text"
                    ? {
                        kind: "text",
                        segments: [
                          {
                            blockId: editor.selectTarget().end.blockId,
                            range: {
                              start: editor.selectTarget().end.offset,
                              end: editor.selectTarget().end.offset,
                            },
                          },
                        ],
                        story: editor.selectTarget().story,
                      }
                    : undefined,
              }),
            ),
          ),
      };
    case "updateToc":
      await editor.run(async () => {
        const list = await doc().toc.list({});
        if (!list.items.length)
          throw new Error("Insert a table of contents first.");
        for (const toc of list.items) {
          const result = await doc().toc.update({ target: toc.address });
          if (result.success === false) return result;
        }
        return true;
      });
      return;
    case "comment":
      return {
        title: "New comment",
        fields: [{ name: "text", label: "Comment", type: "textarea" }],
        submit: (v) =>
          selected(() =>
            editor.run((s) => s.ui.comments.createFromSelection(v)),
          ),
      };
    case "copy":
    case "cut":
      await editor.run(
        async () => {
          const serialized = await doc().clipboard.serializeSelection({
            includeHtml: true,
            target: editor.selectTarget(),
          });
          const items = serialized.payload.items.filter(
            (x) =>
              ["text/plain", "text/html"].includes(x.type) &&
              x.kind === "string",
          );
          await navigator.clipboard.write([
            new ClipboardItem(
              Object.fromEntries(
                items.map((x) => [
                  x.type,
                  new Blob([x.data], { type: x.type }),
                ]),
              ),
            ),
          ]);
          if (type === "cut") {
            await editor.restore(capture);
            return doc().delete({ target: editor.selectTarget() });
          }
          return true;
        },
        { mutates: type === "cut" },
      );
      return;
    case "clipboard":
      await editor.run(async () => {
        await editor.restore(capture);
        const clipboard = await navigator.clipboard.read();
        const items = [];
        for (const item of clipboard)
          for (const mime of item.types)
            if (["text/plain", "text/html"].includes(mime))
              items.push({
                type: mime,
                kind: "string",
                data: await (await item.getType(mime)).text(),
              });
        return doc().clipboard.insert({
          payload: { source: "browser", items },
          target: editor.selectTarget() || undefined,
          formattingMode: "preserve-source",
          fallback: "plain-with-warning",
        });
      });
      return;
    case "picture": {
      const images = await doc().images.list({});
      const img = images.items.find((x) => x.sdImageId === imageId);
      if (!img) {
        editor.setError("Select a picture first.");
        return;
      }
      return {
        title: "Picture size & alignment",
        description:
          "Width and height in pixels. Floating alignment is relative to the page margins.",
        fields: [
          number("width", "Width", img.properties?.size?.width || 240, 1, 2000),
          number(
            "height",
            "Height",
            img.properties?.size?.height || 160,
            1,
            2000,
          ),
          options("alignment", "Position", "inline", [
            ["inline", "Inline with text"],
            ["left", "Floating left"],
            ["center", "Floating center"],
            ["right", "Floating right"],
          ]),
        ],
        submit: (v) =>
          editor.run(async () => {
            const result = await doc().images.setSize({
              imageId: img.sdImageId,
              size: { width: Number(v.width), height: Number(v.height) },
            });
            if (!result.success) return result;
            if (v.alignment !== "inline") {
              await doc().images.convertToFloating({ imageId: img.sdImageId });
              return doc().images.setPosition({
                imageId: img.sdImageId,
                position: { hRelativeFrom: "margin", alignH: v.alignment },
              });
            }
            return doc().images.convertToInline({ imageId: img.sdImageId });
          }),
      };
    }
    case "deletePicture":
      await editor.run(() => doc().images.delete({ imageId }));
      return;
    default:
      throw new Error(`Unknown action: ${type}`);
  }
}
