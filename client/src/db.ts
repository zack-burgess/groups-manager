import initSqlJs, { type Database } from "sql.js";

const DB_NAME = "groups-manager-db";
const DB_STORE = "database";
const DB_KEY = "main";

let db: Database | null = null;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const req = store.get(DB_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const req = store.put(data, DB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function createTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      organization TEXT NOT NULL,
      password_hash TEXT,
      suspended_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      open_membership INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      added_by_id INTEGER NOT NULL REFERENCES users(id),
      is_admin INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      removed_by_id INTEGER,
      removed_at TEXT
    )
  `);
}

function insertUser(database: Database, name: string, email: string, title: string, org: string): number {
  database.run(
    "INSERT INTO users (name, email, title, organization) VALUES (?, ?, ?, ?)",
    [name, email, title, org]
  );
  return database.exec("SELECT last_insert_rowid() as id")[0].values[0][0] as number;
}

function insertGroup(
  database: Database,
  name: string,
  description: string,
  ownerId: number,
  openMembership: boolean,
  members: { userId: number; addedById: number; isAdmin: boolean }[]
): void {
  database.run(
    "INSERT INTO groups (name, description, owner_id, open_membership) VALUES (?, ?, ?, ?)",
    [name, description, ownerId, openMembership ? 1 : 0]
  );
  const groupId = database.exec("SELECT last_insert_rowid() as id")[0].values[0][0] as number;
  for (const m of members) {
    database.run(
      "INSERT INTO group_members (group_id, user_id, added_by_id, is_admin) VALUES (?, ?, ?, ?)",
      [groupId, m.userId, m.addedById, m.isAdmin ? 1 : 0]
    );
  }
}

function seed(database: Database) {
  const zack = insertUser(database, "Zack Burgess", "zack.burgess@hey.com", "Product Manager & Builder", "Research and Development");
  const jane = insertUser(database, "Jane Smith", "jane.smith@company.com", "Designer", "Research and Development");
  const alex = insertUser(database, "Alex Chen", "alex.chen@company.com", "Engineer", "Research and Development");
  const maria = insertUser(database, "Maria Garcia", "maria.garcia@company.com", "Engineering Manager", "Research and Development");
  const sam = insertUser(database, "Sam Patel", "sam.patel@company.com", "Product Manager", "Research and Development");
  const lisa = insertUser(database, "Lisa Wong", "lisa.wong@company.com", "Recruiter", "Human Resources");
  const nina = insertUser(database, "Nina Torres", "nina.torres@company.com", "Hiring Manager", "Human Resources");
  const tom = insertUser(database, "Tom Rivera", "tom.rivera@company.com", "Marketing Manager", "Marketing");
  const emma = insertUser(database, "Emma Johnson", "emma.johnson@company.com", "Account Executive", "Sales");
  const david = insertUser(database, "David Kim", "david.kim@company.com", "Analyst", "Finance");
  const rachel = insertUser(database, "Rachel Lee", "rachel.lee@company.com", "Analyst", "Operations");
  const priya = insertUser(database, "Priya Sharma", "priya.sharma@company.com", "UX Researcher", "Research and Development");

  const everyone = [zack, jane, alex, maria, sam, lisa, nina, tom, emma, david, rachel, priya];

  // all-employees
  insertGroup(database, "all-employees", "Company-wide group for all employees.", zack, true,
    everyone.map((u) => ({ userId: u, addedById: zack, isAdmin: u === zack }))
  );

  // R&D
  insertGroup(database, "R&D", "Research and Development team discussions.", zack, true,
    [zack, jane, alex, maria, sam, priya].map((u) => ({ userId: u, addedById: zack, isAdmin: u === zack }))
  );

  // Designers
  insertGroup(database, "Designers", "Design team coordination and reviews.", jane, false,
    [jane, zack, priya].map((u) => ({ userId: u, addedById: jane, isAdmin: u === jane }))
  );

  // Engineers
  insertGroup(database, "Engineers", "Engineering discussions, code reviews, and architecture.", maria, false,
    [maria, alex, zack].map((u) => ({ userId: u, addedById: maria, isAdmin: u === maria }))
  );

  // Product Managers
  insertGroup(database, "Product Managers", "Product strategy, roadmaps, and prioritization.", zack, false,
    [zack, sam].map((u) => ({ userId: u, addedById: zack, isAdmin: u === zack }))
  );

  // Marketing
  insertGroup(database, "Marketing", "Marketing campaigns, strategy, and content.", tom, true,
    [tom, emma].map((u) => ({ userId: u, addedById: tom, isAdmin: u === tom }))
  );

  // Recruiting
  insertGroup(database, "Recruiting", "Hiring pipeline, candidate discussions, and interview coordination.", lisa, false,
    [lisa, nina].map((u) => ({ userId: u, addedById: lisa, isAdmin: u === lisa }))
  );

  // A-Team
  insertGroup(database, "A-Team", "Hiring top, collaborative talent. You know the ones.", zack, false,
    [{ userId: zack, addedById: zack, isAdmin: true }]
  );
}

export async function initDatabase(): Promise<void> {
  if (db) return;

  const SQL = await initSqlJs({
    locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
  });

  const saved = await loadFromIDB();
  if (saved) {
    db = new SQL.Database(saved);
    db.run("PRAGMA foreign_keys = ON");
  } else {
    db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON");
    createTables(db);
    seed(db);
    await saveDb();
  }
}

export async function resetDatabase(): Promise<void> {
  if (!db) return;
  db.run("DROP TABLE IF EXISTS group_members");
  db.run("DROP TABLE IF EXISTS groups");
  db.run("DROP TABLE IF EXISTS users");
  createTables(db);
  seed(db);
  await saveDb();
}

export async function saveDb(): Promise<void> {
  if (!db) return;
  const data = db.export();
  await saveToIDB(new Uint8Array(data));
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}
