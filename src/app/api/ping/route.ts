import { requireApproved } from '@/lib/guards';
import { touchDailyStreak } from '@/lib/streak';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);

  try {
    const streak = await touchDailyStreak(authUserId);
    return Response.json({
      ok: true,
      streak,
      message:
        streak.count === 1 ? 'Welcome back!' : `Streak: ${streak.count} days`,
    });
  } catch (error) {
    console.error('Daily ping error:', error);
    return Response.json(
      {
        error: 'Failed to update streak',
      },
      { status: 500 }
    );
  }
}
