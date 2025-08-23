# Backend API Implementation Prompt for File Management System

## Overview
Create a Node.js/Express backend API system that handles file uploads and metadata management using local file storage and Neon PostgreSQL database. The system should replace Firebase functionality with local storage and database operations.

## Required API Endpoints

### 1. Authentication Endpoints

**POST `/api/login`**

**Purpose:** Authenticate user login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "companyId": "123",
    "role": "admin"
  },
  "token": "jwt_token_here"
}
```

**POST `/api/forgot-password`**

**Purpose:** Send password reset email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Implementation Requirements:**
- Check if user exists in database
- Generate secure reset token with expiration (24 hours)
- Store reset token in database with expiration timestamp
- Send email with reset link containing token
- Use email service (Nodemailer, SendGrid, etc.)

**Database Schema (password_resets table):**
```sql
CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL
);

CREATE INDEX idx_password_resets_email ON password_resets(email);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "User not found"
}
```

**POST `/api/reset-password`**

**Purpose:** Reset password using token

**Request:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

**Implementation Requirements:**
- Validate reset token and check expiration
- Hash new password using bcrypt
- Update user password in database
- Mark reset token as used
- Return success message

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 2. File Upload Endpoint
**POST `/api/upload-file`**

**Purpose:** Upload files to local storage and return public URL

**Request:**
- Content-Type: `multipart/form-data`
- Body parameters:
  - `file`: File object (required)
  - `fileName`: String (required)
  - `companyId`: String (required)

**Implementation Requirements:**
- Save files to local directory: `./uploads/files/{companyId}/`
- Generate unique filename to prevent conflicts (timestamp + original name)
- Create directory structure if it doesn't exist
- Return public URL for file access
- Validate file types and size limits (max 10MB recommended)

**Response:**
```json
{
  "success": true,
  "url": "http://your-domain.com/uploads/files/123/1234567890_document.pdf",
  "fileName": "1234567890_document.pdf",
  "originalName": "document.pdf",
  "size": 1024000
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "File upload failed",
  "details": "File size exceeds limit"
}
```

### 2. Assistant Files Management

**POST `/api/assistant-files`**

**Purpose:** Save file metadata to database after successful upload

**Request:**
```json
{
  "name": "document.pdf",
  "url": "http://your-domain.com/uploads/files/123/1234567890_document.pdf",
  "vectorStoreId": "vs_abc123",
  "openAIFileId": "file-abc123",
  "companyId": "123",
  "createdBy": "user@example.com"
}
```

**Database Schema (assistant_files table):**
```sql
CREATE TABLE assistant_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  vector_store_id VARCHAR(255),
  openai_file_id VARCHAR(255),
  company_id VARCHAR(50) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Response:**
```json
{
  "success": true,
  "id": 1,
  "message": "File metadata saved successfully"
}
```

**GET `/api/assistant-files?companyId={companyId}`**

**Purpose:** Retrieve all files for a specific company

**Response:**
```json
[
  {
    "id": 1,
    "name": "document.pdf",
    "url": "http://your-domain.com/uploads/files/123/1234567890_document.pdf",
    "vectorStoreId": "vs_abc123",
    "openAIFileId": "file-abc123",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

**DELETE `/api/assistant-files/{fileId}`**

**Purpose:** Delete file from both database and local storage

**Implementation:**
- Remove record from database
- Delete physical file from local storage
- Handle cases where file might not exist physically

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 3. Static File Serving

**GET `/uploads/files/**`**

**Purpose:** Serve uploaded files as static content

**Implementation:**
- Use Express static middleware
- Set appropriate CORS headers
- Add security headers
- Handle file not found cases

### 4. User Company Data Endpoint

**GET `/api/user-company-data?email={email}`**

**Purpose:** Get user and company information for API URL determination

**Response:**
```json
{
  "userData": {
    "companyId": "123",
    "email": "user@example.com",
    "role": "admin"
  },
  "companyData": {
    "api_url": "https://your-backend-url.com",
    "company_name": "Example Corp"
  }
}
```

## Implementation Requirements

### Dependencies
```json
{
  "express": "^4.18.0",
  "multer": "^1.4.5",
  "pg": "^8.8.0",
  "cors": "^2.8.5",
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "nodemailer": "^6.9.0",
  "crypto": "built-in",
  "path": "built-in",
  "fs": "built-in"
}
```

### Directory Structure
```
backend/
├── uploads/
│   └── files/
│       └── {companyId}/
│           └── uploaded_files_here
├── routes/
│   ├── upload.js
│   └── assistantFiles.js
├── middleware/
│   └── fileUpload.js
├── utils/
│   └── database.js
└── server.js
```

### Security Considerations
1. **File Type Validation:** Only allow specific file types (pdf, doc, docx, txt, etc.)
2. **File Size Limits:** Implement reasonable size limits (10MB recommended)
3. **Path Traversal Prevention:** Sanitize file names to prevent directory traversal
4. **Rate Limiting:** Implement upload rate limiting per user/company
5. **Authentication:** Verify user permissions before file operations

### Environment Variables
```env
DB_HOST=your-neon-host
DB_PORT=5432
DB_NAME=your-database
DB_USER=your-username
DB_PASSWORD=your-password
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,xlsx,pptx

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
```

### Error Handling
- Return consistent error format
- Log errors for debugging
- Handle database connection failures
- Handle disk space issues
- Validate all inputs

### Sample Implementation Structure

```javascript
// File upload route with multer
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const companyId = req.body.companyId;
    const uploadPath = path.join('./uploads/files', companyId);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx|txt|xlsx|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

## Database Setup
Execute these SQL commands in your Neon database:

```sql
-- Create assistant_files table
CREATE TABLE IF NOT EXISTS assistant_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  vector_store_id VARCHAR(255),
  openai_file_id VARCHAR(255),
  company_id VARCHAR(50) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_assistant_files_company_id ON assistant_files(company_id);
CREATE INDEX idx_assistant_files_created_by ON assistant_files(created_by);
```

## Testing Requirements
1. **File Upload Testing:** Test with various file types and sizes
2. **Database Integration:** Verify data persistence and retrieval
3. **Error Scenarios:** Test file upload failures, database errors
4. **Static File Serving:** Verify files are accessible via URLs
5. **Cleanup Testing:** Test file deletion from both database and storage

## Notes
- Ensure the uploads directory is writable by the application
- Consider implementing file cleanup for orphaned files
- Add logging for file operations for debugging
- Consider adding file compression for large files
- Implement backup strategy for uploaded files if needed

This implementation will replace all Firebase Storage and Firestore operations with local file storage and Neon PostgreSQL database operations while maintaining the same API interface expected by the frontend.