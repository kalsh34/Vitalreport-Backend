import AuditLog from '../models/AuditLog.js';

export const auditLog = (action) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          user: req.user?._id,
          action,
          resource: req.baseUrl.split('/').pop(),
          resourceId: req.params.id || null,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
          timestamp: new Date()
        };

        if (req.body && Object.keys(req.body).length > 0) {
          logData.newValue = req.body;
        }

        if (req.params.id) {
          logData.resourceId = req.params.id;
        }

        AuditLog.create(logData).catch(err => {
          console.error('Audit log error:', err.message);
        });
      }

      return originalJson(body);
    };

    next();
  };
};
