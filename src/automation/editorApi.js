import Ajv from "ajv";
import contract from "./engine-contract.json";
const READ =
  /(?:^get$|^getNode(?:ById)?$|^getText$|^getMarkdown$|^getHtml$|^project|^info$|^extract$|^find$|^capabilities|^query\.|^ranges\.|^selection\.|\.(?:get\w*|list\w*|find\w*|can\w*|check|preview|capture|compare|resolve|parse|serializeSelection)$)/;
const codeError = (code, message) =>
  Object.assign(new Error(message), { code });
const serializable = (value) =>
  value === undefined ? null : JSON.parse(JSON.stringify(value));
export function createEditorApi(port) {
  const ajv = new Ajv({ strict: false, validateFormats: false });
  ajv.addSchema({ ...contract.schema, $id: "wordcraft-engine" });
  const schemaFor = (command) => {
    const definitions = {},
      visit = (value) => {
        if (!value || typeof value !== "object") return;
        if (
          typeof value.$ref === "string" &&
          value.$ref.startsWith("#/definitions/")
        ) {
          const name = value.$ref.slice("#/definitions/".length);
          if (!(name in definitions)) {
            definitions[name] = contract.schema.definitions[name];
            visit(definitions[name]);
          }
        }
        Object.values(value).forEach(visit);
      };
    visit({ $ref: command.schemaRef });
    return { $ref: command.schemaRef, definitions };
  };
  const commands = new Map(
    contract.commands.map((command) => [command.id, command]),
  );
  const validators = new Map(),
    journal = [],
    retries = new Map();
  let disposed = false;
  const active = () => {
    if (disposed || !port.instance.current?.activeEditor)
      throw codeError("NOT_READY", "The editor API is unavailable.");
    return port.instance.current.activeEditor;
  };
  const context = async () => {
    const editor = active(),
      info = await editor.doc.info({});
    return {
      documentId: port.identity.current.id,
      revision: info.revision,
      info,
      pages: editor.pageMetrics.getSnapshot().pages.length,
    };
  };
  const guard = (request, current) => {
    if (request.documentId !== current.documentId)
      throw codeError(
        "DOCUMENT_MISMATCH",
        "Read the current document before editing.",
      );
    if (request.expectedRevision !== current.revision)
      throw codeError(
        "REVISION_MISMATCH",
        "The document changed. Read and resolve targets again.",
      );
  };
  const describe = async ({ query = "", limit = 50, offset = 0 } = {}) => {
    const caps = await active().doc.capabilities();
    const history = await active().doc.history.get();
    const filtered = contract.commands.filter((c) =>
      `${c.id} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
    );
    return {
      version: "1.0",
      engineVersion: contract.engineVersion,
      total: filtered.length,
      commands: filtered
        .slice(offset, offset + Math.min(100, limit))
        .map((c) => ({
          id: `doc.${c.id}`,
          description: c.description,
          mutates: !READ.test(c.id),
          available: caps.operations[c.id]?.available === true,
          undoable: !history.historyUnsafeOperations.includes(c.id),
          capabilities: caps.operations[c.id],
          parameters: schemaFor(c),
        })),
    };
  };
  const execute = async (request) => {
    const started = performance.now();
    let before, result, error, undoBefore;
    const requestId = request.requestId || crypto.randomUUID();
    const fingerprint = JSON.stringify(request);
    if (retries.has(requestId)) {
      const cached = retries.get(requestId);
      if (cached.fingerprint !== fingerprint)
        return {
          ok: false,
          requestId,
          error: {
            code: "REQUEST_ID_CONFLICT",
            message: "Use a new requestId for a different command.",
          },
        };
      return cached.promise;
    }
    const perform = async () => {
      try {
        const id = request.id?.replace(/^doc\./, "");
        const command = commands.get(id);
        if (!command)
          throw codeError(
            "UNKNOWN_COMMAND",
            "Discover a supported command ID first.",
          );
        if (id === "plan.execute")
          throw codeError(
            "USE_ATOMIC_PLAN",
            "Use mutations.preview/apply for a revision-guarded atomic edit.",
          );
        let validate = validators.get(id);
        if (!validate) {
          validate = ajv.compile({
            $ref: "wordcraft-engine" + command.schemaRef,
          });
          validators.set(id, validate);
        }
        const payload = {};
        if ("input" in request) payload.input = request.input;
        if ("options" in request) payload.options = request.options;
        if (!validate(payload))
          throw codeError("INVALID_INPUT", ajv.errorsText(validate.errors));
        const mutate = !READ.test(id);
        const dispatch = async () => {
          before = await context();
          if (mutate) guard(request, before);
          const history = await active().doc.history.get();
          undoBefore = history.undoDepth;
          if (
            mutate &&
            history.historyUnsafeOperations.includes(id) &&
            !request.allowHistoryUnsafe
          )
            throw codeError(
              "NOT_UNDOABLE",
              "This operation bypasses undo. Explicit allowHistoryUnsafe is required.",
            );
          const caps = await active().doc.capabilities();
          if (!caps.operations[id]?.available)
            throw codeError(
              "UNSUPPORTED",
              "The current engine or document does not support this operation.",
            );
          const options = request.options ? { ...request.options } : undefined;
          if (
            mutate &&
            options &&
            "expectedRevision" in options &&
            options.expectedRevision !== request.expectedRevision
          )
            throw codeError(
              "REVISION_MISMATCH",
              "Conflicting revision guards.",
            );
          const definition =
            contract.schema.definitions[command.schemaRef.split("/").at(-1)];
          const guardedOptions =
            mutate && definition.properties?.options
              ? { ...options, expectedRevision: before.revision }
              : options;
          if (
            id === "mutations.apply" &&
            request.input.expectedRevision !== before.revision
          )
            throw codeError(
              "REVISION_MISMATCH",
              "The plan must bind to the current revision.",
            );
          if (mutate) guard(request, await context());
          result = await active().doc.invoke({
            operationId: id,
            input: request.input,
            ...(guardedOptions ? { options: guardedOptions } : {}),
          });
          if (result?.success === false || result?.ok === false)
            throw codeError(
              result.failure?.code || "COMMAND_FAILED",
              result.failure?.message || "The engine rejected this command.",
            );
        };
        if (mutate) {
          await port.run(async () => {
            try {
              await dispatch();
            } catch (e) {
              error = e;
              return false;
            }
          });
          if (error) throw error;
        } else await dispatch();
        const after = await context(),
          history = await active().doc.history.get();
        const receipt = {
          ok: true,
          requestId,
          commandId: request.id,
          documentId: after.documentId,
          revision: { before: before.revision, after: after.revision },
          changed: before.revision !== after.revision,
          undoable: history.undoDepth > undoBefore,
          undoSteps: Math.max(0, history.undoDepth - undoBefore),
          result: serializable(result),
        };
        journal.push({
          ...receipt,
          result: undefined,
          elapsedMs: performance.now() - started,
        });
        if (journal.length > 200) journal.shift();
        return receipt;
      } catch (e) {
        return {
          ok: false,
          requestId,
          commandId: request.id,
          error: { code: e.code || "ENGINE_ERROR", message: e.message },
        };
      }
    };
    const promise = perform();
    retries.set(requestId, { fingerprint, promise });
    if (retries.size > 128) retries.delete(retries.keys().next().value);
    return promise;
  };
  return Object.freeze({
    version: "1.0",
    context,
    describe,
    execute,
    schema: () => structuredClone(contract.schema),
    journal: () => structuredClone(journal),
    undoAction: async ({ requestId, documentId, expectedRevision }) => {
      const current = await context();
      try {
        guard({ documentId, expectedRevision }, current);
      } catch (e) {
        return { ok: false, error: { code: e.code, message: e.message } };
      }
      const latest = journal.filter((x) => x.changed).at(-1);
      if (
        !latest ||
        latest.requestId !== requestId ||
        latest.revision.after !== current.revision ||
        !latest.undoable ||
        latest.undoSteps !== 1
      )
        return {
          ok: false,
          error: {
            code: "UNDO_CONFLICT",
            message:
              "Only the latest unchanged one-step action can be undone by ID. Use explicit history operations for other cases.",
          },
        };
      return execute({ id: "doc.history.undo", documentId, expectedRevision });
    },
    dispose: () => {
      disposed = true;
      retries.clear();
      journal.length = 0;
    },
  });
}
