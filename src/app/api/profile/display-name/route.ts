import { requireApproved } from '@/lib/guards';
import User from '@/models/User';

/**
 * GET /api/profile/display-name
 * Get current user's display name info
 */
export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const authUserId = String(gate.session!.user.id);

    // Get user from app collection
    const user = await User.findOne(
      { authUserId },
      { displayName: 1, updatedAt: 1 }
    ).lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Check admin status from session
    const role = (gate.session!.user as any).role || 'volunteer';
    const status = (gate.session!.user as any).status || 'pending';
    const isAdmin = role === 'admin' && status === 'approved';

    return Response.json({
      displayName: user.displayName || null,
      canUpdate: true, // Display names can always be updated
      isAdmin,
      lastUpdateTime: user.updatedAt || null,
      nextUpdateTime: null, // No cooldown for display names
    });
  } catch (error) {
    console.error('Error fetching display name info:', error);
    return Response.json(
      { error: 'Failed to fetch display name info' },
      { status: 500 }
    );
  }
}
