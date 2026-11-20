# TaskFlow Frontend-to-Backend API Contract

**Author:** Rashika Jagdev Prajapati (Frontend Lead, Group 7)  
**Target Recipient:** Krishna (Backend Lead, Group 7) & Omkar (Database Lead, Group 7)  
**Assigned Branch:** `feature/frontend`  
**Base URL:** `http://localhost:5000/api`

---

## 1. Overview & Authentication Header

All authenticated endpoints require an `Authorization` header containing the Bearer token (JWT or Firebase ID token):

```http
Authorization: Bearer <TOKEN>
```

---

## 2. Authentication Endpoints

### 2.1. User Registration
- **Endpoint:** `POST /api/auth/register`
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "name": "Rashika Prajapati",
    "email": "user@taskflow.com",
    "password": "securepassword123",
    "role": "user"
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "name": "Rashika Prajapati",
      "email": "user@taskflow.com",
      "role": "user"
    }
  }
  ```

### 2.2. User Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "email": "user@taskflow.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "name": "Rashika Prajapati",
      "email": "user@taskflow.com",
      "role": "user"
    }
  }
  ```

### 2.3. Current User Verification
- **Endpoint:** `GET /api/auth/me`
- **Access:** Authenticated (Bearer Token)
- **Success Response (`200 OK`):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Rashika Prajapati",
      "email": "user@taskflow.com",
      "role": "user"
    }
  }
  ```

---

## 3. Task Management Endpoints

### 3.1. Fetch Authenticated User's Tasks
- **Endpoint:** `GET /api/tasks`
- **Access:** Authenticated (returns tasks owned by the requesting user)
- **Success Response (`200 OK`):**
  ```json
  {
    "tasks": [
      {
        "id": 101,
        "user_id": 1,
        "title": "Design TaskFlow User Dashboard Wireframe",
        "description": "Finalize navigation layout and cards",
        "priority": "High",
        "status": "Completed",
        "category": "Internship",
        "due_date": "2026-11-21T00:00:00.000Z",
        "created_at": "2026-11-10T09:00:00.000Z",
        "updated_at": "2026-11-18T12:00:00.000Z"
      }
    ]
  }
  ```

### 3.2. Create New Task
- **Endpoint:** `POST /api/tasks`
- **Access:** Authenticated
- **Request Body (JSON):**
  ```json
  {
    "title": "Prepare presentation slides",
    "description": "Cover project architecture and demo",
    "priority": "Medium",
    "status": "Pending",
    "category": "Internship",
    "due_date": "2026-11-25"
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "task": {
      "id": 106,
      "user_id": 1,
      "title": "Prepare presentation slides",
      "description": "Cover project architecture and demo",
      "priority": "Medium",
      "status": "Pending",
      "category": "Internship",
      "due_date": "2026-11-25T00:00:00.000Z",
      "created_at": "2026-11-19T14:30:00.000Z",
      "updated_at": "2026-11-19T14:30:00.000Z"
    }
  }
  ```

### 3.3. Update Existing Task
- **Endpoint:** `PUT /api/tasks/:id`
- **Access:** Authenticated (owner check required)
- **Request Body (JSON):**
  ```json
  {
    "title": "Prepare presentation slides (Updated)",
    "description": "Include screenshots of the admin panel",
    "priority": "High",
    "status": "In Progress",
    "category": "Internship",
    "due_date": "2026-11-26"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "task": {
      "id": 106,
      "user_id": 1,
      "title": "Prepare presentation slides (Updated)",
      "description": "Include screenshots of the admin panel",
      "priority": "High",
      "status": "In Progress",
      "category": "Internship",
      "due_date": "2026-11-26T00:00:00.000Z",
      "updated_at": "2026-11-19T14:45:00.000Z"
    }
  }
  ```

### 3.4. Delete Task
- **Endpoint:** `DELETE /api/tasks/:id`
- **Access:** Authenticated (owner check required)
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Task deleted successfully"
  }
  ```

---

## 4. Admin Management Endpoints

### 4.1. Admin Overview Statistics
- **Endpoint:** `GET /api/admin/stats`
- **Access:** Admin only (`role === 'admin'`)
- **Success Response (`200 OK`):**
  ```json
  {
    "totalUsers": 12,
    "totalTasks": 48,
    "pendingTasks": 28,
    "completedTasks": 20
  }
  ```

### 4.2. Admin Registered Users List
- **Endpoint:** `GET /api/admin/users`
- **Access:** Admin only
- **Success Response (`200 OK`):**
  ```json
  {
    "users": [
      {
        "id": 1,
        "name": "Rashika Prajapati",
        "email": "user@taskflow.com",
        "role": "user",
        "tasksCount": 5,
        "completedCount": 2,
        "created_at": "2026-11-01T10:00:00.000Z"
      }
    ]
  }
  ```

### 4.3. Admin All System Tasks
- **Endpoint:** `GET /api/admin/tasks`
- **Access:** Admin only
- **Success Response (`200 OK`):**
  ```json
  {
    "tasks": [
      {
        "id": 101,
        "title": "Design TaskFlow User Dashboard Wireframe",
        "owner_name": "Rashika Prajapati",
        "user_id": 1,
        "category": "Internship",
        "priority": "High",
        "status": "Completed",
        "due_date": "2026-11-21T00:00:00.000Z"
      }
    ]
  }
  ```

---

## 5. Standard Error Format

All error responses from Express must return a consistent JSON payload:

```json
{
  "success": false,
  "message": "Human-readable error explanation here"
}
```
