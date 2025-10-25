module.exports = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Sol Numérique',
    address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
  }
};