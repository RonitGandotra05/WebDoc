import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  ClipboardPaste,
  Copy,
  Scissors,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Table2,
  Image,
  Link,
  FilePlus2,
  PanelTop,
  PanelBottom,
  Hash,
  Calendar,
  Omega,
  Search,
  Replace,
  TextSelect,
  Eraser,
  MessageSquarePlus,
  Check,
  X,
  BookOpen,
  Pilcrow,
  Ruler,
  ZoomIn,
  Maximize,
  FileText,
  Subscript,
  Superscript,
  Highlighter,
  Palette,
  LayoutTemplate,
  Rows3,
  Columns3,
  Redo2,
  Trash2,
  Combine,
  Split,
  TableOfContents,
  Footprints,
  Type,
  ShieldCheck,
} from "lucide-react";
export function Tool({
  label,
  icon: Icon,
  onClick,
  active,
  disabled,
  title,
  compact = false,
}) {
  return (
    <button
      type="button"
      className={`tool ${compact ? "compact" : ""} ${active ? "selected" : ""}`}
      title={title || label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : !!active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {Icon && <Icon size={compact ? 16 : 20} strokeWidth={1.6} />}
      <span>{label}</span>
    </button>
  );
}
function Group({ label, children }) {
  return (
    <section className="ribbon-group" aria-label={label}>
      <div className="group-body">{children}</div>
      <small>{label}</small>
    </section>
  );
}
export default function Ribbon({
  tab,
  editor,
  dialog,
  setPanel,
  openImage,
  mode,
  setMode,
  collapsed = false,
}) {
  const states = editor.ui?.toolbar?.commands || {};
  const control = (id, label, icon, value, compact = false) => (
    <Tool
      key={label}
      label={label}
      icon={icon}
      disabled={!editor.ready || editor.pending || !states[id]?.enabled}
      active={
        value === undefined
          ? states[id]?.active
          : String(states[id]?.value) === String(value)
      }
      title={
        !states[id]?.enabled
          ? `${label}: ${states[id]?.reason || "unavailable in current selection"}`
          : label
      }
      onClick={() => editor.command(id, value)}
      compact={compact}
    />
  );
  const select = (id, label, options) => {
    const defaults = {
      "font-family": "Calibri",
      "font-size": "11",
      "line-height": "1",
    };
    const value = states[id]?.value ?? defaults[id] ?? "";
    return (
      <label className="ribbon-select">
        <span>{label}</span>
        <select
          aria-label={label}
          value={String(value)}
          disabled={!editor.ready || editor.pending || !states[id]?.enabled}
          onChange={(e) => editor.command(id, e.target.value)}
        >
          <option value="" disabled>
            Mixed
          </option>
          {options.map(([optionValue, text]) => (
            <option key={optionValue} value={optionValue}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  };
  const fonts = [
    ...new Set([
      "Calibri",
      "Arial",
      "Times New Roman",
      "Georgia",
      "Verdana",
      "Courier New",
      ...(editor.ui?.fonts?.options || []).map((f) => f.value),
    ]),
  ].map((x) => [x, x]);
  const quickStyles = (editor.ui?.styles?.quickGallery || []).filter(
    (style) => style.type === "paragraph" || style.type === "linked",
  );
  const defaultStyles = [
    { id: "Normal", name: "Normal", type: "paragraph" },
    { id: "NoSpacing", name: "No Spacing", type: "paragraph" },
    { id: "Heading1", name: "Heading 1", type: "paragraph" },
    { id: "Heading2", name: "Heading 2", type: "paragraph" },
    { id: "Heading3", name: "Heading 3", type: "paragraph" },
    { id: "Title", name: "Title", type: "paragraph" },
  ];
  const styleChoices = defaultStyles.map(
    (fallback) =>
      quickStyles.find(
        (style) =>
          style.id.toLowerCase() === fallback.id.toLowerCase() ||
          style.name?.toLowerCase() === fallback.name.toLowerCase(),
      ) || fallback,
  );
  return (
    <div
      id="editor-ribbon"
      className={`ribbon ${collapsed ? "collapsed" : ""}`}
      role="region"
      aria-label={`${tab} ribbon`}
    >
      {tab === "Home" && (
        <>
          <Group label="Clipboard">
            <Tool
              label="Paste"
              icon={ClipboardPaste}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("clipboard")}
            />
            <div className="stack">
              <Tool
                label="Cut"
                icon={Scissors}
                compact
                disabled={
                  !editor.ui?.selection?.quotedText || mode === "viewing"
                }
                onClick={() => dialog("cut")}
              />
              <Tool
                label="Copy"
                icon={Copy}
                compact
                disabled={!editor.ui?.selection?.quotedText}
                onClick={() => dialog("copy")}
              />
            </div>
          </Group>
          <Group label="Font">
            <div className="stack">
              <div className="row">
                {select("font-family", "Font family", fonts)}
                {select(
                  "font-size",
                  "Font size",
                  [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map(
                    (x) => [x, x],
                  ),
                )}
              </div>
              <div className="row">
                {control("bold", "Bold", Bold, undefined, true)}
                {control("italic", "Italic", Italic, undefined, true)}
                {control("underline", "Underline", Underline, undefined, true)}
                {control(
                  "strikethrough",
                  "Strikethrough",
                  Strikethrough,
                  undefined,
                  true,
                )}
                <Tool
                  label="Subscript"
                  icon={Subscript}
                  compact
                  disabled={editor.ui?.selection?.empty}
                  onClick={() => editor.inline({ vertAlign: "subscript" })}
                />
                <Tool
                  label="Superscript"
                  icon={Superscript}
                  compact
                  disabled={editor.ui?.selection?.empty}
                  onClick={() => editor.inline({ vertAlign: "superscript" })}
                />
                {control(
                  "clear-formatting",
                  "Clear formatting",
                  Eraser,
                  undefined,
                  true,
                )}
              </div>
              <div className="row">
                <label className="color-control">
                  <Palette size={16} />
                  Text color
                  <input
                    type="color"
                    aria-label="Text color"
                    defaultValue="#000000"
                    disabled={!states["text-color"]?.enabled}
                    onChange={(e) =>
                      editor.command("text-color", e.target.value)
                    }
                  />
                </label>
                <label className="color-control">
                  <Highlighter size={16} />
                  Highlight
                  <input
                    type="color"
                    aria-label="Highlight color"
                    defaultValue="#ffff00"
                    disabled={!states["highlight-color"]?.enabled}
                    onChange={(e) =>
                      editor.command("highlight-color", e.target.value)
                    }
                  />
                </label>
              </div>
            </div>
          </Group>
          <Group label="Paragraph">
            <div className="stack">
              <div className="row">
                {control("bullet-list", "Bullets", List, undefined, true)}
                {control(
                  "numbered-list",
                  "Numbering",
                  ListOrdered,
                  undefined,
                  true,
                )}
                {control(
                  "indent-decrease",
                  "Decrease indent",
                  IndentDecrease,
                  undefined,
                  true,
                )}
                {control(
                  "indent-increase",
                  "Increase indent",
                  IndentIncrease,
                  undefined,
                  true,
                )}
              </div>
              <div className="row">
                {["left", "center", "right", "justify"].map((value, i) =>
                  control(
                    "text-align",
                    `Align ${value}`,
                    [AlignLeft, AlignCenter, AlignRight, AlignJustify][i],
                    value,
                    true,
                  ),
                )}
              </div>
              <div className="row">
                {select("line-height", "Line spacing", [
                  [1, "Single"],
                  [1.15, "1.15"],
                  [1.5, "1.5"],
                  [2, "Double"],
                ])}
                <Tool
                  label="Borders"
                  icon={Table2}
                  compact
                  disabled={!editor.paragraph()}
                  onClick={() => dialog("border")}
                />
              </div>
            </div>
          </Group>
          <Group label="Styles">
            <div className="style-gallery">
              {styleChoices.map((x) => (
                  <button
                    key={x.id}
                    disabled={!states["linked-style"]?.enabled}
                    className={
                      [
                        editor.ui?.styles?.activeParagraphStyleId === x.id
                          ? "selected"
                          : "",
                        `style-${x.id.toLowerCase()}`,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.command("linked-style", x.id)}
                  >
                    <strong>
                      {x.name?.includes("Heading") ? "AaBb" : "AaBbCc"}
                    </strong>
                    <small>{x.name || x.id}</small>
                  </button>
                ))}
            </div>
          </Group>
          <Group label="Editing">
            <div className="stack">
              <Tool
                label="Find"
                icon={Search}
                compact
                onClick={() => setPanel("search")}
              />
              <Tool
                label="Replace"
                icon={Replace}
                compact
                onClick={() => setPanel("search")}
              />
              <Tool
                label="Select all"
                icon={TextSelect}
                compact
                disabled={!editor.ready || editor.pending || mode === "viewing"}
                onClick={() => editor.selectAll()}
              />
            </div>
          </Group>
        </>
      )}
      {tab === "Insert" && (
        <>
          <Group label="Pages">
            <Tool
              label="Page break"
              icon={FilePlus2}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("pageBreak")}
            />
            <Tool
              label="Section break"
              icon={FileText}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("sectionBreak")}
            />
          </Group>
          <Group label="Tables">
            <Tool
              label="Table"
              icon={Table2}
              disabled={!states["table-insert"]?.enabled}
              onClick={() => dialog("table")}
            />
          </Group>
          <Group label="Illustrations">
            <Tool
              label="Pictures"
              icon={Image}
              disabled={!states.image?.enabled}
              onClick={openImage}
            />
            <Tool
              label="Shapes / text boxes"
              icon={LayoutTemplate}
              disabled
              title="Shape and text box authoring is not supported. Imported drawings may render."
            />
          </Group>
          <Group label="Links">
            <Tool
              label="Hyperlink"
              icon={Link}
              disabled={!states.link?.enabled}
              onClick={() => dialog("link")}
            />
          </Group>
          <Group label="Header & Footer">
            <Tool
              label="Header"
              icon={PanelTop}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("header")}
            />
            <Tool
              label="Footer"
              icon={PanelBottom}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("footer")}
            />
            <Tool
              label="Page numbers"
              icon={Hash}
              disabled={!states["page-numbers-apply"]?.enabled}
              onClick={() =>
                editor.command("page-numbers-apply", {
                  kind: "footer",
                  alignment: "center",
                })
              }
            />
          </Group>
          <Group label="Text & Symbols">
            <Tool
              label="Date"
              icon={Calendar}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() =>
                editor.insert(
                  new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                  }).format(new Date()),
                )
              }
            />
            <Tool
              label="Symbol"
              icon={Omega}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("symbol")}
            />
            <Tool
              label="Equation"
              icon={Type}
              disabled
              title="Native equation authoring is not supported. Use Unicode symbols; imported equations may render."
            />
          </Group>
        </>
      )}
      {tab === "Layout" && (
        <>
          <Group label="Page Setup">
            <Tool
              label="Margins"
              icon={Maximize}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("margins")}
            />
            <Tool
              label="Orientation"
              icon={LayoutTemplate}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("orientation")}
            />
            <Tool
              label="Paper size"
              icon={FileText}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("paper")}
            />
            <Tool
              label="Columns"
              icon={Columns3}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("columns")}
            />
            <Tool
              label="Section break"
              icon={FilePlus2}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("sectionBreak")}
            />
          </Group>
          <Group label="Paragraph">
            <Tool
              label="Paragraph spacing"
              icon={Rows3}
              disabled={!editor.paragraph() || mode === "viewing"}
              onClick={() => dialog("spacing")}
            />
            {control("indent-decrease", "Decrease indent", IndentDecrease)}
            {control("indent-increase", "Increase indent", IndentIncrease)}
            <Tool
              label="Page break before"
              icon={FilePlus2}
              disabled={!editor.paragraph() || mode === "viewing"}
              onClick={() =>
                editor.formatParagraph("setFlowOptions", {
                  pageBreakBefore: true,
                })
              }
            />
          </Group>
        </>
      )}
      {tab === "References" && (
        <>
          <Group label="Contents">
            {control(
              "table-of-contents-insert",
              "Table of contents",
              TableOfContents,
            )}
            <Tool
              label="Update contents"
              icon={Redo2}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("updateToc")}
            />
          </Group>
          <Group label="Notes">
            <Tool
              label="Footnote"
              icon={Footprints}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("footnote")}
            />
            <Tool
              label="Endnote"
              icon={BookOpen}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("endnote")}
            />
          </Group>
          <Group label="Captions">
            <Tool
              label="Caption"
              icon={Type}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() => dialog("caption")}
            />
            <Tool
              label="Cross-reference"
              icon={Link}
              disabled
              title="Cross-reference authoring is not implemented. Existing fields are handled by the DOCX engine."
            />
          </Group>
        </>
      )}
      {tab === "Review" && (
        <>
          <Group label="Proofing">
            <Tool
              label="Word count"
              icon={FileText}
              onClick={() => dialog("info")}
            />
            <Tool
              label="Spelling"
              icon={ShieldCheck}
              disabled
              title="The canvas engine does not use browser spellcheck; no local dictionary is bundled."
            />
          </Group>
          <Group label="Comments">
            <Tool
              label="New comment"
              icon={MessageSquarePlus}
              disabled={!editor.ui?.selection?.quotedText || mode === "viewing"}
              onClick={() => dialog("comment")}
            />
            <Tool
              label="Comments"
              icon={MessageSquarePlus}
              onClick={() => setPanel("review")}
            />
          </Group>
          <Group label="Tracking">
            <Tool
              label="Track changes"
              icon={FileText}
              active={mode === "suggesting"}
              disabled={!editor.ready || editor.pending || mode === "viewing"}
              onClick={() =>
                setMode(mode === "suggesting" ? "editing" : "suggesting")
              }
            />
            {control("acceptAllChanges", "Accept all", Check)}
            {control("rejectAllChanges", "Reject all", X)}
          </Group>
          <Group label="Compare">
            <Tool
              label="Compare documents"
              icon={Copy}
              disabled
              title="Document comparison is not implemented in this interface."
            />
          </Group>
        </>
      )}
      {tab === "View" && (
        <>
          <Group label="Document views">
            <Tool
              label="Print layout"
              icon={FileText}
              active={mode !== "viewing"}
              onClick={() => setMode("editing")}
            />
            <Tool
              label="Read mode"
              icon={BookOpen}
              active={mode === "viewing"}
              onClick={() => setMode("viewing")}
            />
            <Tool
              label="Web layout"
              icon={LayoutTemplate}
              disabled
              title="This editor uses paginated print layout. Continuous web layout is not enabled."
            />
          </Group>
          <Group label="Show">
            {control("ruler", "Ruler", Ruler)}
            {control("formatting-marks", "Formatting marks", Pilcrow)}
            <Tool
              label="Navigation pane"
              icon={Search}
              onClick={() => setPanel("search")}
            />
          </Group>
          <Group label="Zoom">
            <Tool
              label="100%"
              icon={ZoomIn}
              onClick={() => editor.instance.current.setZoom(100)}
            />
            <Tool
              label="Fit width"
              icon={Maximize}
              onClick={() => editor.instance.current.setZoomMode("fit-width")}
            />
            <Tool
              label="Go to page"
              icon={FileText}
              onClick={() => dialog("page")}
            />
          </Group>
        </>
      )}
      {tab === "Table" && (
        <>
          <Group label="Rows">
            {control("table-add-row-before", "Row above", Rows3)}
            {control("table-add-row-after", "Row below", Rows3)}
            {control("table-delete-row", "Delete row", Trash2)}
          </Group>
          <Group label="Columns">
            {control("table-add-column-before", "Column left", Columns3)}
            {control("table-add-column-after", "Column right", Columns3)}
            {control("table-delete-column", "Delete column", Trash2)}
          </Group>
          <Group label="Merge">
            <Tool
              label="Merge cells"
              icon={Combine}
              disabled={
                !editor.ready ||
                editor.pending ||
                !editor.instance.current?.ui.tables.getContext().inTable ||
                mode === "viewing"
              }
              onClick={() => dialog("mergeCells")}
            />
            <Tool
              label="Split cell"
              icon={Split}
              disabled={
                !editor.ready ||
                editor.pending ||
                !editor.instance.current?.ui.tables.getContext().inTable ||
                mode === "viewing"
              }
              onClick={() => dialog("splitCell")}
            />
            {control("table-remove-borders", "Remove borders", Table2)}
            {control("table-delete", "Delete table", Trash2)}
          </Group>
        </>
      )}
      {tab === "Picture" && (
        <>
          <Group label="Picture format">
            <Tool
              label="Size & alignment"
              icon={Image}
              onClick={() => dialog("picture")}
            />
            <Tool
              label="Remove picture"
              icon={Trash2}
              onClick={() => dialog("deletePicture")}
            />
          </Group>
        </>
      )}
    </div>
  );
}
