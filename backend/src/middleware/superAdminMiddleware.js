const superAdminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Strict check for super_admin role only
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Super Admin access required" });
  }

  next();
};

module.exports = superAdminMiddleware;
