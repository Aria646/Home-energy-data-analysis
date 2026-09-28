// Auth + local persistence layer.
// Storage: IndexedDB (db name "energySim", stores "users" and "records").

const DB_NAME = "energySim";
const DB_VERSION = 1;
const STORE_USERS = "users";
const STORE_RECORDS = "records";
const SESSION_KEY = "energySim.session";

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_USERS)) {
                db.createObjectStore(STORE_USERS, { keyPath: "username" });
            }
            if (!db.objectStoreNames.contains(STORE_RECORDS)) {
                const s = db.createObjectStore(STORE_RECORDS, {
                    keyPath: "id",
                    autoIncrement: true,
                });
                s.createIndex("username", "username", { unique: false });
                s.createIndex("timestamp", "timestamp", { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

function tx(storeName, mode) {
    return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function randomSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
    return sha256(`${salt}:${password}`);
}

async function registerUser(username, password) {
    username = String(username || "").trim();
    if (username.length < 2) throw new Error("Username must be at least 2 characters.");
    if (!password || password.length < 4) throw new Error("Password must be at least 4 characters.");

    const store = await tx(STORE_USERS, "readwrite");
    const existing = await reqToPromise(store.get(username));
    if (existing) throw new Error("Username already exists.");

    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);
    await reqToPromise(
        store.add({ username, salt, passwordHash, createdAt: Date.now() }),
    );
    return { username };
}

async function loginUser(username, password) {
    username = String(username || "").trim();
    const store = await tx(STORE_USERS, "readonly");
    const user = await reqToPromise(store.get(username));
    if (!user) throw new Error("User not found.");
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) throw new Error("Incorrect password.");
    sessionStorage.setItem(SESSION_KEY, username);
    return { username };
}

function logoutUser() {
    sessionStorage.removeItem(SESSION_KEY);
}

function currentUser() {
    return sessionStorage.getItem(SESSION_KEY) || null;
}

async function saveRecord(record) {
    const username = currentUser();
    if (!username) return null;
    const store = await tx(STORE_RECORDS, "readwrite");
    const id = await reqToPromise(
        store.add({ ...record, username, timestamp: Date.now() }),
    );
    return id;
}

async function listRecords(username) {
    username = username || currentUser();
    if (!username) return [];
    const store = await tx(STORE_RECORDS, "readonly");
    const idx = store.index("username");
    const records = await reqToPromise(idx.getAll(username));
    return records.sort((a, b) => b.timestamp - a.timestamp);
}

async function deleteRecord(id) {
    const store = await tx(STORE_RECORDS, "readwrite");
    await reqToPromise(store.delete(id));
}

async function exportAll() {
    const username = currentUser();
    if (!username) throw new Error("Login required to export.");
    const records = await listRecords(username);
    const payload = {
        format: "energy-sim-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        username,
        records: records.map(({ id, username: _u, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `energy-sim-backup-${username}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function importFromFile(file) {
    const username = currentUser();
    if (!username) throw new Error("Login required to import.");
    const text = await file.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("Invalid JSON file.");
    }
    if (data.format !== "energy-sim-backup" || !Array.isArray(data.records)) {
        throw new Error("Unrecognised backup format.");
    }
    const store = await tx(STORE_RECORDS, "readwrite");
    let count = 0;
    for (const r of data.records) {
        await reqToPromise(store.add({ ...r, username, timestamp: r.timestamp || Date.now() }));
        count += 1;
    }
    return count;
}
