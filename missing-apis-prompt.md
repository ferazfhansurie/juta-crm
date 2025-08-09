# Missing API Endpoints for File Management System

## Overview
Add these specific API endpoints to your existing backend system to support the updated Inbox file upload functionality that now uses backend storage instead of Firebase.

## Required New/Updated Endpoints

### 1. File Upload Endpoint (if missing)
**POST `/api/upload-file`**

**Purpose:** Upload files to local server storage

**Request (multipart/form-data):**
- `file`: File object
- `fileName`: String  
- `companyId`: String

**Response:**
```json
{
  "url": "http://your-domain.com/uploads/files/123/timestamp_filename.pdf"
}
```

**Implementation:**
- Save to local path: `./uploads/files/{companyId}/`
- Return accessible URL for the uploaded file

---

### 2. Assistant Files Metadata Management
**POST `/api/assistant-files`**

**Purpose:** Save file metadata after upload

**Request:**
```json
{
  "name": "document.pdf",
  "url": "http://your-domain.com/uploads/files/123/file.pdf", 
  "vectorStoreId": "vs_abc123",
  "openAIFileId": "file-abc123",
  "companyId": "123",
  "createdBy": "user@example.com"
}
```

**Database Table (if not exists):**
```sql
CREATE TABLE assistant_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  url TEXT,
  vector_store_id VARCHAR(255),
  openai_file_id VARCHAR(255), 
  company_id VARCHAR(50),
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Response:**
```json
{
  "id": 1,
  "success": true
}
```

---

**GET `/api/assistant-files?companyId={companyId}`**

**Purpose:** Fetch all files for a company

**Response:**
```json
[
  {
    "id": 1,
    "name": "document.pdf",
    "url": "http://your-domain.com/uploads/files/123/file.pdf",
    "vectorStoreId": "vs_abc123"
  }
]
```

---

**DELETE `/api/assistant-files/{fileId}`**

**Purpose:** Delete file metadata and physical file

**Implementation:**
- Delete record from `assistant_files` table
- Delete physical file from local storage
- Return success/error response

**Response:**
```json
{
  "success": true
}
```

---

### 3. Static File Serving (if missing)
**GET `/uploads/files/**`**

**Purpose:** Serve uploaded files as static content

**Implementation:**
```javascript
// Express static middleware
app.use('/uploads', express.static('uploads'));
```

---

### 4. Update Existing User Company Data Endpoint (if needed)
**GET `/api/user-company-data?email={email}`**

**Ensure Response Includes:**
```json
{
  "userData": {
    "companyId": "123"
  },
  "companyData": {
    "api_url": "your-backend-url"
  }
}
```

## Notes for Implementation

1. **File Storage Path:** Use `./uploads/files/{companyId}/` directory structure
2. **Database Integration:** Add `assistant_files` table if it doesn't exist
3. **Static Serving:** Ensure uploaded files are accessible via HTTP
4. **Existing APIs:** Keep all your current endpoints - only add these missing ones

## Quick Implementation Checklist

- [ ] POST `/api/upload-file` endpoint
- [ ] POST `/api/assistant-files` endpoint  
- [ ] GET `/api/assistant-files` endpoint
- [ ] DELETE `/api/assistant-files/{id}` endpoint
- [ ] Static file serving for `/uploads/files/**`
- [ ] `assistant_files` database table
- [ ] File upload directory creation (`./uploads/files/`)

These endpoints will integrate with your existing system and support the frontend file upload functionality we just updated.