exports.requireAdmin = async (req, res, next) => {
  try {
    const password = req.headers['x-admin-password'];
    
    // Check against the hardcoded password requested by the user
    if (password !== '21') {
      return res.status(403).json({ message: 'Access denied: Invalid Admin Password' });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
