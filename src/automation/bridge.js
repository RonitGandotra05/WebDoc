import { createEditorApi } from "./editorApi";
import { createPageReader } from "./pageReader";
import { createAudioController } from "../integrations/audio";
const appCommands = [
  {
    id: "app.context",
    description:
      "Read current document identity, revision, counts and page count.",
    mutates: false,
    available: true,
    parameters: {
      type: "object",
      properties: { input: { type: "object", additionalProperties: false } },
      additionalProperties: false,
    },
  },
  {
    id: "app.readPage",
    description:
      "Read a 1-based page as model text and exact editable targets. Hydrates and scrolls the requested page. Check complete and target:null diagnostics.",
    mutates: false,
    available: true,
    parameters: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: { page: { type: "integer", minimum: 1 } },
          required: ["page"],
          additionalProperties: false,
        },
      },
      required: ["input"],
      additionalProperties: false,
    },
  },
];
export function createAutomationBridge(port) {
  const api = createEditorApi(port),
    readPage = createPageReader(port, api);
  const audio = createAudioController({
    api,
    revealTarget: (target) =>
      port.instance.current.activeEditor.authoring.setSelectionTarget({
        target,
        focus: true,
      }),
  });
  return Object.freeze({
    ...api,
    readPage,
    audio,
    describe: async (options = {}) => {
      const result = await api.describe(options);
      const extras = appCommands.filter((c) =>
        `${c.id} ${c.description}`
          .toLowerCase()
          .includes((options.query || "").toLowerCase()),
      );
      return {
        ...result,
        total: result.total + extras.length,
        commands: [...extras, ...result.commands],
      };
    },
    execute: async (request) => {
      if (!request?.id?.startsWith("app.")) return api.execute(request);
      try {
        let result;
        if (request.id === "app.context") result = await api.context();
        else if (request.id === "app.readPage") {
          if (
            !request.input ||
            Object.keys(request.input).some((k) => k !== "page")
          )
            throw new Error("INVALID_INPUT");
          result = await readPage({
            ...request.input,
            documentId: request.documentId,
            expectedRevision: request.expectedRevision,
          });
        } else throw new Error("UNKNOWN_COMMAND");
        const c = await api.context();
        return {
          ok: true,
          requestId: request.requestId || crypto.randomUUID(),
          commandId: request.id,
          documentId: c.documentId,
          revision: { before: c.revision, after: c.revision },
          changed: false,
          undoable: false,
          result,
        };
      } catch (error) {
        return {
          ok: false,
          commandId: request.id,
          error: { code: error.message, message: error.message },
        };
      }
    },
    dispose: () => {
      audio.dispose();
      api.dispose();
    },
  });
}
