const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  console.log("==== AUTH DEBUG ====");
  console.log("Cookies:", req.cookies);
  console.log("User:", req.user);
  console.log("Role:", req.user?.role);
  console.log("====================");

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

module.exports = adminMiddleware;
