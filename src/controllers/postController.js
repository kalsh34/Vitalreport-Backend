import Post from '../models/Post.js';
import Site from '../models/Site.js';
import Guard from '../models/Guard.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';

export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, site, status } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (site) query.site = site;
    if (status) query.status = status;

    const posts = await Post.find(query)
      .populate('site', 'name address status')
      .skip(skip)
      .limit(queryLimit)
      .sort({ sortOrder: 1, createdAt: -1 });

    const total = await Post.countDocuments(query);

    return ApiSuccess(res, {
      posts,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch posts', 500, 'FETCH_POSTS_FAILED');
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('site', 'name address location geofenceRadius status');

    if (!post) {
      return ApiError(res, 'Post not found', 404, 'POST_NOT_FOUND');
    }

    return ApiSuccess(res, post);
  } catch (error) {
    return ApiError(res, 'Failed to fetch post', 500, 'FETCH_POST_FAILED');
  }
};

export const createPost = async (req, res) => {
  try {
    const { site, name, description, latitude, longitude, sortOrder } = req.body;

    if (!site || !name) {
      return ApiError(res, 'Site and name are required', 400, 'MISSING_FIELDS');
    }

    const siteExists = await Site.findById(site);
    if (!siteExists) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    const post = await Post.create({
      site,
      name,
      description,
      latitude,
      longitude,
      sortOrder: sortOrder || 0
    });

    const populatedPost = await Post.findById(post._id)
      .populate('site', 'name address');

    return ApiSuccess(res, populatedPost, 'Post created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create post', 500, 'CREATE_POST_FAILED');
  }
};

export const updatePost = async (req, res) => {
  try {
    const { name, description, latitude, longitude, status, sortOrder } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) {
      return ApiError(res, 'Post not found', 404, 'POST_NOT_FOUND');
    }

    if (name) post.name = name;
    if (description !== undefined) post.description = description;
    if (latitude !== undefined) post.latitude = latitude;
    if (longitude !== undefined) post.longitude = longitude;
    if (status) post.status = status;
    if (sortOrder !== undefined) post.sortOrder = sortOrder;

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('site', 'name address');

    return ApiSuccess(res, populatedPost, 'Post updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update post', 500, 'UPDATE_POST_FAILED');
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return ApiError(res, 'Post not found', 404, 'POST_NOT_FOUND');
    }

    const assignedGuards = await Guard.countDocuments({ assignedPost: post._id });
    if (assignedGuards > 0) {
      return ApiError(res, 'Cannot delete post with assigned guards', 400, 'POST_IN_USE');
    }

    await Post.findByIdAndDelete(post._id);

    return ApiSuccess(res, null, 'Post deleted successfully');
  } catch (error) {
    return ApiError(res, 'Failed to delete post', 500, 'DELETE_POST_FAILED');
  }
};
