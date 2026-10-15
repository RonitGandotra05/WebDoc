import { useEffect, useRef, useState } from "react";
import {
  FileText,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  X,
  Printer,
  Plus,
  Check,
  Download,
  Info,
  BookOpen,
  Trash2,
  RotateCcw,
  Unplug,
} from "lucide-react";
import Ribbon, { Tool } from "./components/Ribbon";
import Dialog from "./components/Dialog";
import SearchPanel from "./components/SearchPanel";
import { useDocumentEditor } from "./editor/useDocumentEditor";
import { actionDialog } from "./editor/actions";
import { DOCX_TYPE } from "./editor/files";
const tabs = ["Home", "Insert", "Layout", "References", "Review", "View"];
export default function App() {
  const container = useRef(null),
    fileInput = useRef(null),
    imageInput = useRef(null),
    selection = useRef(null);
  const editor = useDocumentEditor(container);
  const [tab, setTab] = useState("Home"),
    [ribbonCollapsed, setRibbonCollapsed] = useState(false),
    [fileMenu, setFileMenu] = useState(false),
    [panel, setPanel] = useState(""),
    [modal, setModal] = useState(null),
    [mode, setModeState] = useState("editing"),
    [imageId, setImageId] = useState(null),
    [historyView, setHistoryView] = useState("documents");
  const setMode = (value) => {
    editor.instance.current?.setDocumentMode(value);
    setModeState(value);
  };
  const showDialog = async (type) => {
    selection.current = editor.capture();
    if (type === "info") {
      setModal({
        title: "Document information",
        description:
          "Counts come from the document model. Layout and fonts may differ from Microsoft Word.",
        children: (
          <dl className="statistics">
            {Object.entries({ ...editor.info.counts, pages: editor.pages }).map(
              ([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ),
            )}
          </dl>
        ),
      });
      return;
    }
    try {
      const config = await actionDialog(
        type,
        editor,
        selection.current,
        imageId,
      );
      if (config) setModal(config);
    } catch (error) {
      editor.setError(error.message);
    }
  };
  useEffect(() => {
    const handler = (e) => {
      const inControl = e.target.closest("input,select,textarea,dialog");
      const composing = e.target.matches("[data-v2-ime-host]");
      if (inControl && !composing) return;
      if (e.key === "Escape") {
        setFileMenu(false);
        setPanel("");
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      const actions = {
        b: () => editor.command("bold"),
        i: () => editor.command("italic"),
        u: () => editor.command("underline"),
        z: () => editor.command(e.shiftKey ? "redo" : "undo"),
        y: () => editor.command("redo"),
        c: () => actionDialog("copy", editor, editor.capture()),
        x: () => actionDialog("cut", editor, editor.capture()),
        v: () => actionDialog("clipboard", editor, editor.capture()),
        a: () => editor.selectAll(),
        n: () => editor.createNew(),
        s: () => editor.save().catch(() => {}),
        o: () => fileInput.current.click(),
        f: () => setPanel("search"),
        h: () => setPanel("search"),
        p: () => editor.print(),
      };
      if (key === "enter") {
        e.preventDefault();
        actionDialog("pageBreak", editor, editor.capture());
      } else if (key === "f1") {
        e.preventDefault();
        setRibbonCollapsed((collapsed) => !collapsed);
      } else if (actions[key]) {
        e.preventDefault();
        e.stopImmediatePropagation();
        actions[key]();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [editor]);
  useEffect(() => {
    const root = container.current;
    const scroll = () => {
      const top = root.getBoundingClientRect().top;
      const pages = [...root.querySelectorAll("[data-page-index]")];
      const closest = pages.find(
        (p) => p.getBoundingClientRect().bottom > top + 90,
      );
      if (closest) editor.setPage(Number(closest.dataset.pageIndex) + 1);
    };
    root.addEventListener("scroll", scroll, true);
    return () => root.removeEventListener("scroll", scroll, true);
  }, [editor]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const syncRulerMargins = () => {
      root.querySelectorAll(".v2-ruler").forEach((ruler) => {
        const width = ruler.clientWidth || Number.parseFloat(ruler.style.width);
        const left = Number.parseFloat(
          ruler.querySelector(".v2-ruler__margin-handle--left")?.style.left,
        );
        const right = Number.parseFloat(
          ruler.querySelector(".v2-ruler__margin-handle--right")?.style.left,
        );
        if (!width || !Number.isFinite(left) || !Number.isFinite(right)) return;
        const start = `${((left / width) * 100).toFixed(3)}%`;
        const end = `${((right / width) * 100).toFixed(3)}%`;
        if (ruler.style.getPropertyValue("--ruler-content-start") !== start)
          ruler.style.setProperty("--ruler-content-start", start);
        if (ruler.style.getPropertyValue("--ruler-content-end") !== end)
          ruler.style.setProperty("--ruler-content-end", end);
      });
    };
    const observer = new MutationObserver(syncRulerMargins);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["style"],
      childList: true,
      subtree: true,
    });
    syncRulerMargins();
    return () => observer.disconnect();
  }, [editor.ready]);
  const imageChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/gif"].includes(file.type) ||
      file.size > 15 * 1024 * 1024
    ) {
      editor.setError("Use a PNG, JPEG or GIF image up to 15 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await editor.restore(selection.current);
        const image = new window.Image();
        image.src = reader.result;
        await image.decode();
        const width = Math.min(image.naturalWidth, 480);
        await editor.command("image", {
          src: reader.result,
          alt: file.name,
          size: {
            width,
            height: (width * image.naturalHeight) / image.naturalWidth,
          },
        });
      } catch (error) {
        editor.setError(error.message);
      }
    };
    reader.readAsDataURL(file);
  };
  const tableContext = editor.instance.current?.ui.tables.getContext();
  const zoom = editor.ui?.zoom?.value || 100;
  const selectedText = editor.ui?.selection?.quotedText || "";
  const selectedWords = selectedText.trim()
    ? selectedText.trim().split(/\s+/u).length
    : 0;
  const importFile = (file) => {
    setFileMenu(false);
    editor.open(file);
    setModeState("editing");
  };
  return (
    <div className="app-shell" data-ready={editor.ready}>
      <input
        ref={fileInput}
        type="file"
        accept=".docx"
        aria-label="Open DOCX"
        hidden
        onChange={(e) => {
          const file = e.target.files[0];
          e.target.value = "";
          if (file) importFile(file);
        }}
      />
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/gif"
        aria-label="Insert picture"
        hidden
        onChange={imageChange}
      />
      <header className="titlebar">
        <div className="brand">
          <img className="app-logo" src="/favicon.svg" alt="WebDoc logo" />
          <strong>WebDoc</strong>
          <span className="title-divider" />
          <input
            aria-label="Document name"
            value={editor.name}
            onChange={(e) => editor.rename(e.target.value)}
          />
          <ChevronDown size={14} />
        </div>
        <div className="local-status">
          <LockKeyhole size={13} />
          <span>{editor.saveState}</span>
        </div>
        <div className="quick-actions">
          <button
            title="Save locally"
            aria-label="Save locally"
            disabled={!editor.ready || !!editor.busy}
            onClick={() => editor.save().catch(() => {})}
          >
            <Save size={17} />
          </button>
          <button
            title="Undo"
            aria-label="Quick undo"
            disabled={!editor.ui?.toolbar.commands.undo?.enabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.command("undo")}
          >
            <Undo2 size={17} />
          </button>
          <button
            title="Redo"
            aria-label="Quick redo"
            disabled={!editor.ui?.toolbar.commands.redo?.enabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.command("redo")}
          >
            <Redo2 size={17} />
          </button>
        </div>
      </header>
      <nav className="tabbar" aria-label="Ribbon tabs">
        <button
          className="file-tab"
          aria-expanded={fileMenu}
          onClick={() => setFileMenu(!fileMenu)}
        >
          File
        </button>
        <div role="tablist" aria-label="Ribbon">
          {[
            ...tabs,
            ...(tableContext?.inTable ? ["Table"] : []),
            ...(imageId ? ["Picture"] : []),
          ].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "active" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setTab(t);
                setRibbonCollapsed(false);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          className="mode-picker"
          disabled={!editor.ready}
          onClick={() => setMode(mode === "viewing" ? "editing" : "viewing")}
        >
          <FileText size={14} />
          {mode === "viewing"
            ? "Viewing"
            : mode === "suggesting"
              ? "Suggesting"
              : "Editing"}
        </button>
        <button
          type="button"
          className="ribbon-toggle"
          title={`${ribbonCollapsed ? "Expand" : "Collapse"} ribbon (Ctrl+F1)`}
          aria-label={`${ribbonCollapsed ? "Expand" : "Collapse"} ribbon`}
          aria-expanded={!ribbonCollapsed}
          aria-controls="editor-ribbon"
          onClick={() => setRibbonCollapsed((collapsed) => !collapsed)}
        >
          {ribbonCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
        <button
          className="export-button"
          disabled={!editor.ready || !!editor.busy}
          onClick={() => editor.exportFile()}
        >
          <Download size={14} />
          Export DOCX
        </button>
      </nav>
      <Ribbon
        tab={tab}
        editor={editor}
        dialog={showDialog}
        setPanel={setPanel}
        openImage={() => {
          selection.current = editor.capture();
          imageInput.current.click();
        }}
        mode={mode}
        setMode={setMode}
        collapsed={ribbonCollapsed}
      />
      {editor.error && (
        <div className="notice error" role="alert">
          <span>{editor.error}</span>
          <button
            aria-label="Dismiss error"
            onClick={() => editor.setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {editor.notices.length > 0 && (
        <div className="notice compatibility">
          <Info size={15} />
          <span>{editor.notices.join(" ")}</span>
          <button
            aria-label="Dismiss compatibility notice"
            onClick={() => editor.setNotices([])}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <main className="workspace">
        {panel === "search" && editor.ready && (
          <SearchPanel editor={editor} onClose={() => setPanel("")} />
        )}
        <div
          className="editor-scroll"
          style={{
            "--editor-min-page-width":
              zoom > 100
                ? `${((editor.instance.current?.getViewportMetrics()?.documentWidth || 816) * zoom) / 100}px`
                : "0px",
          }}
          ref={container}
          onClick={(e) => {
            const image = e.target.closest("img");
            if (image) {
              const node = image.closest("[data-block-id]");
              editor.run(
                async (s) => {
                  const images = await s.activeEditor.doc.images.list({});
                  const match = images.items.find(
                    (x) =>
                      x.sdImageId === image.dataset.sdImageMutationId ||
                      x.address.nodeId === image.dataset.sdImageId ||
                      x.address.nodeId === node?.dataset.blockId,
                  );
                  if (match) {
                    setImageId(match.sdImageId);
                    setTab("Picture");
                  }
                },
                { mutates: false },
              );
            } else setImageId(null);
          }}
          aria-label="Document editor"
        />
        {panel === "review" && (
          <aside className="side-panel review">
            <div className="panel-heading">
              <h2>Review</h2>
              <button aria-label="Close review" onClick={() => setPanel("")}>
                <X size={18} />
              </button>
            </div>
            <h3>Comments · {editor.ui?.comments.total || 0}</h3>
            {editor.ui?.comments.items.map((c, i) => (
              <article className="review-card" key={c.commentId || i}>
                <strong>
                  {typeof c.author === "string"
                    ? c.author
                    : c.author?.name || c.creatorName || "Local author"}
                </strong>
                <p>{c.text}</p>
                <button
                  onClick={() =>
                    editor.run((s) => s.ui.comments.resolve(c.commentId))
                  }
                >
                  Resolve
                </button>
                <button
                  onClick={() =>
                    editor.run(
                      (s) => s.ui.comments.scrollIntoView(c.commentId),
                      { mutates: false },
                    )
                  }
                >
                  Show in document
                </button>
              </article>
            ))}
            <h3>Changes · {editor.ui?.trackChanges.total || 0}</h3>
            {editor.ui?.trackChanges.items.map((c, i) => (
              <article className="review-card" key={c.id || i}>
                <p>
                  {c.type || c.change?.type}{" "}
                  {c.excerpt || c.text || c.change?.excerpt || c.change?.text}
                </p>
                <button
                  onClick={() =>
                    editor.run((s) => s.ui.trackChanges.acceptAsync(c.id))
                  }
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    editor.run((s) => s.ui.trackChanges.rejectAsync(c.id))
                  }
                >
                  Reject
                </button>
              </article>
            ))}
            {!editor.ui?.comments.total && !editor.ui?.trackChanges.total && (
              <p className="muted">
                Select text to comment, or enable Track changes to suggest
                edits.
              </p>
            )}
          </aside>
        )}
      </main>
      <footer className="statusbar" aria-label="Document status">
        <button onClick={() => showDialog("page")}>
          Page {editor.page} of {editor.pages}
        </button>
        <button onClick={() => showDialog("info")}>
          {editor.info.counts.words || 0} words
        </button>
        {selectedWords > 0 && (
          <span className="selection-count" aria-live="polite">
            {selectedWords} selected · {selectedText.length} characters
          </span>
        )}
        <div className="status-views" role="group" aria-label="Document views">
          <button
            title="Read mode"
            aria-label="Read mode view"
            aria-pressed={mode === "viewing"}
            onClick={() => setMode("viewing")}
          >
            <BookOpen size={15} />
          </button>
          <button
            title="Print layout / editing"
            aria-label="Print layout view"
            aria-pressed={mode === "editing"}
            onClick={() => setMode("editing")}
          >
            <FileText size={15} />
          </button>
        </div>
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            disabled={!editor.ready}
            onClick={() =>
              editor.instance.current.setZoom(Math.max(25, zoom - 10))
            }
          >
            −
          </button>
          <input
            aria-label="Zoom"
            type="range"
            min="25"
            max="200"
            value={zoom}
            disabled={!editor.ready}
            onChange={(e) =>
              editor.instance.current.setZoom(Number(e.target.value))
            }
          />
          <button
            aria-label="Zoom in"
            disabled={!editor.ready}
            onClick={() =>
              editor.instance.current.setZoom(Math.min(200, zoom + 10))
            }
          >
            +
          </button>
          <button
            aria-label="Reset zoom"
            disabled={!editor.ready}
            onClick={() => editor.instance.current.setZoom(100)}
          >
            {Math.round(zoom)}%
          </button>
        </div>
      </footer>
      {fileMenu && (
        <div className="backstage-backdrop" onClick={() => setFileMenu(false)}>
          <section
            className="backstage"
            aria-label="File menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <h2>File</h2>
              <span className="backstage-brand">
                <img src="/favicon.svg" alt="" />
                WebDoc
              </span>
              <button
                aria-label="Close file menu"
                onClick={() => setFileMenu(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="file-actions">
              <Tool
                label="New document"
                icon={Plus}
                disabled={!editor.ready || !!editor.busy}
                onClick={() => {
                  setFileMenu(false);
                  editor.createNew();
                }}
              />
              <Tool
                label="Open / Import DOCX"
                icon={FolderOpen}
                onClick={() => fileInput.current.click()}
              />
              <Tool
                label="Save locally"
                icon={Save}
                disabled={!editor.ready || !!editor.busy}
                onClick={() => {
                  setFileMenu(false);
                  editor.save().catch(() => {});
                }}
              />
              {editor.openDiskSupported && (
                <Tool
                  label="Open from disk"
                  icon={FolderOpen}
                  disabled={!editor.ready || !!editor.busy}
                  onClick={() => {
                    setFileMenu(false);
                    editor.openFromDisk();
                  }}
                />
              )}
              <Tool
                label="Choose autosave file"
                icon={Save}
                disabled={
                  !editor.ready || !!editor.busy || !editor.diskSupported
                }
                title={
                  editor.diskSupported
                    ? "Choose a DOCX file to overwrite every 30 seconds while this document is open"
                    : "This browser cannot overwrite local files; use Chrome or Edge"
                }
                onClick={() => editor.chooseSaveLocation()}
              />
              {editor.diskState.name && (
                <Tool
                  label="Disconnect autosave file"
                  icon={Unplug}
                  onClick={editor.disconnectFile}
                />
              )}
              <Tool
                label="Save as / Export DOCX"
                icon={Download}
                disabled={!editor.ready || !!editor.busy}
                onClick={() => {
                  setFileMenu(false);
                  showDialog("saveAs");
                }}
              />
              <Tool
                label="Print"
                icon={Printer}
                disabled={!editor.ready || !!editor.busy}
                onClick={() => {
                  setFileMenu(false);
                  editor.print();
                }}
              />
              <Tool
                label="Document information"
                icon={Info}
                onClick={() => {
                  setFileMenu(false);
                  showDialog("info");
                }}
              />
            </div>
            <section
              className="autosave-settings"
              aria-label="Autosave settings"
            >
              <strong>
                Continuous browser save · file save every 30 seconds
              </strong>
              <p>
                Changes save continuously in this browser. Choose an autosave
                file to overwrite a local DOCX every 30 seconds while this
                document is open.
              </p>
              <p role="status">
                {editor.diskState.name
                  ? `${editor.diskState.status}: ${editor.diskState.name}`
                  : "No local file connected"}
              </p>
              {!editor.diskSupported && (
                <p>
                  This browser does not support local file overwrite. Browser
                  autosave and DOCX downloads remain available.
                </p>
              )}
              <small>
                Switching documents disconnects the local file. Choose a
                destination again when reopening a document. Browser timers may
                be delayed in background tabs.
              </small>
            </section>
            <h3>Document history</h3>
            <div
              className="history-tabs"
              role="group"
              aria-label="History views"
            >
              <button
                aria-pressed={historyView === "documents"}
                onClick={() => setHistoryView("documents")}
              >
                Recent local documents
              </button>
              <button
                aria-pressed={historyView === "trash"}
                onClick={() => setHistoryView("trash")}
              >
                Removed ({editor.trash.length})
              </button>
            </div>
            <p className="muted">
              Each document keeps its latest saved DOCX in this browser profile.
              Removing it from history does not delete any file on disk. Removed
              drafts can be restored.
            </p>
            <div className="recent-list">
              {(historyView === "documents" ? editor.recent : editor.trash).map(
                (d) => (
                  <div className="history-row" key={d.id}>
                    <button
                      className="history-open"
                      disabled={historyView === "trash" || !!editor.busy}
                      onClick={() => {
                        setFileMenu(false);
                        editor.open(
                          new File([d.blob], `${d.name}.docx`, {
                            type: DOCX_TYPE,
                          }),
                          d,
                        );
                      }}
                    >
                      <FileText size={20} />
                      <span>
                        <strong>{d.name}</strong>
                        <small>
                          {new Date(d.updated).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </small>
                      </span>
                      <Check
                        size={15}
                        opacity={
                          d.id === localStorage.getItem("wordcraft-current")
                            ? 1
                            : 0
                        }
                      />
                    </button>
                    {historyView === "documents" ? (
                      <button
                        className="history-remove"
                        aria-label={`Remove ${d.name} from history`}
                        disabled={!!editor.busy}
                        onClick={() => editor.removeHistory(d.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <>
                        <button
                          aria-label={`Restore ${d.name}`}
                          onClick={() => editor.restoreHistory(d.id)}
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          aria-label={`Delete ${d.name} permanently`}
                          onClick={() =>
                            setModal({
                              title: "Delete browser draft permanently",
                              description: `Permanently delete “${d.name}” and its saved DOCX from this browser? This cannot be undone. Files on disk are not deleted.`,
                              fields: [],
                              submit: () => editor.purgeHistory(d.id),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ),
              )}
              {(historyView === "documents" ? editor.recent : editor.trash)
                .length === 0 && (
                <p className="muted">
                  {historyView === "documents"
                    ? "No saved documents yet."
                    : "No removed documents."}
                </p>
              )}
            </div>
            <div className="file-legal-links">
              <a
                href="https://github.com/RonitGandotra05/WebDoc"
                target="_blank"
                rel="noreferrer"
              >
                Source code
              </a>
              <a
                href="/legal/WEBDOC-LICENSE.txt"
                target="_blank"
                rel="noreferrer"
              >
                Terms
              </a>
              <a
                href="/legal/THIRD_PARTY_NOTICES.txt"
                target="_blank"
                rel="noreferrer"
              >
                Notices
              </a>
              <span>© 2026 WebDoc</span>
            </div>
          </section>
        </div>
      )}
      {modal && (
        <Dialog
          key={modal.title}
          title={modal.title}
          description={modal.description}
          fields={modal.fields}
          onSubmit={modal.submit}
          onClose={() => {
            setModal(null);
            editor.restore(selection.current);
          }}
        >
          {modal.children}
        </Dialog>
      )}
      {editor.busy && (
        <div className="loading" role="status">
          <div className="spinner" />
          {editor.busy}
        </div>
      )}
    </div>
  );
}
