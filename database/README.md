# TaskFlow – Database Documentation

## 1. Database Overview
TaskFlow uses **Firebase Cloud Firestore**, a NoSQL cloud database, to store user profiles, tasks and categories.

Firebase Authentication manages user login and registration.

## 2. Database Collections

### A. Users Collection
Collection name: `users`

Document ID: Firebase Authentication UID.

| Field | Data Type | Description |
|---|---|---|
| name | String | User's name |
| email | String | User's email |
| role | String | User role |
| accountStatus | String | Account status |
| emailVerified | Boolean | Email verification status |
| createdAt | Timestamp | Account creation time |
| updatedAt | Timestamp | Last update time |

### B. Tasks Collection
Collection name: `tasks`

| Field | Data Type | Description |
|---|---|---|
| userId | String | Owner's Firebase UID |
| title | String | Task title |
| description | String | Task description |
| categoryId | String / Null | Associated category |
| priority | String | Low, Medium or High |
| status | String | Pending, In Progress or Completed |
| dueDate | Timestamp / Null | Task deadline |
| createdAt | Timestamp | Creation time |
| updatedAt | Timestamp | Last update time |

### C. Categories Collection
Collection name: `categories`

| Field | Data Type | Description |
|---|---|---|
| userId | String | Owner's Firebase UID |
| categoryName | String | Category name |
| createdAt | Timestamp | Creation time |

## 3. Relationships

- One user can create multiple tasks.
- One user can create multiple categories.
- Each task belongs to one user.
- A task can optionally be associated with a category through `categoryId`.

## 4. Authentication
Firebase Authentication uses the Email/Password provider.

Each authenticated user has a unique UID. This UID connects the user profile with their tasks and categories.

## 5. Security Rules
Firestore Security Rules protect database records.

- Users can access their own user document.
- Users can create, read, update and delete their own tasks.
- Users can create, read, update and delete their own categories.
- Users cannot access another user's records.
- Unauthenticated users cannot access protected records.
- User documents cannot be deleted through the current security rules.

## 6. Database Configuration Files

| File | Purpose |
|---|---|
| `firebase.json` | Firebase project configuration |
| `.firebaserc` | Firebase project selection |
| `firestore.rules` | Database access permissions |
| `firestore.indexes.json` | Composite index configuration |
| `seed.js` | Database setup placeholder |

## 7. Deployment
Firestore rules and indexes are deployed using:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 8. Technology Used
- Firebase Authentication
- Cloud Firestore
- Firebase CLI
- JavaScript
- JSON