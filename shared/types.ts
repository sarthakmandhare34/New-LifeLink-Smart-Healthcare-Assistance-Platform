// =========================================================================================
// SHARED UNIFIED TYPE EXPORTS
// Central re-export nexus providing database entity schemas and HTTP error classes across frontend and backend.
// =========================================================================================

export type * from "../database/schema";                                                         // Re-export all database table schemas and Zod inferred types
export * from "./_core/errors";                                                                 // Re-export common HTTP error definitions
