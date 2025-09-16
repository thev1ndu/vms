import { z } from 'zod';
import Task from '@/models/Task';
import { requireAdmin } from '@/lib/guards';
import { makeQRDataURL } from '@/lib/qr';

const Update = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  mode: z.enum(['on-site', 'off-site']).optional(),
  category: z.string().min(2).optional(),
  levelRequirement: z.number().int().min(1).max(10).optional(),
  volunteersRequired: z.number().int().min(1).optional(),
  xpReward: z.number().int().min(1).optional(),
  status: z.enum(['draft', 'open', 'closed']).optional(),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  // Coerce dates if strings
  if (body?.startsAt && typeof body.startsAt === 'string')
    body.startsAt = new Date(body.startsAt);
  if (body?.endsAt && typeof body.endsAt === 'string')
    body.endsAt = new Date(body.endsAt);

  const parsed = Update.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const { id } = await params;
  const task = await Task.findById(id);
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

  const prevMode = task.mode;

  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.mode !== undefined) task.mode = data.mode;
  if (data.category !== undefined)
    task.category = String(data.category).toLowerCase();
  if (data.levelRequirement !== undefined)
    task.levelRequirement = data.levelRequirement;
  if (data.volunteersRequired !== undefined)
    task.volunteersRequired = data.volunteersRequired;
  if (data.xpReward !== undefined) task.xpReward = data.xpReward;
  if (data.status !== undefined) task.status = data.status;
  if (data.startsAt !== undefined) task.startsAt = data.startsAt;
  if (data.endsAt !== undefined) task.endsAt = data.endsAt;

  // QR behavior on mode change
  if (prevMode !== task.mode) {
    if (task.mode === 'on-site') {
      const payload = { v: 1, kind: 'TASK', taskId: String(task._id) };
      task.qrData = JSON.stringify(payload);
      task.qrImageDataUrl = await makeQRDataURL(payload);
    } else {
      // off-site → clear QR artifacts
      task.qrData = undefined as any;
      task.qrImageDataUrl = undefined as any;
    }
  }

  await task.save();
  return Response.json({ ok: true, task: task.toObject() });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await Task.findById(id).lean();
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  return Response.json({ task });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const res = await Task.deleteOne({ _id: id });
  if (!res.deletedCount)
    return Response.json({ error: 'Task not found' }, { status: 404 });
  return Response.json({ ok: true });
}
