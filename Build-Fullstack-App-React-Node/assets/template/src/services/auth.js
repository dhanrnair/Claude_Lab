import { createAuthClient } from 'better-auth/react';

// Same origin as the app; the server mounts Better Auth at /api/auth.
export const authClient = createAuthClient({ basePath: '/api/auth' });
export const { useSession, signIn, signUp, signOut } = authClient;
