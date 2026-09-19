import { Review } from '../models/Review.js';
import joi from 'joi';
import mongoose from 'mongoose';

// TODO: write a validation schema for create/update per README.md section 2.
const createReviewSchema = joi.object({
  courseCode: joi.string().trim().required(),
  rating: joi.number().integer().min(1).max(5).required(),
  comment: joi.string().trim().allow(''),
  reviewedBy: joi.string().hex().length(24).optional()
});

const updateReviewSchema = joi.object({
  courseCode: joi.string().trim().optional(),
  rating: joi.number().integer().min(1).max(5).optional(),
  comment: joi.string().trim().allow('').optional(),
  reviewedBy: joi.string().hex().length(24).optional()
}).min(1); // At least one field must be provided for update

// GET /api/reviews
// TODO: implement per README.md section 3.
export async function getAllReviews(req, res, next) {
  try {
    const reviews = (await Review.find()
    //Makes it so it actually returns the user object instead of just the id. And also we make sure we don't pull the password by specifying the fields we want to return
    .populate('reviewedBy', 'name email'))
    //To make sure that the most recent review is first
    .sort({createdAt: -1}); 

    //It sends a response with a status code of 200 (OK) and the reviews in JSON format.
    res.status(200).json(reviews);
  } catch (err) { next(err); }
}

// GET /api/reviews/:id
// TODO: implement per README.md sections 3 and 5.
export async function getReview(req, res, next) {
  try {
    //To get the id from the request parameters and stores it in a variable "id"
    const {id} = req.params;

    //Validate that the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    //Makes it so it actually returns the user object instead of just the id. And also we make sure we don't pull the password by specifying the fields we want to return
    const review = await Review.findById(id).populate('reviewedBy', 'name email');
    
    if (!review) {
      // If the review is not found, it sends a response with a status code of 404 (Not Found) and an error message in JSON format.
      return res.status(404).json({ error: 'Review not found' });
    }

    //If the review is found, it sends a response with a status code of 200 (OK) and the review in JSON format.
    res.status(200).json(review);
  } catch (err) { next(err); }
}

// GET /api/reviews/summary?courseCode=CS101
// TODO: implement per README.md section 4.
// GET /api/reviews/summary?courseCode=CS101
// TODO: implement per README.md section 4.
export async function getCourseSummary(req, res, next) {
  try {
    //Getting the courseCode query parameter from the request object and storing it in a variable "courseCode"
    const { courseCode } = req.query;

    // Check if the courseCode query parameter was provided
    if (!courseCode) {
      return res.status(400).json({ error: 'courseCode query parameter is required' });
    }

    // Normalize the course code to ensure consistent matching (e.g., trim whitespace and convert to uppercase)
    const normalizedCode = courseCode.trim().toUpperCase();

    // Perform MongoDB aggregation pipeline to compute average rating and review count for the specified course code
    const summary = await Review.aggregate([
      // Stage 1: Filter documents matching the requested courseCode
      //$match acts like a WHERE query in SQL, filtering the documents in the collection to only those that match the specified courseCode. 
      // In this case, it filters the reviews to only include those that have a courseCode field equal to the normalizedCode variable.
      { $match: { courseCode: normalizedCode } }, 

      // Stage 2: Group matching documents and compute average rating and count
      {
        $group: {
          _id: '$courseCode', //_id is used to group the documents by courseCode. Each unique courseCode will result in a separate group of documents.
          averageRating: { $avg: '$rating' }, //$avg is used to compute average rating for the group of documents that have the same courseCode. It calculates the average of the rating field across all matching reviews.
          reviewCount: { $sum: 1 } //$sum is used to count the number of reviews for the specified courseCode. It increments the reviewCount by 1 for each matching document in the group.
        }
      },

      // Stage 3: Reshape output to remove _id and round average rating to 1 decimal place
      {
        $project: {
          _id: 0, // Exclude the _id field from the output since we don't want the user to see it in the response. Instead, we will include the courseCode field explicitly.
          courseCode: '$_id', // Include the courseCode field in the output.
          averageRating: { $round: ['$averageRating', 1] }, // Round the averageRating to 1 decimal place for better readability in the response.
          reviewCount: 1 // Include the reviewCount field in the output. It will show the total number of reviews for the specified courseCode.
        }
      }
    ]);

    // If no reviews exist for this course code, return 0 metrics instead of an empty array
    if (summary.length === 0) {
      return res.status(200).json({
        courseCode: normalizedCode,
        averageRating: 0,
        reviewCount: 0
      });
    }

    // Return the single aggregated summary object
    res.status(200).json(summary[0]);
  } catch (err) { next(err); }
}

// POST /api/reviews
// TODO: implement per README.md section 3.
export async function createReview(req, res, next) {
  try {
    const { error, value } = createReviewSchema.validate(req.body);
    if (error) {
      //Checks if joi validation failed and if it did, it sends a response with a status code of 400 (Bad Request) and the error message in JSON format.
      return res.status(400).json({ error: error.details[0].message });
    }

    //Actually creates the review in the database using the validated data.
    const review = await Review.create(value);
    
     //It sends a response with a status code of 200 (OK) and the reviews in JSON format.
    res.status(201).json(review);
  } catch (err) {
    //Checks if the error is a duplicate key error (In MongoDB, which is code 11000) and if it is, it sends a response with a status code of 400 (Bad Request) and an error message in JSON format.
    if (err.code == 11000) {
      return res.status(400).json({ error: 'Duplicate review for the same course by the same user is not allowed.' });
    }
    next(err);
  }
}

// PATCH /api/reviews/:id
// TODO: implement per README.md sections 3 and 5.
export async function updateReview(req, res, next) {
  try {
    //To get the id from the request parameters and stores it in a variable "id"
    const {id} = req.params;

    // Validate that the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    // Validate request body against update schema (at least one field required)
    const { error, value } = updateReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const review = await Review.findByIdAndUpdate(id, value, { 
      new: true, //Returns the updated document instead of the original so it doesn't return it before the update
      runValidators: true //Forces the schema validators to run on the update operation  cause they skip them on update and only do them on create and save only by default
     })
    //Makes it so it actually returns the user object instead of just the id. And also we make sure we don't pull the password by specifying the fields we want to return
    .populate('reviewedBy', 'name email');

    // If no review was found with that ID, return 404 Not Found
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Return the updated review document with HTTP 200 (OK)
    res.status(200).json(review);

  } catch (err) {
    //Checks if the error is a duplicate key error (In MongoDB, which is code 11000) and if it is, it sends a response with a status code of 400 (Bad Request) and an error message in JSON format. 
    if (err.code === 11000) {
      return res.status(409).json({ error: 'User has already reviewed this course' });
    }
    next(err); }
}

// DELETE /api/reviews/:id
// TODO: implement per README.md sections 3 and 5.
export async function deleteReview(req, res, next) {
  try {
    //To get the id from the request parameters and stores it in a variable "id"
    const {id} = req.params;

    //Validate that the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    //Finds the review by its ID and deletes it from the database.
    const review = await Review.findByIdAndDelete(id); 

    if (!review) {
      // If the review is not found, it sends a response with a status code of 404 (Not Found) and an error message in JSON format.
      return res.status(404).json({ error: 'Review not found' });
    }
    
    //If the review is found and deleted, it sends a response with a status code of 200 (OK) and a success message in JSON format.
    res.status(200).json({ message: 'Review deleted successfully' });   


  } catch (err) { next(err); }
}
