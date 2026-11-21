# TaskFlow – To-Do Management Application

A full-stack task management application that helps users organize daily activities, manage tasks, and stay productive. TaskFlow provides user authentication, task management, categories, and administrative functionality through a responsive interface.

## Features

- **User Authentication:** Register and log in securely.
- **Google Authentication:** Sign in using Firebase Authentication, when configured.
- **Task Management:** Create, view, update, and delete tasks.
- **Categories:** Organize tasks into categories.
- **Task Tracking:** Manage pending and completed tasks.
- **Admin Functionality:** Administrative routes and functionality.
- **Responsive Interface:** Use the application across different screen sizes.
- **Cloud Database:** Store application data using Firebase Cloud Firestore.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend UI |
| TypeScript | Frontend development |
| Vite | Frontend development and build tool |
| Tailwind CSS | Styling |
| Node.js | Backend runtime |
| Express.js | REST API |
| Firebase Authentication | User authentication |
| Firebase Admin SDK | Backend authentication and administration |
| Cloud Firestore | Database |
| Git & GitHub | Version control |

## Project Structure

```text
To-do-project-GRP7/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/
│   ├── tests/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── database/
├── docs/
├── .env.example
├── .gitignore
├── firebase.json
└── README.md
```

## Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) – use a current LTS version compatible with Vite.
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/) or another code editor.
- A Google account to configure Firebase.

## Getting Started

### 1. Clone the repository

Open a terminal and run:

```bash
git clone https://github.com/OmkarGhangale-dev/To-do-project-GRP7.git
```

Navigate into the project:

```bash
cd To-do-project-GRP7
```

### 2. Configure Firebase

The backend uses Firebase Admin SDK and Cloud Firestore.

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a Firebase project or select an existing one.
3. Enable **Cloud Firestore** and create a database.
4. Open **Authentication** and enable the sign-in providers used by the application.
5. Open **Project Settings** and note your Firebase Project ID.
6. Go to **Project Settings → Service Accounts**.
7. Generate a new private key for the Firebase Admin SDK.

Keep the downloaded service-account JSON private. Do not upload it to GitHub or share it publicly.

### 3. Configure the backend

Open a terminal in the project directory:

```bash
cd backend
```

Install backend dependencies:

```bash
npm install
```

Create a `.env` file inside the `backend` folder:

```env
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=your_firebase_project_id
CORS_ORIGIN=http://localhost:5173
```

Configure Firebase Admin credentials using either of these methods:

**Option A – Local development**

Place your Firebase service-account JSON file at:

```text
backend/serviceAccountKey.json
```

The backend automatically checks this location.

**Option B – Environment variable**

Set `FIREBASE_SERVICE_ACCOUNT` to the complete service-account JSON content. This is useful for cloud deployments.

Do not commit the service-account file or its contents.

### 4. Start the backend

From the `backend` directory, run:

```bash
npm run dev
```

Or run the production start command:

```bash
npm start
```

The backend should start at:

```text
http://localhost:5000
```

Open the URL in your browser to check the backend health endpoint.

A successful response should indicate that the TaskFlow Backend API is running. It also reports whether Firestore is reachable.

### 5. Configure and start the frontend

Open a **new terminal** from the project root:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Configure the Firebase Web SDK settings and backend API URL using the environment-variable names expected by the frontend source code. You can find the Firebase configuration in the frontend source and obtain the Web App configuration from:

**Firebase Console → Project Settings → General → Your apps → Web app**

Do not guess environment-variable names; use the names referenced by the frontend configuration.

Start the frontend:

```bash
npm run dev
```

Open the local URL shown in the terminal. It is normally:

```text
http://localhost:5173
```

## Running the Complete Application

For local development, keep both terminals running:

| Service | Command | Default URL |
|---|---|---|
| Backend | `cd backend && npm run dev` | http://localhost:5000 |
| Frontend | `cd frontend && npm run dev` | http://localhost:5173 |

Once both services are running, open the frontend in your browser and register or log in.

## API Overview

The backend exposes REST API routes under the `/api` prefix.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | User registration |
| `/` | GET | Backend health check |
| `/api/auth` | Authentication routes |
| `/api/tasks` | Task management routes |
| `/api/categories` | Category management routes |
| `/api/admin` | Administrative routes |

For detailed request bodies, parameters, and response formats, refer to the route and controller files in the `backend` directory.

## Testing

Backend tests use Jest and Supertest.

From the backend directory:

```bash
npm test
```

## Production Deployment

The application can be deployed using the following services:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Firebase Cloud Firestore

### Frontend – Vercel

1. Import the GitHub repository into Vercel.
2. Set the Root Directory to `frontend`.
3. Select the Vite framework preset.
4. Use the build command:

   ```bash
   npm run build
   ```

5. Set the output directory to:

   ```text
   dist
   ```

6. Add the required frontend Firebase configuration and production backend API URL as environment variables.
7. Deploy the application.

### Backend – Render

1. Create a new **Web Service** on Render.
2. Connect the GitHub repository.
3. Set the Root Directory to `backend`.
4. Set the build command:

   ```bash
   npm install
   ```

5. Set the start command:

   ```bash
   npm start
   ```

6. Add the backend environment variables in Render:

   ```env
   NODE_ENV=production
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_SERVICE_ACCOUNT=your_service_account_json
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   ```

   Set `PORT` only if required by your hosting configuration; Render normally provides it automatically.

7. Deploy the service and check its health endpoint.

After deployment, update the frontend's backend API URL to the deployed Render service URL and redeploy the frontend.

**Important:** Use your actual deployed domains and Firebase credentials. Never put service-account credentials in frontend environment variables.

## Security Notes

- Never commit `.env` files.
- Never upload `serviceAccountKey.json`.
- Never expose Firebase Admin SDK credentials in frontend code.
- Configure Firestore security rules before production use.
- Restrict CORS to trusted frontend domains in production.
- Do not share database credentials or private keys publicly.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes.
4. Commit your changes:

   ```bash
   git add .
   git commit -m "Add: describe your changes"
   ```

5. Push your branch:

   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request.

## License

This project currently does not specify an open-source license. Contact the repository owner before redistributing or using it under different licensing terms.

---

**Built with React, TypeScript, Node.js, Express.js, and Firebase.**

Repository: https://github.com/OmkarGhangale-dev/To-do-project-GRP7
