import { Router } from 'express';
import {
  getAllReviews,
  getReview,
  getCourseSummary,
  createReview,
  updateReview,
  deleteReview
} from '../controllers/reviewController.js';

const router = Router();

// TODO: wire up the routes described in README.md section 3.

// 1. Unscoped/Static route MUST be registered before parameterized /:id route
// GET /api/reviews/summary?courseCode=CS101
router.get('/summary', getCourseSummary);

// 2. Collection routes
// GET /api/reviews
router.get('/', getAllReviews);

// POST /api/reviews
router.post('/', createReview);

// 3. Item routes (parameterized with :id)
// GET /api/reviews/:id
router.get('/:id', getReview);

// PATCH /api/reviews/:id
router.patch('/:id', updateReview);

// DELETE /api/reviews/:id
router.delete('/:id', deleteReview);

export default router;