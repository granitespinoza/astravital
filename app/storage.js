// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
const databaseName = 'astravital-dashboard';

export function openStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('events', {keyPath: 'id'});
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Local storage is blocked by another tab.'));
  });
}

export function readEvents(database) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('events');
    const request = transaction.objectStore('events').getAll();
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function appendEvents(database, events) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('events', 'readwrite');
    const store = transaction.objectStore('events');
    let conflict;

    for (const event of events) {
      const existing = store.get(event.id);
      existing.onsuccess = () => {
        if (!existing.result) {
          store.add(event);
        } else if (JSON.stringify(existing.result) !== JSON.stringify(event)) {
          conflict = new Error('An existing record has different contents.');
          transaction.abort();
        }
      };
    }

    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(conflict ?? transaction.error);
  });
}
