import { z } from 'zod';
import Task from '@/models/Task';
import Badge from '@/models/Badge';
import { requireAdmin, requireApproved } from '@/lib/guards';
import { makeQRDataURL } from '@/lib/qr';

/** ---------- GET /api/tasks ----------
 * Query params:
 *  - status?: "open" | "draft" | "closed" (default "open")
 *  - mode?: "on-site" | "off-site"
 *  - category?: string
 *  - minLevel?: number   // applied ONLY if provided
 */
export async function GET(req: Request) {
  // Volunteers must be approved to list tasks
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') as 'on-site' | 'off-site' | null;
  const category = url.searchParams.get('category');
  const status = (url.searchParams.get('status') || 'open') as
    | 'open'
    | 'draft'
    | 'closed';
  const minLevelParam = url.searchParams.get('minLevel'); // only apply when present

  const q: any = { status };
  if (mode) q.mode = mode;
  if (category) q.category = category.toLowerCase();
  if (minLevelParam !== null) {
    const minLevel = Number(minLevelParam);
    if (!Number.isNaN(minLevel)) {
      q.levelRequirement = { $lte: minLevel };
    }
  }

  const tasks = await Task.find(q).sort({ startsAt: 1, createdAt: -1 }).lean();
  return Response.json({ tasks });
}

/** ---------- POST /api/tasks ----------
 * Admin creates task (on-site will auto-generate QR).
 * Now supports optional badge creation: { badgeName?, badgeIcon?, badgeDescription? }
 */
const Body = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  mode: z.enum(['on-site', 'off-site']),
  category: z.string().min(2),
  levelRequirement: z.number().int().min(1).max(10),
  volunteersRequired: z.number().int().min(1),
  xpReward: z.number().int().min(1),
  status: z.enum(['draft', 'open', 'closed']).default('open'),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  // ⬇️ new optional badge inputs
  badgeName: z.string().trim().min(2).max(60).optional(),
  badgeIcon: z.string().url().max(2048).optional(), // direct URL like https://i.postimg.cc/...
  badgeDescription: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  let json: any;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  // Coerce dates if they came as strings
  if (json?.startsAt && typeof json.startsAt === 'string')
    json.startsAt = new Date(json.startsAt);
  if (json?.endsAt && typeof json.endsAt === 'string')
    json.endsAt = new Date(json.endsAt);

  // Normalize empty strings → undefined for badge fields
  if (typeof json.badgeName === 'string' && json.badgeName.trim() === '')
    json.badgeName = undefined;
  if (typeof json.badgeIcon === 'string' && json.badgeIcon.trim() === '')
    json.badgeIcon = undefined;
  if (
    typeof json.badgeDescription === 'string' &&
    json.badgeDescription.trim() === ''
  )
    json.badgeDescription = undefined;

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Get creator information from session
  const session = gate.session;
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const creatorId = session.user.id;
  const creatorEmail = session.user.email;

  // 1) Create the task
  const doc = await Task.create({
    title: data.title,
    description: data.description,
    mode: data.mode,
    category: String(data.category).toLowerCase(),
    levelRequirement: data.levelRequirement,
    volunteersRequired: data.volunteersRequired,
    volunteersAssigned: [],
    xpReward: data.xpReward,
    status: data.status,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    createdBy: creatorId,
    createdByEmail: creatorEmail,
  });

  // 2) If on-site, generate QR
  if (doc.mode === 'on-site') {
    const payload = { v: 1, kind: 'TASK', taskId: String(doc._id) };
    const qrImageDataUrl = await makeQRDataURL(payload);
    doc.qrData = JSON.stringify(payload);
    doc.qrImageDataUrl = qrImageDataUrl;
  }

  // 3) If badge fields provided, create a Badge row and link it
  if (data.badgeName || data.badgeIcon) {
    const slug = `task-${String(doc._id)}`; // unique per task
    const B = await Badge;
    const badge = await (
      await B
    ).create({
      name: data.badgeName || 'Task Badge',
      slug,
      icon: data.badgeIcon,
      description:
        data.badgeDescription || `Badge awarded for completing "${data.title}"`,
    } as any);
    doc.badgeId = badge._id as any;
  }

  await doc.save();

  return Response.json({ ok: true, task: doc.toObject() });
}
