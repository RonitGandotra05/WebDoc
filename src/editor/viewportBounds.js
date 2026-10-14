/** Constrain overflowing unscaled layout boxes to the actual zoomed page stack. */
export function constrainPageViewport(root) {
  let frame = 0,
    disposed = false;
  const update = () => {
    frame = 0;
    if (disposed) return;
    const stage = root.querySelector('[data-role="v2-stage"]'),
      surface = stage?.querySelector("[data-v2-paint-wrapper]");
    if (!stage || !surface) return;
    const pixels = Math.ceil(surface.getBoundingClientRect().height);
    if (
      pixels > 0 &&
      stage.style.getPropertyValue("--painted-pages-height") !== `${pixels}px`
    ) {
      const scroll = root.closest(".editor-scroll");
      const atEnd =
        scroll &&
        scroll.scrollTop > 0 &&
        scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 2;
      stage.style.setProperty("--painted-pages-height", `${pixels}px`);
      // Preserve the final-page position when an asynchronous zoom changes
      // the page-stack height after the user has already reached its end.
      if (atEnd) scroll.scrollTop = scroll.scrollHeight;
    }
  };
  const schedule = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(update);
  };
  const mutations = new MutationObserver(schedule);
  mutations.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "data-layout-epoch"],
  });
  const resize = new ResizeObserver(schedule);
  resize.observe(root);
  schedule();
  return () => {
    disposed = true;
    mutations.disconnect();
    resize.disconnect();
    cancelAnimationFrame(frame);
  };
}
