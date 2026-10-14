export interface TextPoint {
  kind: "text";
  blockId: string;
  offset: number;
}
export interface SelectionTarget {
  kind: "selection";
  start: TextPoint;
  end: TextPoint;
}
export interface CommandRequest {
  id: string;
  input?: unknown;
  options?: unknown;
  documentId?: string;
  expectedRevision?: string;
  requestId?: string;
  allowHistoryUnsafe?: boolean;
}
export interface ActionReceipt {
  ok: boolean;
  requestId?: string;
  commandId?: string;
  documentId?: string;
  revision?: { before: string; after: string };
  changed?: boolean;
  undoable?: boolean;
  undoSteps?: number;
  result?: unknown;
  error?: { code: string; message: string };
}
export interface PageContent {
  documentId: string;
  revision: string;
  page: number;
  text: string;
  complete: boolean;
  parts: Array<{
    blockId: string;
    text: string;
    target: SelectionTarget | null;
    start?: number;
    end?: number;
    scope: string;
  }>;
  objects: unknown[];
  diagnostics: unknown[];
  layout: unknown;
}
export interface AudioCue {
  seconds: number;
  documentId: string;
  revision: string;
  target: SelectionTarget;
}
export interface AudioState {
  loaded: boolean;
  paused: boolean;
  currentTime: number;
  duration: number | null;
  rate: number;
  cues: AudioCue[];
}
export interface AudioController {
  load(file: Blob): Promise<AudioState>;
  execute(request: {
    id: "audio.play" | "audio.pause" | "audio.seek" | "audio.rate";
    input?: { seconds?: number; rate?: number };
  }): Promise<AudioState>;
  snapshot(): AudioState;
  subscribe(listener: (state: AudioState) => void): () => void;
  setCues(cues: AudioCue[]): Promise<AudioState>;
  revealCue(index: number): Promise<AudioCue>;
  dispose(): void;
}
export interface EditorAutomation {
  audio: AudioController;
  version: string;
  context(): Promise<{
    documentId: string;
    revision: string;
    pages: number;
    info: unknown;
  }>;
  describe(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<unknown>;
  execute(request: CommandRequest): Promise<ActionReceipt>;
  readPage(input: {
    page: number;
    documentId?: string;
    expectedRevision?: string;
  }): Promise<PageContent>;
  undoAction(input: {
    requestId: string;
    documentId: string;
    expectedRevision: string;
  }): Promise<ActionReceipt>;
  schema(): unknown;
  journal(): unknown[];
  dispose(): void;
}
declare global {
  interface Window {
    webdoc?: EditorAutomation;
    /** @deprecated Use webdoc. */
    wordcraft?: EditorAutomation;
  }
}
