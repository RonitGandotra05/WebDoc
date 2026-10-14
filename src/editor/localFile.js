import { DOCX_TYPE } from "./files";
export const canSaveToDisk = () =>
  typeof window.showSaveFilePicker === "function";
export const canOpenFromDisk = () =>
  typeof window.showOpenFilePicker === "function";
const types = [
  { description: "Word document", accept: { [DOCX_TYPE]: [".docx"] } },
];
export async function pickSaveFile(name) {
  if (!canSaveToDisk())
    throw new Error(
      "This browser cannot overwrite local files. Use Chrome or Edge, or Export DOCX to download a copy. Browser autosave still works.",
    );
  return window.showSaveFilePicker({
    suggestedName: `${name.replace(/[\\/:*?"<>|]/g, "_")}.docx`,
    types,
    excludeAcceptAllOption: true,
  });
}
export async function pickOpenFile() {
  const [handle] = await window.showOpenFilePicker({
    types,
    multiple: false,
    excludeAcceptAllOption: true,
  });
  return handle.getFile();
}
export async function writeLocalDocx(handle, blob) {
  if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted")
    throw new Error(
      "Local file access needs to be reconnected. Your browser draft is still saved.",
    );
  let writable;
  try {
    writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    try {
      await writable?.abort();
    } catch {
      /* Keep the original write failure. */
    }
    throw error;
  }
}
