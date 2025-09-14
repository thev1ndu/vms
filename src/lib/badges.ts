import Badge from '@/models/Badge';
import User from '@/models/User';

export async function grantBadgeBySlug(authUserId: string, slug: string) {
  try {
    console.log(`Attempting to grant badge '${slug}' to user ${authUserId}`);
    const B = await Badge;
    const badge = (await (await B).findOne({ slug }, { _id: 1 }).lean()) as {
      _id: any;
    } | null;

    if (!badge?._id) {
      console.warn(`Badge with slug '${slug}' not found in database`);
      return false;
    }

    console.log(`Found badge '${slug}' with ID: ${badge._id}`);

    const U = await User;
    const res = (await (
      await U
    ).updateOne({ authUserId }, { $addToSet: { badges: badge._id } })) as {
      modifiedCount?: number;
    };

    const wasNewlyAdded = !!res.modifiedCount;
    if (wasNewlyAdded) {
      console.log(`Badge '${slug}' awarded to user ${authUserId}`);
    }

    return wasNewlyAdded; // true if newly added
  } catch (error) {
    console.error(
      `Error granting badge '${slug}' to user ${authUserId}:`,
      error
    );
    return false;
  }
}
