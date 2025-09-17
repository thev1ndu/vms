import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Task from '@/models/Task';
import Participation from '@/models/Participation';

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

    // Get task IDs that the user has already applied to
    const appliedTaskIds = await Participation.find(
      { authUserId },
      { taskId: 1 }
    ).lean();

    const appliedTaskIdSet = new Set(
      appliedTaskIds.map((participation: any) => participation.taskId)
    );

    // Find tasks that match user's category preferences and level
    // Exclude tasks that the user has already applied to
    const tasks = await Task.find({
      status: 'open',
      category: {
        $in: userPreferences.map((cat: string) => cat.toLowerCase()),
      },
      levelRequirement: { $lte: userLevel },
      _id: { $nin: Array.from(appliedTaskIdSet) }, // Exclude already applied tasks
    })
      .sort({ startsAt: 1, createdAt: -1 })
      .lean();

    return Response.json({ recommendedTasks: tasks });
  } catch (error) {
    console.error('Error fetching recommended tasks:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
