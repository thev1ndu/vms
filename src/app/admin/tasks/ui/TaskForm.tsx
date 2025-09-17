'use client';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import '@/components/components.css';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

type Category = {
  _id: string;
  name: string;
  description?: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'Failed to load');
  return j;
};

// ⬇️  New optional badge fields
const Schema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  mode: z.enum(['on-site', 'off-site']),
  category: z.string().min(2),
  levelRequirement: z.coerce.number().int().min(1).max(10),
  volunteersRequired: z.coerce.number().int().min(1),
  xpReward: z.coerce.number().int().min(1),
  status: z.enum(['draft', 'open', 'closed']).default('open'),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  badgeName: z.string().trim().min(2).max(60).optional(),
  badgeIcon: z.string().url().max(2048).optional(), // e.g. https://i.postimg.cc/...png
  badgeDescription: z.string().trim().max(500).optional(),
});

type FormState = z.infer<typeof Schema>;

export default function TaskForm() {
  // Fetch categories from API
  const { data: categoriesData, error: categoriesError } = useSWR<{
    categories: Category[];
  }>('/api/admin/categories', fetcher);

  const categories = categoriesData?.categories || [];

  const [data, setData] = useState<FormState>({
    title: '',
    description: '',
    mode: 'off-site',
    category: '',
    levelRequirement: 1,
    volunteersRequired: 1,
    xpReward: 50,
    status: 'open',
    startsAt: '',
    endsAt: '',
    badgeName: '',
    badgeIcon: '',
    badgeDescription: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Update selected category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      const firstCategory = categories[0];
      setSelectedCategoryId(firstCategory._id);
      setData((prev) => ({ ...prev, category: firstCategory._id }));
    }
  }, [categories, selectedCategoryId]);

  async function submit() {
    // Find the category name from the selected ID
    const selectedCategory = categories.find(
      (cat) => cat._id === selectedCategoryId
    );
    if (!selectedCategory) {
      alert('Please select a valid category');
      return;
    }

    const updatedData = { ...data, category: selectedCategory.name };

    const parsed = Schema.safeParse(updatedData);
    if (!parsed.success) {
      alert(parsed.error.issues.map((i) => i.message).join('\n'));
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...parsed.data,
        // convert datetime-local to Date
        startsAt: updatedData.startsAt
          ? new Date(updatedData.startsAt)
          : undefined,
        endsAt: updatedData.endsAt ? new Date(updatedData.endsAt) : undefined,
        // send empty strings as undefined
        badgeName: updatedData.badgeName?.trim()
          ? updatedData.badgeName.trim()
          : undefined,
        badgeIcon: updatedData.badgeIcon?.trim()
          ? updatedData.badgeIcon.trim()
          : undefined,
        badgeDescription: updatedData.badgeDescription?.trim()
          ? updatedData.badgeDescription.trim()
          : undefined,
      }),
    });
    const j = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      console.error('Task create failed:', j);
      return alert(
        j.error || (j.message ? `Create failed: ${j.message}` : 'Create failed')
      );
    }
    // reset some fields
    setData({
      ...data,
      title: '',
      description: '',
      badgeName: '',
      badgeIcon: '',
      badgeDescription: '',
    });
    if (categories.length > 0) {
      setSelectedCategoryId(categories[0]._id);
      setData((prev) => ({ ...prev, category: categories[0]._id }));
    }
    window.dispatchEvent(new Event('task:refresh'));
  }

  return (
    <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none">
      <CardContent className="grid gap-2">
        <div className="grid gap-1">
          <Label className="text-[#A5D8FF]">Title</Label>
          <Input
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            className="text-white rounded-none"
          />
        </div>

        <div className="grid gap-1">
          <Label className="text-[#A5D8FF]">Description</Label>
          <Textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            className="text-white rounded-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">Mode</Label>
            <Select
              value={data.mode}
              onValueChange={(v) => setData({ ...data, mode: v as any })}
            >
              <SelectTrigger className="rounded-none text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="on-site">On-site</SelectItem>
                <SelectItem value="off-site">Off-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">Category</Label>
            {categoriesError ? (
              <div className="text-red-500 text-sm">
                Error loading categories: {categoriesError.message}
              </div>
            ) : (
              <Select
                value={selectedCategoryId}
                onValueChange={(value) => {
                  setSelectedCategoryId(value);
                  setData({ ...data, category: value });
                }}
                disabled={categories.length === 0}
              >
                <SelectTrigger className="rounded-none text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">Level Requirement</Label>
            <Input
              type="number"
              min={1}
              max={10}
              step={1}
              value={data.levelRequirement}
              onChange={(e) => {
                const v = Number(e.target.value);
                setData({
                  ...data,
                  levelRequirement: Number.isNaN(v) ? 1 : clamp(v, 1, 10),
                });
              }}
              onBlur={(e) => {
                const v = Number(e.target.value);
                setData({
                  ...data,
                  levelRequirement: Number.isNaN(v) ? 1 : clamp(v, 1, 10),
                });
              }}
              className="text-white rounded-none"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">Volunteers Required</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={data.volunteersRequired}
              onChange={(e) => {
                const v = Number(e.target.value);
                setData({
                  ...data,
                  volunteersRequired: Number.isNaN(v) ? 1 : clamp(v, 1, 100000),
                });
              }}
              onBlur={(e) => {
                const v = Number(e.target.value);
                setData({
                  ...data,
                  volunteersRequired: Number.isNaN(v) ? 1 : clamp(v, 1, 100000),
                });
              }}
              className="text-white rounded-none"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">XP Reward</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={data.xpReward}
              onChange={(e) => {
                const v = Number(e.target.value);
                setData({
                  ...data,
                  xpReward: Number.isNaN(v) ? 1 : clamp(v, 1, 1000000),
                });
              }}
              onBlur={(e) => {
                const v = Number(e.target.value);
                setData({
                  ...data,
                  xpReward: Number.isNaN(v) ? 1 : clamp(v, 1, 1000000),
                });
              }}
              className="text-white rounded-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">Status</Label>
            <Select
              value={data.status}
              onValueChange={(v) => setData({ ...data, status: v as any })}
            >
              <SelectTrigger className="rounded-none text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">Starts At</Label>
            <Input
              type="datetime-local"
              value={data.startsAt}
              onChange={(e) => setData({ ...data, startsAt: e.target.value })}
              className="text-white rounded-none [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[#A5D8FF]">Ends At</Label>
            <Input
              type="datetime-local"
              value={data.endsAt}
              onChange={(e) => setData({ ...data, endsAt: e.target.value })}
              className="text-white rounded-none [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        {/* ⬇️ Optional Badge assignment */}
        <div className="grid gap-1">
          <Label className="text-[#A5D8FF]">Badge (optional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="grid gap-1 col-span-1 md:col-span-2">
              <Input
                placeholder="Badge name (shown on unlock)"
                value={data.badgeName || ''}
                onChange={(e) =>
                  setData({ ...data, badgeName: e.target.value })
                }
                className="text-white rounded-none"
              />
              <Input
                placeholder="Badge icon URL (https://...)"
                value={data.badgeIcon || ''}
                onChange={(e) =>
                  setData({ ...data, badgeIcon: e.target.value })
                }
                className="text-white rounded-none"
              />
              <Textarea
                placeholder="Badge description (optional)"
                value={data.badgeDescription || ''}
                onChange={(e) =>
                  setData({ ...data, badgeDescription: e.target.value })
                }
                className="min-h-[60px] text-white rounded-none"
              />
            </div>
            <div className="flex items-center justify-center mt-2 md:mt-0">
              {data.badgeIcon ? (
                // simple preview; keep small
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.badgeIcon}
                  alt="Badge preview"
                  className="h-12 w-12 rounded border object-contain"
                />
              ) : (
                <div className="text-xs text-muted-foreground">No icon</div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank to create a task without a badge. Description will
            default to "Badge awarded for completing [task title]" if not
            provided.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none w-full sm:w-auto"
          >
            {submitting ? 'Creating…' : 'Create Task'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
