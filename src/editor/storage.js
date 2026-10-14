const DB_NAME = "wordcraft-local";
export async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function drafts(action, value) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        "documents",
        ["put", "delete"].includes(action) ? "readwrite" : "readonly",
      );
      const store = tx.objectStore("documents");
      const request =
        action === "put"
          ? store.put(value)
          : action === "delete"
            ? store.delete(value)
            : action === "get"
              ? store.get(value)
              : store.getAll();
      let result;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error("Local save was interrupted."));
    });
  } finally {
    db.close();
  }
}
