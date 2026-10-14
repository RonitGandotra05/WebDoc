/** Local playback adapter. Audio stays outside DOCX; cues use revisioned targets. */
export function createAudioController({ api, revealTarget } = {}) {
  const audio = new Audio(),
    listeners = new Set();
  let objectUrl,
    cues = [],
    disposed = false;
  const snapshot = () => ({
    loaded: !!objectUrl,
    paused: audio.paused,
    currentTime: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : null,
    rate: audio.playbackRate,
    cues: structuredClone(cues),
  });
  const emit = () => {
    for (const listener of listeners) listener(snapshot());
  };
  const events = [
    "loadedmetadata",
    "timeupdate",
    "play",
    "pause",
    "ended",
    "ratechange",
    "error",
  ];
  events.forEach((event) => audio.addEventListener(event, emit));
  const assert = () => {
    if (disposed) throw new Error("AUDIO_DISPOSED");
  };
  return Object.freeze({
    snapshot,
    subscribe(listener) {
      assert();
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    async load(file) {
      assert();
      if (!(file instanceof Blob) || !file.size)
        throw new Error("Use a non-empty local audio File or Blob.");
      audio.pause();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      cues = [];
      await new Promise((resolve, reject) => {
        const finish = (error) => {
          audio.removeEventListener("loadedmetadata", loaded);
          audio.removeEventListener("error", failed);
          error ? reject(error) : resolve();
        };
        const loaded = () => finish(),
          failed = () =>
            finish(new Error("The browser cannot decode this audio file."));
        audio.addEventListener("loadedmetadata", loaded, { once: true });
        audio.addEventListener("error", failed, { once: true });
        audio.load();
      });
      emit();
      return snapshot();
    },
    async execute({ id, input = {} }) {
      assert();
      if (!objectUrl) throw new Error("Load local audio first.");
      switch (id) {
        case "audio.play":
          await audio.play();
          break;
        case "audio.pause":
          audio.pause();
          break;
        case "audio.seek":
          if (
            !Number.isFinite(input.seconds) ||
            input.seconds < 0 ||
            input.seconds > audio.duration
          )
            throw new Error("Invalid playback position.");
          audio.currentTime = input.seconds;
          break;
        case "audio.rate":
          if (
            !Number.isFinite(input.rate) ||
            input.rate < 0.25 ||
            input.rate > 4
          )
            throw new Error("Playback rate must be 0.25–4.");
          audio.playbackRate = input.rate;
          break;
        default:
          throw new Error("UNKNOWN_AUDIO_COMMAND");
      }
      emit();
      return snapshot();
    },
    async setCues(values) {
      assert();
      const context = await api.context();
      if (
        !Array.isArray(values) ||
        values.some(
          (c) =>
            !Number.isFinite(c.seconds) ||
            c.seconds < 0 ||
            c.seconds > audio.duration ||
            c.documentId !== context.documentId ||
            c.revision !== context.revision ||
            !c.target,
        )
      )
        throw new Error("Invalid or stale audio cues.");
      for (const cue of values) {
        const result = await api.execute({
          id: "doc.ranges.resolve",
          input: {
            start: { kind: "point", point: cue.target.start },
            end: { kind: "point", point: cue.target.end },
            expectedRevision: context.revision,
          },
        });
        if (!result.ok) throw new Error("Invalid cue target.");
      }
      cues = structuredClone(values).sort((a, b) => a.seconds - b.seconds);
      emit();
      return snapshot();
    },
    async revealCue(index) {
      assert();
      const cue = cues[index];
      if (!cue) throw new Error("CUE_NOT_FOUND");
      const context = await api.context();
      if (
        cue.documentId !== context.documentId ||
        cue.revision !== context.revision
      )
        throw new Error("STALE_CUE");
      if (!revealTarget)
        throw new Error("No document navigation adapter is attached.");
      await revealTarget(cue.target);
      return cue;
    },
    dispose() {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      events.forEach((event) => audio.removeEventListener(event, emit));
      listeners.clear();
      disposed = true;
    },
  });
}
export const audioTools = [
  { id: "audio.play", input: { type: "object", additionalProperties: false } },
  { id: "audio.pause", input: { type: "object", additionalProperties: false } },
  {
    id: "audio.seek",
    input: {
      type: "object",
      properties: { seconds: { type: "number", minimum: 0 } },
      required: ["seconds"],
      additionalProperties: false,
    },
  },
  {
    id: "audio.rate",
    input: {
      type: "object",
      properties: { rate: { type: "number", minimum: 0.25, maximum: 4 } },
      required: ["rate"],
      additionalProperties: false,
    },
  },
];
