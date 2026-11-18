# TaskFlow

TaskFlow is a modern, responsive web application designed for efficient task tracking, categorization, and personal productivity management.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Documentation:** Markdown

---

## 📁 Project Structure

```text
taskflow/
├── backend/
│   ├── config/
│   │   └── db.js               # Database connection configuration (placeholder)
│   ├── controllers/
│   │   ├── authController.js   # Authentication controller logic (placeholder)
│   │   ├── categoryController.js # Category management logic (placeholder)
│   │   └── taskController.js   # Task CRUD controller logic (placeholder)
│   ├── middlewares/
│   │   ├── authMiddleware.js   # JWT authentication verification (placeholder)
│   │   └── errorHandler.js     # Global error handling middleware (placeholder)
│   ├── models/
│   │   ├── categoryModel.js    # Category data access queries (placeholder)
│   │   ├── taskModel.js        # Task data access queries (placeholder)
│   │   └── userModel.js        # User data access queries (placeholder)
│   ├── routes/
│   │   ├── authRoutes.js       # Auth endpoints (placeholder)
│   │   ├── categoryRoutes.js   # Category endpoints (placeholder)
│   │   └── taskRoutes.js       # Task endpoints (placeholder)
│   └── server.js               # Express application entry point (placeholder)
├── database/
│   └── schema.sql              # PostgreSQL DDL script for tables, keys, and indexes
├── docs/
│   └── database-design.md      # Detailed database schema design & ERD documentation
├── frontend/
│   ├── assets/                 # Static media assets (icons, images)
│   ├── css/
│   │   └── styles.css          # Core stylesheet (placeholder)
│   ├── js/
│   │   ├── api.js              # Fetch/API client wrappers (placeholder)
│   │   └── app.js              # DOM and application logic (placeholder)
│   └── index.html              # Main HTML entry page (placeholder)
├── .env.example                # Example environment variables template
├── .gitignore                  # Git exclusions for dependencies and sensitive files
└── README.md                   # Project overview and documentation
```

---

## 🗄️ Database Initialization

The PostgreSQL database schema is defined in [database/schema.sql](database/schema.sql).

### Prerequisites
- PostgreSQL 12+ installed and running locally or via a cloud instance.

### Setup Instructions
1. Create a dedicated database:
   ```sql
   CREATE DATABASE taskflow_db;
   ```
2. Run the schema file against your database:
   ```bash
   psql -U postgres -d taskflow_db -f database/schema.sql
   ```

Refer to [docs/database-design.md](docs/database-design.md) for full documentation on entity relationships, constraints, and indexing strategies.
