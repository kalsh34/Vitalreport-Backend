import Site from '../models/Site.js';
import Guard from '../models/Guard.js';
import Post from '../models/Post.js';
import Incident from '../models/Incident.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';

export const getSites = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;

    const sites = await Site.find(query)
      .populate('siteManager', 'firstName lastName email')
      .skip(skip)
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    const total = await Site.countDocuments(query);

    return ApiSuccess(res, {
      sites,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch sites', 500, 'FETCH_SITES_FAILED');
  }
};

export const getSite = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id)
      .populate('siteManager', 'firstName lastName email phone');

    if (!site) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    return ApiSuccess(res, site);
  } catch (error) {
    return ApiError(res, 'Failed to fetch site', 500, 'FETCH_SITE_FAILED');
  }
};

export const createSite = async (req, res) => {
  try {
    const { name, clientName, address, latitude, longitude, geofenceRadius, siteManager, contactPerson, contactPhone, notes } = req.body;

    if (!name) {
      return ApiError(res, 'Site name is required', 400, 'MISSING_NAME');
    }

    if (latitude !== undefined && longitude !== undefined) {
      req.body.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }

    if (siteManager) {
      const manager = await Site.findById(siteManager);
      if (!manager && !req.body.siteManager) {
        // siteManager is a User ref, not Site
      }
    }

    const site = await Site.create({
      name,
      clientName,
      address,
      location: latitude !== undefined && longitude !== undefined ? {
        type: 'Point',
        coordinates: [longitude, latitude]
      } : undefined,
      latitude,
      longitude,
      geofenceRadius: geofenceRadius || 200,
      siteManager,
      contactPerson,
      contactPhone,
      notes
    });

    return ApiSuccess(res, site, 'Site created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create site', 500, 'CREATE_SITE_FAILED');
  }
};

export const updateSite = async (req, res) => {
  try {
    const { name, clientName, address, latitude, longitude, geofenceRadius, siteManager, contactPerson, contactPhone, notes, status } = req.body;

    const site = await Site.findById(req.params.id);
    if (!site) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    if (name) site.name = name;
    if (clientName !== undefined) site.clientName = clientName;
    if (address !== undefined) site.address = address;
    if (latitude !== undefined && longitude !== undefined) {
      site.latitude = latitude;
      site.longitude = longitude;
      site.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }
    if (geofenceRadius !== undefined) site.geofenceRadius = geofenceRadius;
    if (siteManager !== undefined) site.siteManager = siteManager || undefined;
    if (contactPerson !== undefined) site.contactPerson = contactPerson;
    if (contactPhone !== undefined) site.contactPhone = contactPhone;
    if (notes !== undefined) site.notes = notes;
    if (status) site.status = status;

    await site.save();

    return ApiSuccess(res, site, 'Site updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update site', 500, 'UPDATE_SITE_FAILED');
  }
};

export const getSiteStats = async (req, res) => {
  try {
    const siteId = req.params.id;

    const site = await Site.findById(siteId);
    if (!site) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    const [guardCount, postCount, incidentCount, activeIncidents, openIncidents] = await Promise.all([
      Guard.countDocuments({ assignedSite: siteId, isActive: true }),
      Post.countDocuments({ site: siteId }),
      Incident.countDocuments({ site: siteId }),
      Incident.countDocuments({ site: siteId, status: { $in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] } }),
      Incident.countDocuments({ site: siteId, status: 'OPEN' })
    ]);

    return ApiSuccess(res, {
      site: {
        _id: site._id,
        name: site.name,
        status: site.status
      },
      guardCount,
      postCount,
      totalIncidents: incidentCount,
      activeIncidents,
      openIncidents
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch site stats', 500, 'SITE_STATS_FAILED');
  }
};
