import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Task from '@/models/Task';

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);

  try {
    // Get user's category preferences
    const user = await User.findOne(
      { authUserId },
      { categoryPreferences: 1, level: 1 }
    ).lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userPreferences = user.categoryPreferences || [];
    const userLevel = user.level || 1;

    // If user has no category preferences, return empty array
    if (userPreferences.length === 0) {
      return Response.json({ recommendedTasks: [] });
    }

    // Find tasks that match user's category preferences and level
    const tasks = await Task.find({
      status: 'open',
      category: {
        $in: userPreferences.map((cat: string) => cat.toLowerCase()),
      },
      levelRequirement: { $lte: userLevel },
    })
      .sort({ startsAt: 1, createdAt: -1 })
      .lean();

    return Response.json({ recommendedTasks: tasks });
  } catch (error) {
    console.error('Error fetching recommended tasks:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
