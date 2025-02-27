const jwt = require('jsonwebtoken');
require('dotenv').config();

const userId = 'test-user-id';
const secret = process.env.JWT_SECRET || 'test-secret';

const accessToken = jwt.sign(
  { userId, email: 'test@example.com' },
  secret,
  { expiresIn: '1h' }
);

console.log('Access Token:', accessToken);