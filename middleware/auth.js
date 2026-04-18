function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  return next();
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({
        error: "Insufficient permissions",
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
