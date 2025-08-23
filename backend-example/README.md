# Juta CRM Backend

A Node.js/Express backend API system for Juta CRM with Neon PostgreSQL database integration.

## Features

- User authentication with JWT
- Password reset functionality via email
- File upload and management
- Secure API endpoints with rate limiting
- PostgreSQL database integration

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=your-neon-host
DB_PORT=5432
DB_NAME=your-database
DB_USER=your-username
DB_PASSWORD=your-password

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# App Configuration
APP_URL=http://localhost:3000
NODE_ENV=development
PORT=8443
```

### 3. Database Setup

Run the SQL script in your Neon PostgreSQL database:

```bash
psql "postgresql://username:password@host:port/database" -f database-setup.sql
```

Or copy and paste the contents of `database-setup.sql` into your database client.

### 4. Email Service Setup

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in your `.env` file

For other providers, update the email configuration in `forgot-password.js`.

### 5. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/login` - User login
- `POST /api/forgot-password` - Request password reset
- `POST /api/reset-password` - Reset password with token

### Health Check

- `GET /api/health` - Server health status

## File Structure

```
backend-example/
├── server.js              # Main server file
├── forgot-password.js     # Authentication routes
├── package.json           # Dependencies
├── database-setup.sql     # Database schema
├── .env                   # Environment variables (create this)
└── uploads/               # File upload directory (auto-created)
    └── files/
        └── {companyId}/
```

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- Secure password hashing with bcrypt
- JWT token authentication

## Development

The server runs on port 8443 by default (configurable via PORT environment variable).

For development, the server will accept requests from `http://localhost:3000` and `http://localhost:3001`.

## Production Deployment

1. Update CORS origins in `server.js`
2. Set `NODE_ENV=production`
3. Use a process manager like PM2
4. Set up reverse proxy (nginx/Apache)
5. Configure SSL certificates
6. Update environment variables for production

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your Neon database credentials
   - Verify network access and firewall settings

2. **Email Not Sending**
   - Verify email service credentials
   - Check if your email provider allows SMTP access
   - For Gmail, ensure App Password is used

3. **CORS Errors**
   - Verify the frontend URL is in the CORS origins list
   - Check if the frontend is making requests to the correct backend URL

### Logs

Check the console output for detailed error messages. The server logs all errors and important events.

## Support

For issues or questions, check the error logs and verify your configuration matches the requirements.
