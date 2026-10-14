import { useCallback, useEffect, useRef, useState } from "react";
import { SuperDoc } from "superdoc";
import "superdoc/style.css";
import {
  blankDocument,
  validateDocx,
  download,
  printDocument,
  DOCX_TYPE,
} from "./files";
import { drafts } from "./storage";
import {
  pickSaveFile,
  pickOpenFile,
  writeLocalDocx,
  canSaveToDisk,
  canOpenFromDisk,
} from "./localFile";
import { fonts, loadLocalCourier } from "./fonts";
import { alignHeaderLineNumbers } from "./lineNumberAlignment";
import { constrainPageViewport } from "./viewportBounds";
import { createAutomationBridge } from "../automation/bridge";
export function useDocumentEditor(container) {
  const instance = useRef(null),
    identity = useRef({ id: crypto.randomUUID(), name: "Document1" }),
    timer = useRef(null),
    dirty = useRef(false),
    original = useRef(null),
    generation = useRef(0),
    actionQueue = useRef(Promise.resolve());
  const automation = useRef(null);
  const diskBinding = useRef(null),
    diskPending = useRef(false),
    switching = useRef(false),
    browserSaveTimer = useRef(null),
    browserSaveInFlight = useRef(false);
  const [diskState, setDiskState] = useState({
    name: "",
    status: "Browser autosave only",
    savedAt: null,
  });
  const [trash, setTrash] = useState([]);
  const updateHistory = useCallback(async () => {
    const all = (await drafts("list")).sort((a, b) => b.updated - a.updated);
    setRecent(all.filter((d) => !d.deletedAt));
    setTrash(all.filter((d) => d.deletedAt));
  }, []);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState("Opening editor…"),
    [error, setError] = useState(""),
    [name, setName] = useState("Document1"),
    [saveState, setSaveState] = useState("Local document"),
    [ui, setUI] = useState(null),
    [info, setInfo] = useState({ counts: {}, outline: [] }),
    [pages, setPages] = useState(1),
    [notices, setNotices] = useState([]),
    [recent, setRecent] = useState([]),
    [page, setPage] = useState(1);
  const refresh = useCallback(async () => {
    const current = instance.current;
    if (!current?.activeEditor) return;
    const g = generation.current;
    try {
      const result = await current.activeEditor.doc.info({});
      if (g === generation.current) setInfo(result);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  const save = useCallback(
    async ({ toDisk = true } = {}) => {
      const job = async () => {
        const current = instance.current;
        if (!current?.activeEditor) return;
        const revision = generation.current;
        const documentMeta = { ...identity.current };
        setSaveState("Saving locally…");
        try {
          const blob =
            !dirty.current && original.current
              ? original.current
              : await current.export({ triggerDownload: false });
          let browserError;
          try {
            await drafts("put", {
              ...documentMeta,
              blob,
              updated: Date.now(),
              diskName:
                diskBinding.current?.documentId === documentMeta.id
                  ? diskBinding.current.handle.name
                  : undefined,
            });
            localStorage.setItem("wordcraft-current", documentMeta.id);
          } catch (e) {
            browserError = e;
          }
          const binding = diskBinding.current;
          let diskError;
          if (toDisk && binding?.documentId === documentMeta.id) {
            try {
              await writeLocalDocx(binding.handle, blob);
              diskPending.current = revision !== generation.current;
              setDiskState({
                name: binding.handle.name,
                status: "Saved to file",
                savedAt: Date.now(),
              });
            } catch (e) {
              diskError = e;
              diskPending.current = true;
              setDiskState({
                name: binding.handle.name,
                status: "File save failed — reconnect",
                savedAt: null,
              });
              setError(
                `Browser draft saved, but file save failed: ${e.message}`,
              );
            }
          }
          if (browserError) throw browserError;
          if (revision === generation.current) {
            dirty.current = false;
            original.current = blob;
            setSaveState(
              diskError
                ? "Saved in browser · file save failed"
                : diskPending.current && diskBinding.current
                  ? "Saved in browser · file pending"
                  : "Saved on this device",
            );
          } else setSaveState("Unsaved changes");
          await updateHistory();
          return blob;
        } catch (e) {
          setSaveState("Local save failed");
          setError(
            `Could not save locally: ${e.message}. Export a DOCX to keep your work.`,
          );
          throw e;
        }
      };
      // Export temporarily puts the native engine in a read-only save mode.
      // Serialize it with commands so rapid ribbon edits cannot hit that lock.
      const next = actionQueue.current.catch(() => {}).then(job);
      actionQueue.current = next;
      return next;
    },
    [updateHistory],
  );
  // Coalesce nearby edits without postponing persistence during continuous typing.
  // Only one browser export is in flight; edits arriving during it schedule a
  // follow-up snapshot. Browser writes never trigger filesystem writes.
  const scheduleBrowserSave = useCallback(() => {
    if (browserSaveTimer.current || browserSaveInFlight.current) return;
    browserSaveTimer.current = setTimeout(async () => {
      browserSaveTimer.current = null;
      if (
        !dirty.current ||
        switching.current ||
        !instance.current?.activeEditor
      )
        return;
      browserSaveInFlight.current = true;
      let succeeded = false;
      try {
        await save({ toDisk: false });
        succeeded = true;
      } catch {
        /* Save already reports the error; retry on another edit or the timed fallback. */
      } finally {
        browserSaveInFlight.current = false;
        if (succeeded && dirty.current && !switching.current)
          scheduleBrowserSave();
      }
    }, 250);
  }, [save]);
  const changed = useCallback(() => {
    generation.current++;
    dirty.current = true;
    if (diskBinding.current?.documentId === identity.current.id) {
      diskPending.current = true;
      setDiskState((previous) => ({
        ...previous,
        status: "Changes pending · saves every 30 seconds",
      }));
    }
    setSaveState("Unsaved changes");
    clearTimeout(timer.current);
    timer.current = setTimeout(refresh, 200);
    if (!switching.current) scheduleBrowserSave();
  }, [refresh, scheduleBrowserSave]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (ready && !switching.current && (dirty.current || diskPending.current))
        save().catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [ready, save]);
  useEffect(() => {
    let alive = true,
      editor,
      unsubscribe;
    const stopLineAlignment = alignHeaderLineNumbers(container.current);
    const stopViewportBounds = constrainPageViewport(container.current);
    (async () => {
      let file = await blankDocument();
      try {
        const currentId = localStorage.getItem("wordcraft-current");
        const stored = currentId ? await drafts("get", currentId) : null;
        if (stored && !stored.deletedAt) {
          file = new File([stored.blob], `${stored.name}.docx`, {
            type: DOCX_TYPE,
          });
          identity.current = { id: stored.id, name: stored.name };
          setName(stored.name);
        }
        await updateHistory();
      } catch (e) {
        if (alive) setError(`Draft recovery unavailable: ${e.message}`);
      }
      if (!alive) return;
      await loadLocalCourier();
      if (!alive) return;
      original.current = file;
      editor = new SuperDoc({
        selector: container.current,
        document: file,
        telemetry: { enabled: false },
        fonts,
        disablePiniaDevtools: true,
        documentMode: "editing",
        user: { name: "Local author", email: "author@localhost" },
        ui: {
          toolbar: false,
          ruler: true,
          search: false,
          comments: true,
          contextMenu: true,
        },
        zoom: {
          initial: 100,
          mode: "fit-width",
          fitWidth: { min: 25, max: 100, padding: 30 },
        },
        onReady: () => {
          if (!alive) return;
          setReady(true);
          setBusy("");
          refresh();
          unsubscribe = editor.ui.select((s) => s).subscribe(setUI);
          setUI(editor.ui.state);
          if (import.meta.env.DEV) window.__editor = editor;
        },
        onEditorUpdate: () => {
          if (alive) changed();
        },
        onPaginationUpdate: ({ totalPages }) => {
          if (alive) setPages(totalPages);
        },
        onException: (payload) => {
          if (alive)
            setError(
              payload.error?.message ||
                payload.message ||
                "The document engine encountered an error.",
            );
        },
        onContentError: (payload) => {
          if (alive) {
            setBusy("");
            setError(
              payload.error?.message || "The document could not be opened.",
            );
          }
        },
      });
      instance.current = editor;
    })().catch((e) => {
      if (alive) {
        setBusy("");
        setError(e.message);
      }
    });
    return () => {
      alive = false;
      clearTimeout(timer.current);
      clearTimeout(browserSaveTimer.current);
      browserSaveTimer.current = null;
      unsubscribe?.();
      stopLineAlignment();
      stopViewportBounds();
      editor?.destroy();
      instance.current = null;
    };
  }, [container, refresh, changed, updateHistory]);
  useEffect(() => {
    const unload = (e) => {
      if (dirty.current || diskPending.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, []);
  const run = useCallback(
    (action, { mutates = true } = {}) => {
      const perform = async () => {
        setPending(true);
        setError("");
        try {
          if (!instance.current?.activeEditor)
            throw new Error("The document is still opening.");
          const result = await action(instance.current);
          if (
            result === false ||
            result?.success === false ||
            result?.ok === false
          )
            throw new Error(
              result?.failure?.message ||
                result?.reason ||
                "This action needs an active selection or is unavailable in this context.",
            );
          // Package/story edits may not emit the engine body-update event.
          // Explicitly invalidate the cached DOCX for successful mutations.
          if (mutates) changed();
          await refresh();
          return result;
        } catch (error) {
          setError(error.message || String(error));
          return null;
        } finally {
          setPending(false);
        }
      };
      const result = actionQueue.current.catch(() => {}).then(perform);
      actionQueue.current = result;
      return result;
    },
    [refresh, changed],
  );
  const command = useCallback(
    (id, value) => {
      const capture =
        instance.current?.ui.selection.getSnapshot().selectionTarget;
      return run(
        async (s) => {
          if (
            capture &&
            !id.startsWith("table-") &&
            !["undo", "redo"].includes(id)
          )
            await s.activeEditor.authoring.setSelectionTarget({
              target: capture,
            });
          const tableContext = s.ui.tables.getContext();
          const tableOrdinal =
            id === "table-delete"
              ? (
                  await s.activeEditor.doc.blocks.list({
                    nodeIds: [tableContext.tableNodeId],
                  })
                ).blocks[0]?.ordinal
              : null;
          const result = await s.ui.commands.get(id).executeAsync(value);
          if (
            result !== false &&
            result?.success !== false &&
            ["table-delete-row", "table-delete-column"].includes(id) &&
            tableContext.inTable
          ) {
            const table = await s.activeEditor.doc.tables.get({
              nodeId: tableContext.tableNodeId,
            });
            const cells = await s.activeEditor.doc.tables.getCells({
              nodeId: tableContext.tableNodeId,
              rowIndex: Math.min(tableContext.rowIndex, table.rows - 1),
              columnIndex: Math.min(
                tableContext.columnIndex,
                table.columns - 1,
              ),
            });
            const blockId = cells.cells[0]?.firstParagraphNodeId;
            if (blockId)
              await s.activeEditor.authoring.setSelectionTarget({
                target: {
                  kind: "selection",
                  start: { kind: "text", blockId, offset: 0 },
                  end: { kind: "text", blockId, offset: 0 },
                },
                focus: true,
              });
          }
          if (
            result !== false &&
            result?.success !== false &&
            id === "table-delete"
          ) {
            const blocks = await s.activeEditor.doc.blocks.list({
              limit: 10000,
            });
            const candidates = blocks.blocks.filter((block) =>
              ["paragraph", "heading", "listItem"].includes(block.nodeType),
            );
            const nearest = candidates.sort(
              (a, b) =>
                Math.abs(a.ordinal - tableOrdinal) -
                Math.abs(b.ordinal - tableOrdinal),
            )[0];
            const target = nearest
              ? {
                  kind: "selection",
                  start: { kind: "text", blockId: nearest.nodeId, offset: 0 },
                  end: { kind: "text", blockId: nearest.nodeId, offset: 0 },
                }
              : null;
            if (target)
              await s.activeEditor.authoring.setSelectionTarget({
                target,
                focus: true,
              });
          }
          return result;
        },
        { mutates: !["ruler", "formatting-marks"].includes(id) },
      );
    },
    [run],
  );
  const open = useCallback(
    async (file, stored) => {
      if (!ready || busy || switching.current) return false;
      setError("");
      try {
        const warnings = await validateDocx(file);
        if (switching.current) return false;
        setBusy("Opening document…");
        switching.current = true;
        clearTimeout(timer.current);
        clearTimeout(browserSaveTimer.current);
        browserSaveTimer.current = null;
        await save();
        await instance.current.replaceFile(file);
        diskBinding.current = null;
        diskPending.current = false;
        setDiskState({
          name: "",
          status: "Browser autosave only",
          savedAt: null,
        });
        container.current.scrollTop = 0;
        container.current.scrollLeft = 0;
        generation.current++;
        identity.current = {
          id: stored?.id || crypto.randomUUID(),
          name: stored?.name || file.name.replace(/\.docx$/i, ""),
        };
        original.current = file;
        dirty.current = false;
        setName(identity.current.name);
        setNotices(warnings);
        setSaveState("Opened locally");
        setPage(1);
        await refresh();
        await save();
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      } finally {
        switching.current = false;
        setBusy("");
      }
    },
    [ready, busy, save, refresh, container],
  );
  const createNew = useCallback(async () => {
    const opened = await open(await blankDocument());
    if (opened) setNotices([]);
    return opened;
  }, [open]);
  const chooseSaveLocation = useCallback(async () => {
    const id = identity.current.id;
    try {
      const handle = await pickSaveFile(identity.current.name);
      if (id !== identity.current.id || switching.current)
        throw new Error(
          "The document changed while choosing a location. Choose again for the active document.",
        );
      setError("");
      diskBinding.current = { documentId: id, handle };
      diskPending.current = true;
      setDiskState({
        name: handle.name,
        status: "Saving to file…",
        savedAt: null,
      });
      await save();
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    }
  }, [save]);
  const disconnectFile = useCallback(() => {
    diskBinding.current = null;
    diskPending.current = false;
    setDiskState({ name: "", status: "Browser autosave only", savedAt: null });
  }, []);
  const openFromDisk = useCallback(async () => {
    try {
      const file = await pickOpenFile();
      await open(file);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    }
  }, [open]);
  const removeHistory = useCallback(
    async (id) => {
      try {
        if (id === identity.current.id && !(await createNew())) return;
        const record = await drafts("get", id);
        if (record) await drafts("put", { ...record, deletedAt: Date.now() });
        await updateHistory();
      } catch (e) {
        setError(e.message);
      }
    },
    [createNew, updateHistory],
  );
  const restoreHistory = useCallback(
    async (id) => {
      try {
        const record = await drafts("get", id);
        if (record) {
          delete record.deletedAt;
          await drafts("put", record);
        }
        await updateHistory();
      } catch (e) {
        setError(e.message);
      }
    },
    [updateHistory],
  );
  const purgeHistory = useCallback(
    async (id) => {
      const record = await drafts("get", id);
      if (!record?.deletedAt)
        throw new Error(
          "Remove the document from history before deleting it permanently.",
        );
      await drafts("delete", id);
      await updateHistory();
    },
    [updateHistory],
  );
  const rename = useCallback(
    (value) => {
      identity.current.name = value.trim() || "Document1";
      setName(value);
      changed();
    },
    [changed],
  );
  const exportFile = useCallback(
    async (saveAs) => {
      setBusy("Exporting DOCX…");
      try {
        if (saveAs) rename(saveAs);
        let blob;
        try {
          blob = await save();
        } catch {
          blob = await instance.current.export({ triggerDownload: false });
        }
        download(
          blob,
          `${identity.current.name.replace(/[\\/:*?"<>|]/g, "_")}.docx`,
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy("");
      }
    },
    [save, rename],
  );
  const print = useCallback(async () => {
    setBusy("Preparing all pages for print…");
    try {
      let blob;
      try {
        blob = await save();
      } catch {
        blob = await instance.current.export({ triggerDownload: false });
      }
      await printDocument(blob);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }, [save]);
  const capture = useCallback(() => {
    const ui = instance.current?.ui;
    return (
      ui?.selection.capture() || {
        selectionTarget: ui?.selection.getSnapshot().selectionTarget,
      }
    );
  }, []);
  const restore = useCallback(async (value) => {
    const target = value?.selectionTarget || value?.target;
    if (target && instance.current?.activeEditor)
      return instance.current.activeEditor.authoring.setSelectionTarget({
        target,
      });
  }, []);
  const selectTarget = useCallback(
    () =>
      instance.current?.ui.selection.getSnapshot().selectionTarget ||
      instance.current?.ui.selection.getSnapshot().target,
    [],
  );
  const paragraph = useCallback(() => {
    const target = selectTarget();
    const nodeId = target?.start?.blockId || target?.blockId;
    return nodeId ? { kind: "block", nodeType: "paragraph", nodeId } : null;
  }, [selectTarget]);
  const selectAll = useCallback(
    () =>
      run(
        async (s) => {
          const story = selectTarget()?.story;
          const doc = s.activeEditor.doc;
          const result = await doc.blocks.list({
            includeText: true,
            limit: 10000,
            in: story,
          });
          if (!result.blocks.length) return false;
          if (result.total > result.blocks.length)
            throw new Error(
              "This document exceeds the current Select All limit. Select a range manually.",
            );
          const resolve = async (block, last) => {
            if (["paragraph", "heading", "listItem"].includes(block.nodeType))
              return doc.getNodeById({ nodeId: block.nodeId, in: story });
            const nested = await doc.find({
              select: { type: "node", kind: "block" },
              within: {
                kind: "block",
                nodeType: block.nodeType,
                nodeId: block.nodeId,
              },
              limit: 10000,
              in: story,
            });
            const paragraphs = nested.items.filter((item) =>
              ["paragraph", "heading"].includes(item.node.kind),
            );
            if (!paragraphs.length)
              throw new Error(
                "This document boundary cannot be selected through the text editor.",
              );
            return paragraphs[last ? paragraphs.length - 1 : 0];
          };
          const first = await resolve(result.blocks[0], false);
          const last = await resolve(
            result.blocks[result.blocks.length - 1],
            true,
          );
          const textLength = (inline) => {
            if (inline.kind === "run") return inline.run.text.length;
            if (inline.kind === "hyperlink")
              return (inline.hyperlink.inlines || []).reduce(
                (n, x) => n + textLength(x),
                0,
              );
            if (inline.kind === "field")
              return inline.field.resultText?.length || 0;
            if (inline.kind === "crossRef")
              return inline.crossRef.resolvedText?.length || 0;
            if (
              [
                "tab",
                "lineBreak",
                "image",
                "footnoteRef",
                "endnoteRef",
              ].includes(inline.kind)
            )
              return 1;
            return 0;
          };
          const inlines = (last.node.paragraph || last.node.heading).inlines;
          const target = {
            kind: "selection",
            start: { kind: "text", blockId: first.address.nodeId, offset: 0 },
            end: {
              kind: "text",
              blockId: last.address.nodeId,
              offset: inlines.reduce((n, x) => n + textLength(x), 0),
            },
          };
          return s.activeEditor.authoring.setSelectionTarget({
            target,
            focus: true,
          });
        },
        { mutates: false },
      ),
    [run, selectTarget],
  );
  const insert = useCallback(
    (value) =>
      run((s) =>
        s.activeEditor.doc.insert({
          value,
          target: selectTarget() || undefined,
        }),
      ),
    [run, selectTarget],
  );
  const inline = useCallback(
    (properties) =>
      run((s) => {
        const target = selectTarget();
        if (!target)
          throw new Error("Select text before applying this formatting.");
        return s.activeEditor.doc.format.apply({ target, inline: properties });
      }),
    [run, selectTarget],
  );
  const formatParagraph = useCallback(
    (operation, props) =>
      run((s) => {
        const target = paragraph();
        if (!target) throw new Error("Place the cursor in a paragraph first.");
        return s.activeEditor.doc.format.paragraph[operation]({
          target,
          ...props,
        });
      }),
    [run, paragraph],
  );
  const section = useCallback(async () => {
    const list = await instance.current.activeEditor.doc.sections.list({});
    const active = paragraph();
    if (active) {
      const node = await instance.current.activeEditor.doc.getNodeById({
        nodeId: active.nodeId,
        options: { includeContext: true },
      });
      const contextual = list.items.find(
        (item) => item.address.sectionId === node.context?.sectionId,
      );
      if (contextual) return contextual;
      const blocks = await instance.current.activeEditor.doc.blocks.list({
        nodeIds: [active.nodeId],
      });
      const index = blocks.blocks.find(
        (block) => block.nodeId === active.nodeId,
      )?.ordinal;
      return (
        list.items.find(
          (x) =>
            index >= x.range.startParagraphIndex &&
            index <= x.range.endParagraphIndex,
        ) || list.items[0]
      );
    }
    return list.items[0];
  }, [paragraph]);
  const layout = useCallback(
    (operation, props) =>
      run(async (s) => {
        const active = await section();
        return s.activeEditor.doc.sections[operation]({
          target: active.address,
          ...props,
        });
      }),
    [run, section],
  );
  const navigate = useCallback(
    async (value) => {
      const target = Math.max(1, Math.min(pages, value));
      const pageElement = container.current.querySelector(
        `[data-page-index="${target - 1}"]`,
      );
      if (pageElement) {
        pageElement.scrollIntoView({ block: "start" });
        setPage(target);
      } else setError("This page is still loading. Try again shortly.");
    },
    [pages, container],
  );
  useEffect(() => {
    if (!ready) return;
    const port = { instance, identity, container, run };
    const bridge = createAutomationBridge(port);
    automation.current = bridge;
    window.webdoc = bridge;
    window.wordcraft = bridge; // Compatibility for existing local integrations.
    return () => {
      bridge.dispose();
      if (window.webdoc === bridge) delete window.webdoc;
      if (window.wordcraft === bridge) delete window.wordcraft;
      automation.current = null;
    };
  }, [ready, run, container]);
  return {
    automation,
    diskState,
    diskSupported: canSaveToDisk(),
    openDiskSupported: canOpenFromDisk(),
    chooseSaveLocation,
    disconnectFile,
    openFromDisk,
    removeHistory,
    restoreHistory,
    purgeHistory,
    trash,
    instance,
    ready,
    pending,
    busy,
    error,
    setError,
    name,
    rename,
    saveState,
    ui,
    info,
    pages,
    page,
    setPage,
    notices,
    setNotices,
    recent,
    save,
    command,
    run,
    open,
    createNew,
    exportFile,
    print,
    capture,
    restore,
    selectTarget,
    paragraph,
    selectAll,
    insert,
    inline,
    formatParagraph,
    section,
    layout,
    navigate,
    refresh,
  };
}
