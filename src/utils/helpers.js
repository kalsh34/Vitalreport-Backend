import { v4 as uuidv4 } from 'uuid';

export const generateReportNumber = (prefix) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${year}-${month}-${day}-${random}`;
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => {
  return deg * (Math.PI / 180);
};

export const getTimestamp = () => {
  return new Date().toISOString();
};

export const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    limit: Math.min(limit, 100),
    page: Math.max(1, page)
  };
};

export const ApiSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const ApiError = (res, message = 'Error', statusCode = 500, code = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code
  });
};

export const generateId = () => uuidv4();
