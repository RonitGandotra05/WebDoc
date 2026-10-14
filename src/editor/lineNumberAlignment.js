/**
 * Render-only compatibility adapter for a numbered header text box.
 * The engine currently resolves these drawings from the header origin and uses
 * different exact-line baselines inside text boxes. Keep the original OOXML,
 * numbering interval, rules, and page fields intact; align the grid's first
 * glyph with the first body glyph on each painted page. Ordinary header text
 * boxes are deliberately excluded.
 */
export function alignHeaderLineNumbers(root) {
  let scheduled = 0;
  const glyphRect = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
  };
  const align = () => {
    scheduled = 0;
    for (const page of root.querySelectorAll(".superdoc-page")) {
      const body = [
        ...page.querySelectorAll(
          '.superdoc-fragment[data-layout-story="body"] .superdoc-line',
        ),
      ].find((line) => line.textContent.trim());
      if (!body) continue;
      const bodyRun = body.querySelector(".superdoc-text-run");
      if (!bodyRun) continue;
      const scale = page.getBoundingClientRect().width / page.offsetWidth;
      if (!scale) continue;
      // A PAGE field after a whitespace-only right-tab group is painted at
      // the group start by the engine. Its right edge belongs at the tab stop.
      for (const line of page.querySelectorAll(
        ".superdoc-page-header > .superdoc-fragment:not(.superdoc-drawing-fragment) .superdoc-line",
      )) {
        const tabs = [...line.querySelectorAll(".superdoc-tab")];
        const runs = [...line.querySelectorAll(".superdoc-text-run")];
        const field = runs.at(-1);
        if (
          tabs.length !== 2 ||
          !field ||
          !/^\d+$/.test(field.textContent.trim()) ||
          !runs.slice(0, -1).every((run) => !run.textContent.trim())
        )
          continue;
        const tab = tabs.at(-1);
        const stop = parseFloat(tab.style.left) + parseFloat(tab.style.width);
        const width = glyphRect(field).width / scale;
        const offset = stop - width - parseFloat(field.style.left);
        const value = `${offset}px`;
        if (field.style.getPropertyValue("--page-field-shift") !== value) {
          field.style.setProperty("--page-field-shift", value);
          field.dataset.pageFieldAligned = "true";
        }
      }
      for (const fragment of page.querySelectorAll(
        ".superdoc-page-header .superdoc-drawing-fragment[data-sd-textbox-id]",
      )) {
        const runs = [
          ...fragment.querySelectorAll(".superdoc-text-run"),
        ].filter((run) => run.textContent.trim());
        // A header containing exactly 1…N is a line grid, not a page field.
        if (
          runs.length < 10 ||
          !runs.every(
            (run, index) => run.textContent.trim() === String(index + 1),
          )
        )
          continue;
        const previous = Number(fragment.dataset.lineGridShift || 0);
        const difference =
          (glyphRect(bodyRun).top - glyphRect(runs[0]).top) / scale;
        const shift = previous + difference;
        if (Math.abs(difference) > 0.05) {
          fragment.style.setProperty("--line-grid-shift", `${shift}px`);
          fragment.dataset.lineGridShift = String(shift);
          fragment.dataset.lineGridAligned = "true";
        }
      }
    }
  };
  const schedule = () => {
    if (!scheduled) scheduled = requestAnimationFrame(align);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-layout-epoch", "data-v2-page-content", "style"],
  });
  const resize = new ResizeObserver(schedule);
  resize.observe(root);
  document.fonts.ready.then(schedule);
  schedule();
  return () => {
    observer.disconnect();
    resize.disconnect();
    cancelAnimationFrame(scheduled);
  };
}
