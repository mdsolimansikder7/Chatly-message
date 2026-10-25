# Chatly 💬 — Full-Stack Real-Time Messaging Application

Chatly is a full-stack messaging application designed for real-time communication. It combines a React frontend with a Node.js and Express backend, MongoDB data storage, authentication, and Socket.IO-powered real-time events.

## 🔗 Project Links

| Component | Repository |
|---|---|
| Frontend | [Chatly-message](https://github.com/mdsolimansikder7/Chatly-message) |
| Backend | [chatly-backend](https://github.com/mdsolimansikder7/chatly-backend) |
| Frontend Deployment | [Chatly Web App](https://chatly-message.vercel.app) |
| Backend API | [Chatly API](https://chatly-backend-pi.vercel.app) |

## ✨ Features

- 🔐 User registration and login
- 🔑 JWT-based API authentication
- Google OAuth integration using Better Auth
- 💬 Conversations and messaging
- ⚡ Real-time communication with Socket.IO
- 👥 User profiles and friend requests
- 🟢 Online status and typing indicators
- 👁️ Message-seen events
- 😀 Message reactions and emoji picker
- 📎 File upload functionality
- 📞 Call signaling and call-history endpoints
- 🎨 Light and dark theme preferences
- 🌐 Interface language support
- 📱 Responsive user interface

Feature availability depends on the configured backend, database, OAuth providers, and deployment environment.

## 🛠️ Technology Stack

### Frontend

- React 19
- Vite 7
- React Router
- Tailwind CSS 4
- Axios
- Socket.IO Client
- Better Auth client
- React Icons
- emoji-picker-react

### Backend

- Node.js
- Express 5
- MongoDB
- Mongoose
- Socket.IO
- Better Auth
- Google OAuth
- JSON Web Tokens (JWT)
- bcryptjs
- Multer
- CORS
- dotenv

### Infrastructure

- Vercel for the frontend deployment
- MongoDB for persistent application data
- Node.js-compatible hosting for persistent Socket.IO connections

## 🏗️ System Architecture

```text
                 Chatly Full Stack
                        |
          +-------------+-------------+
          |                           |
     Frontend                     Backend
   React + Vite               Node.js + Express
          |                           |
          |------ REST API -----------|
          |                           |
          |------ Socket.IO ----------|
                                      |
                          +-----------+-----------+
                          |           |           |
                       MongoDB    Better Auth    JWT
                          |
                  Application Data
```

The frontend and backend are maintained in separate GitHub repositories and communicate through HTTP APIs and Socket.IO.

## 📁 Repository Structure

### Frontend

```text
Chatly-message/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── package.json
├── vercel.json
└── vite.config.js
```

### Backend

```text
chatly-backend/
├── config/
│   ├── betterAuth.js
│   └── db.js
├── controllers/
├── middleware/
├── models/
├── routes/
├── socket/
│   ├── callHandler.js
│   └── socketHandler.js
├── utils/
├── app.js
├── index.js
├── server.js
├── .env.example
├── package.json
└── vercel.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB or MongoDB Atlas
- Google OAuth credentials for Google sign-in

### 1. Clone Both Repositories

```bash
git clone https://github.com/mdsolimansikder7/Chatly-message.git
git clone https://github.com/mdsolimansikder7/chatly-backend.git
```

### 2. Configure the Backend

```bash
cd chatly-backend
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the backend `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/chatly
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_SECRET=replace-with-a-random-secret-at-least-32-characters-long
API_BASE_URL=http://localhost:5000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Use real values for your environment. Never commit secrets or credentials to GitHub.

Start the backend:

```bash
npm run dev
```

The backend normally runs at `http://localhost:5000`.

### 3. Configure the Frontend

Open a second terminal:

```bash
cd Chatly-message
npm install
```

Create the frontend environment file:

```bash
cp .env.example .env
```

Set the backend URL:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Keep both servers running while developing locally.

## 🔑 Environment Variables

### Backend

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `CLIENT_URL` | Frontend origin |
| `FRONTEND_URL` | Additional frontend origin, if configured |
| `BETTER_AUTH_URL` | Better Auth base URL |
| `BETTER_AUTH_SECRET` | Better Auth secret |
| `API_BASE_URL` | Public backend URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

Refer to the backend repository's `.env.example` for the canonical environment variable list.

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend origin used by API and Socket.IO clients |

**Security:** Variables beginning with `VITE_` are exposed to client-side code. Never place database passwords or private OAuth secrets in frontend environment variables.

## 📡 API Overview

The backend provides route groups under `/api`.

| Route | Purpose |
|---|---|
| `/api/auth` | Registration, login and OAuth flows |
| `/api/users` | User-related operations |
| `/api/friends` | Friend requests and relationships |
| `/api/conversations` | Conversation management |
| `/api/messages` | Message operations |
| `/api/upload` | File uploads |
| `/api/calls` | Call-history operations |
| `/api/better-auth` | Better Auth integration |

For exact request payloads, response formats, and authorization requirements, consult the backend route and controller files.

## ⚡ Real-Time Communication

Socket.IO connects the frontend to the backend for real-time events.

The backend includes event handlers for:

- Sending and receiving messages
- Typing indicators
- Message-seen updates
- Online and offline status
- Call offers and answers
- Call acceptance, rejection, and termination
- ICE signaling and call status

The frontend and backend must use matching event names and payload structures.

## 🌐 Deployment

### Frontend

Deploy the frontend repository to Vercel:

1. Import `Chatly-message`.
2. Configure `VITE_API_URL` with the backend origin.
3. Verify OAuth rewrites and callback configuration.
4. Deploy and test the application.

### Backend

The backend needs a reachable MongoDB database and correctly configured environment variables.

For production real-time communication, use a hosting service that supports persistent WebSocket connections. The current Vercel serverless configuration should be reviewed before relying on persistent Socket.IO sessions.

Ensure that:

- CORS allows the deployed frontend origin.
- MongoDB is accessible from the backend.
- Google OAuth callback URLs match the deployed configuration.
- Secrets are configured in the hosting dashboard.
- Uploaded files use durable storage when persistence is required.

## 🔒 Security

- Keep `.env` files and private credentials out of Git.
- Use strong, unique secrets.
- Restrict CORS to trusted frontend origins.
- Verify authorization for every protected API and socket action.
- Validate uploaded files.
- Use HTTPS in production.
- Avoid storing persistent uploads on temporary serverless disk storage.

## 👨‍💻 Author

**Md. Soliman Sikder**

- GitHub: [@mdsolimansikder7](https://github.com/mdsolimansikder7)
- Frontend: [Chatly-message](https://github.com/mdsolimansikder7/Chatly-message)
- Backend: [chatly-backend](https://github.com/mdsolimansikder7/chatly-backend)

## 📄 License

No license file is currently specified in the repositories. Contact the author for permission to reuse or redistribute the project unless a license is added.

---

**Built with ❤️ by Md. Soliman Sikder**
