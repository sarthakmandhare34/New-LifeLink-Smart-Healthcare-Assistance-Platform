import { createTRPCReact } from "@trpc/react-query";                                    // React Query hooks adapter for tRPC
import type { AppRouter } from "../../../backend/routers";                                  // Backend router type definition

// Export fully typed React hooks (e.g. trpc.patientAuth.login.useMutation)
export const trpc = createTRPCReact<AppRouter>();
