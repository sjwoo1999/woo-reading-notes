import { getSessionUser, isAdmin } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  const admin = isAdmin(user?.email ?? null);
  return Response.json({ authenticated: !!user, email: user?.email ?? undefined, isAdmin: admin });
}
