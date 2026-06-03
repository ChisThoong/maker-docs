import { MongoClient, Db } from "mongodb";

const uri =
  process.env.DATABASE_URL ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017";

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

/** Shared MongoClient promise — used by the NextAuth MongoDB adapter. */
export { clientPromise };

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
  // Use db name from env if provided, else fall back to the one in the URI.
  return process.env.MONGODB_DB ? c.db(process.env.MONGODB_DB) : c.db();
}

/** All collections created by this project are prefixed with `docs_`. */
export const COL = {
  documents: "docs_documents",
  /** Per-user profile prefs (custom avatar, display name, workspaceRole…). */
  profiles: "docs_profiles",
  /** Access-control entries (one per grant) keyed by docId. */
  acl: "docs_acl",
  /** In-app notifications (share alerts, etc.). */
  notifications: "docs_notifications",
  /** Document update / create activity feed. */
  activity: "docs_activity",
} as const;
