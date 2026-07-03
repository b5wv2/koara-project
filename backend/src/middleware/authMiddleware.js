const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.koara_session;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No session found.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the decoded payload { id, role } to the request
    next();
  } catch (error) {
    console.error('Session verification failed:', error.message);
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
};

module.exports = authMiddleware;
