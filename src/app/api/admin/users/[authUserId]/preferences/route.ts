import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Category from '@/models/Category';
import { z } from 'zod';
import { Types } from 'mongoose';

const UpdatePreferencesSchema = z.object({
  categoryPreferences: z.array(z.string()).optional(),
});

// GET /api/admin/users/[authUserId]/preferences - Get user preferences
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role || 'volunteer';
    const status = (session.user as any).status || 'pending';

    if (status !== 'approved' || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { authUserId } = await params;
    let user = await User.findOne({ authUserId });
    if (!user) {
      // Create user if doesn't exist
      user = new User({
        authUserId,
        xp: 0,
        level: 1,
        categoryPreferences: [],
      });
      await user.save();
    }

    // Get all available categories
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      user: {
        authUserId: user.authUserId,
        displayName: user.displayName,
        categoryPreferences: user.categoryPreferences || [],
      },
      availableCategories: categories,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[authUserId]/preferences - Update user preferences
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role || 'volunteer';
    const status = (session.user as any).status || 'pending';

    if (status !== 'approved' || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { authUserId } = await params;
    const body = await request.json();
    const validatedData = UpdatePreferencesSchema.parse(body);

    let user = await User.findOne({ authUserId });
    if (!user) {
      // Create user if doesn't exist
      user = new User({
        authUserId,
        xp: 0,
        level: 1,
        categoryPreferences: [],
      });
    }

    // Validate that all provided category preferences exist and are active
    if (validatedData.categoryPreferences) {
      const validCategories = await Category.find({
        name: { $in: validatedData.categoryPreferences },
        isActive: true,
      });

      if (validCategories.length !== validatedData.categoryPreferences.length) {
        return NextResponse.json(
          { error: 'One or more category preferences are invalid or inactive' },
          { status: 400 }
        );
      }
    }

    // Update user preferences
    if (validatedData.categoryPreferences !== undefined) {
      console.log(
        'Setting preferences for user:',
        authUserId,
        'to:',
        validatedData.categoryPreferences
      );
      user.categoryPreferences = validatedData.categoryPreferences;
    }

    await user.save();
    console.log(
      'User saved successfully. Final preferences:',
      user.categoryPreferences
    );

    return NextResponse.json({
      user: {
        authUserId: user.authUserId,
        displayName: user.displayName,
        categoryPreferences: user.categoryPreferences || [],
      },
      message: 'User preferences updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
