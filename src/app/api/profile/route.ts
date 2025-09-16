import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import { grantBadgeBySlug } from '@/lib/badges';

export const runtime = 'nodejs';

const Body = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters long')
    .max(16, 'Display name must be 16 characters or less')
    .transform((val) => val.trim())
    .refine((val) => val.length >= 2, {
      message: 'Display name must be at least 2 characters long',
    })
    .refine((val) => val.length <= 16, {
      message: 'Display name must be 16 characters or less',
    })
    .refine((val) => !val.includes(' '), {
      message: 'Display name cannot contain spaces',
    })
    .optional(),
  email: z.string().email().optional(),
  alias: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(1000).optional(),
});

function isProfileComplete(u: any) {
  // Adjust rule as needed:
  return !!(
    u?.displayName &&
    u?.email &&
    u?.volunteer?.alias &&
    u?.volunteer?.avatarUrl
  );
}

export async function POST(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success)
    return Response.json({ error: 'Invalid body' }, { status: 400 });

  const { displayName, email, alias, avatarUrl, bio } = parsed.data;

  const U = await User;
  await (
    await U
  ).updateOne(
    { authUserId },
    {
      $set: {
        ...(displayName ? { displayName } : {}),
        ...(email ? { email } : {}),
        ...(bio ? { 'volunteer.bio': bio } : {}),
        ...(alias ? { 'volunteer.alias': alias } : {}),
        ...(avatarUrl ? { 'volunteer.avatarUrl': avatarUrl } : {}),
      },
      $setOnInsert: { xp: 0, level: 1, badges: [], authUserId },
    },
    { upsert: true }
  );

  const after = await (await U)
    .findOne({ authUserId }, { displayName: 1, email: 1, volunteer: 1 })
    .lean();

  // Always check profile completion, not just after updates
  if (isProfileComplete(after)) {
    await grantBadgeBySlug(authUserId, 'profile-complete');
  }

  return Response.json({ ok: true });
}
