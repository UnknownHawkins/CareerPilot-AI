import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { users, resumes, interviewSessions, jobMatches, roadmaps, subscriptions, activities } from '../models/schema';
import { eq, or, like, desc, count } from 'drizzle-orm';
import { successResponse, ApiError } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Protect all admin routes
router.use(authenticate, authorize('admin'));

// GET /api/v1/admin/stats - get platform analytics
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const [{ count: totalUsers }] = await db.select({ count: count() }).from(users);
    const [{ count: totalResumes }] = await db.select({ count: count() }).from(resumes);
    const [{ count: totalInterviews }] = await db.select({ count: count() }).from(interviewSessions);
    const [{ count: totalJobs }] = await db.select({ count: count() }).from(jobMatches);
    const [{ count: totalRoadmaps }] = await db.select({ count: count() }).from(roadmaps);
    const [{ count: totalSubscriptions }] = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'active'));

    const [{ count: freeUsers }] = await db.select({ count: count() }).from(users).where(eq(users.role, 'free'));
    const [{ count: proUsers }] = await db.select({ count: count() }).from(users).where(eq(users.role, 'pro'));
    const [{ count: enterpriseUsers }] = await db.select({ count: count() }).from(users).where(eq(users.role, 'enterprise'));
    const [{ count: adminUsers }] = await db.select({ count: count() }).from(users).where(eq(users.role, 'admin'));

    const recentActivities = await db.select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(10);

    successResponse(res, {
      totalUsers,
      totalResumes,
      totalInterviews,
      totalJobs,
      totalRoadmaps,
      totalSubscriptions,
      plans: {
        free: freeUsers,
        pro: proUsers,
        enterprise: enterpriseUsers,
        admin: adminUsers,
      },
      recentActivities,
    }, 'Admin statistics retrieved successfully');
  })
);

// GET /api/v1/admin/users - list paginated users with search
router.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    let query = db.select().from(users).$dynamic();
    
    if (search) {
      query = query.where(or(
        like(users.email, `%${search}%`),
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`)
      ));
    }

    const [{ count: total }] = await db.select({ count: count() }).from(users);

    const userList = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(skip);

    successResponse(
      res,
      userList,
      'Users retrieved successfully',
      200,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  })
);

// PUT /api/v1/admin/users/:id/role - update user role
router.put(
  '/users/:id/role',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['free', 'pro', 'enterprise', 'admin'].includes(role)) {
      throw ApiError.badRequest('Invalid role name');
    }

    if (id === req.user!._id.toString() && role !== 'admin') {
      throw ApiError.badRequest('You cannot demote yourself from Admin status');
    }

    const [user] = await db.update(users)
      .set({ role })
      .where(eq(users._id, id))
      .returning();

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    successResponse(res, user, 'User role updated successfully');
  })
);

// DELETE /api/v1/admin/users/:id - delete a user and all their records
router.delete(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (id === req.user!._id.toString()) {
      throw ApiError.badRequest('You cannot delete your own admin account');
    }

    const [user] = await db.delete(users).where(eq(users._id, id)).returning();
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await Promise.all([
      db.delete(resumes).where(eq(resumes.userId, id)),
      db.delete(interviewSessions).where(eq(interviewSessions.userId, id)),
      db.delete(jobMatches).where(eq(jobMatches.userId, id)),
      db.delete(roadmaps).where(eq(roadmaps.userId, id)),
      db.delete(activities).where(eq(activities.userId, id)),
      db.delete(subscriptions).where(eq(subscriptions.userId, id)),
    ]);

    successResponse(res, null, 'User and all related records deleted successfully');
  })
);

export default router;
