import { useEffect, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
export default function SearchPanel({ editor, onClose }) {
  const [query, setQuery] = useState(""),
    [replacement, setReplacement] = useState(""),
    [caseSensitive, setCase] = useState(false),
    [snapshot, setSnapshot] = useState({ total: 0, activeIndex: -1 }),
    [pending, setPending] = useState(false);
  useEffect(() => {
    const search = editor.instance.current.ui.search;
    search.open();
    const off = search.observe(setSnapshot);
    return () => {
      off();
      search.close();
    };
  }, [editor.instance]);
  useEffect(() => {
    const id = setTimeout(
      () => editor.instance.current.ui.search.find(query, { caseSensitive }),
      180,
    );
    return () => clearTimeout(id);
  }, [query, caseSensitive, editor.instance]);
  const replace = async (all) => {
    setPending(true);
    await editor.run((s) =>
      all
        ? s.ui.search.replaceAll(replacement)
        : s.ui.search.replace(replacement),
    );
    setPending(false);
  };
  return (
    <aside className="side-panel" aria-label="Navigation">
      <div className="panel-heading">
        <h2>Navigation</h2>
        <button aria-label="Close navigation" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <label className="field">
        <span>Find in document</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") editor.instance.current.ui.search.next();
          }}
        />
      </label>
      <div className="row">
        <span aria-live="polite">
          {snapshot.total
            ? `${snapshot.activeIndex + 1} of ${snapshot.total} matches`
            : query
              ? "No matches"
              : "Search the document"}
        </span>
        <button
          aria-label="Previous match"
          disabled={!snapshot.total}
          onClick={() => editor.instance.current.ui.search.previous()}
        >
          <ChevronUp size={17} />
        </button>
        <button
          aria-label="Next match"
          disabled={!snapshot.total}
          onClick={() => editor.instance.current.ui.search.next()}
        >
          <ChevronDown size={17} />
        </button>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(e) => setCase(e.target.checked)}
        />
        Match case
      </label>
      <label className="field">
        <span>Replace with</span>
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
        />
      </label>
      <div className="row">
        <button
          disabled={!snapshot.canReplace || pending}
          onClick={() => replace(false)}
        >
          Replace
        </button>
        <button
          disabled={!snapshot.canReplaceAll || pending}
          onClick={() => replace(true)}
        >
          Replace all
        </button>
      </div>
      <h3>Headings</h3>
      {editor.info.outline?.length ? (
        editor.info.outline.map((h) => (
          <button
            className="outline-item"
            key={h.nodeId}
            style={{ paddingLeft: 12 + (h.level - 1) * 12 }}
            onClick={() =>
              editor.run((s) =>
                s.ui.viewport.scrollIntoView({
                  target: {
                    kind: "block",
                    nodeType: "paragraph",
                    nodeId: h.nodeId,
                  },
                }),
              )
            }
          >
            {h.text}
          </button>
        ))
      ) : (
        <p className="muted">Apply a heading style to add an item here.</p>
      )}
    </aside>
  );
}
