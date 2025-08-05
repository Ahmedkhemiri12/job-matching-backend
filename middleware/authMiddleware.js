import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET;


export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  console.log('AUTH HEADER:', header); // LOG THE HEADER

  if (!header) {
    console.log('No token provided');
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  const token = header.split(' ')[1];
  console.log('EXTRACTED TOKEN:', token); // LOG THE TOKEN

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('DECODED TOKEN:', decoded); // LOG THE DECODED TOKEN
    req.user = decoded;
    next();
  } catch (err) {
    console.log('JWT VERIFY ERROR:', err.message); // LOG THE ERROR
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};
export const requireRecruiter = (req, res, next) => {
  if (req.user.role !== 'recruiter') {
    return res.status(403).json({ success: false, message: 'Only recruiters can perform this action.' });
  }
  next();
};
