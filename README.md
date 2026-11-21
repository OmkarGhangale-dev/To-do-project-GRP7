# 📝 To-Do Application

A full-stack To-Do Management Application that helps users organize their daily activities, manage tasks, and stay productive. Users can create, update, delete, and track tasks through a simple and user-friendly interface.

## 🚀 Features

- **User Authentication** – Register and log in securely.
- **Task Management** – Create, view, update, and delete tasks.
- **Categories** – Organize tasks into different categories.
- **Task Tracking** – Manage task completion and pending activities.
- **Database Integration** – Store and retrieve application data.
- **Responsive Interface** – Access the application across different screen sizes.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML, CSS, JavaScript / React | Frontend |
| Node.js | Backend Runtime |
| Express.js | Backend Framework |
| MySQL | Database |
| Git & GitHub | Version Control |

## 📂 Project Structure

```text
To-Do-Application/
│
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
├── database/
│   └── todo_app.sql
│
├── .gitignore
└── README.md
```

*Note: The structure above is illustrative. Adjust folder and file names to match the actual repository.*

## 📋 Prerequisites

Before getting started, make sure you have installed:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Git](https://git-scm.com/)
- [MySQL](https://dev.mysql.com/downloads/installer/) or access to a MySQL cloud database
- A code editor such as [Visual Studio Code](https://code.visualstudio.com/)

## ⚙️ Installation & Setup

### Step 1: Clone the Repository

Open your terminal and run:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate into the project:

```bash
cd YOUR_PROJECT_FOLDER
```

### Step 2: Set Up the Database

1. Start your MySQL server.
2. Open MySQL Workbench or MySQL Command Line.
3. Create a database:

```sql
CREATE DATABASE todo_app;
```

4. Import the provided SQL file if your repository includes one:

```bash
mysql -u root -p todo_app < database/todo_app.sql
```

If your database is hosted on Railway or another cloud provider, use the database credentials provided by that service instead.

### Step 3: Configure the Backend

Navigate to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the backend directory.

Add your database and application configuration:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=todo_app
DB_PORT=3306
```

Replace the example values with your actual configuration.

**Important:** Never upload your `.env` file, database passwords, API keys, or service account credentials to GitHub.

### Step 4: Start the Backend

Run:

```bash
npm start
```

For development, if your project supports Nodemon:

```bash
npm run dev
```

The backend should now be running at:

```text
http://localhost:5000
```

### Step 5: Set Up the Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend API URL using the environment variable expected by your frontend code.

For example, if using Vite:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed in your terminal (usually):

```text
http://localhost:5173
```

## 🔗 API Endpoints

The backend provides REST API endpoints for application functionality.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| GET | `/api/tasks` | Fetch tasks |
| GET | `/api/categories` | Fetch categories |

Additional authentication, task management, and category endpoints depend on the implemented backend routes.

## 🌐 Deployment

The application can be deployed using:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Railway MySQL

For deployment, configure the production environment variables and update the frontend API URL to point to your deployed backend.

## 🧪 Running the Application

To run the complete application locally:

1. Start your MySQL database.
2. Start the backend server.
3. Start the frontend development server.
4. Open the frontend URL in your browser.
5. Register or log in and start managing your tasks.

Make sure the backend and database are connected before using the application.

## 🔐 Security

- Keep credentials and environment variables private.
- Never commit `.env` files or service account JSON files.
- Use environment variables for sensitive configuration.
- Do not share production database credentials publicly.

## 🤝 Contributing

Contributions are welcome!

1. Fork this repository.
2. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

3. Make your changes.
4. Commit your changes:

```bash
git add .
git commit -m "Add: your feature description"
```

5. Push your branch:

```bash
git push origin feature/your-feature-name
```

6. Open a Pull Request.

## 📄 License

This project is available for educational and personal use. Add an appropriate open-source license if you intend to distribute it under specific permissions.

---

**Built with ❤️ using Node.js, Express.js, MySQL, and modern frontend technologies.**
