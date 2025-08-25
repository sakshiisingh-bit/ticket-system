# Ticket System with Ollama AI

## Features
- User login/signup with JWT
- Create, edit, delete tickets
- Ticket status (open/closed)
- AI solutions using Ollama
- MongoDB database
- Admin panel
- Search and filter tickets
- Comments on tickets

## Prerequisites
- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/) (optional)
- [Ollama](https://ollama.com/download) (for AI solutions)
- MongoDB Atlas account

## Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo>
cd "Ticket system"
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tickets
JWT_SECRET=your-secret-key
OLLAMA_URL=http://localhost:11434
```

Start backend:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001
```

Start frontend:
```bash
npm start
```

### 4. Ollama Setup
```bash
ollama serve
ollama pull llama2
```

## Docker Deployment

1. Set environment variables:
   ```bash
   set MONGODB_URI=your_atlas_uri
   docker-compose up --build
   ```

2. Make sure Ollama is running on your host at `localhost:11434`.

## Default Admin User
- Username: `admin`
- Password: `admin123`
- **Important**: Change this password after first login!

## API Endpoints

### Auth
- `POST /signup` - User registration
- `POST /login` - User authentication

### Tickets
- `GET /tickets` - List tickets (with search & status filters)
- `POST /tickets` - Create new ticket
- `GET /tickets/:id` - Get ticket details
- `PUT /tickets/:id` - Update ticket
- `DELETE /tickets/:id` - Delete ticket
- `GET /tickets/:id/solution` - Get AI solution

### Comments
- `GET /tickets/:id/comments` - Get ticket comments
- `POST /tickets/:id/comments` - Add comment

### Admin
- `GET /admin/users` - List all users
- `GET /admin/tickets` - List all tickets

## Environment Variables

### Backend
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret for JWT tokens
- `OLLAMA_URL` - Ollama API endpoint
- `MONGODB_DB` - Database name (optional)

### Frontend
- `REACT_APP_API_URL` - Backend API base URL

## Security Notes
- Change default admin password
- Use strong JWT_SECRET in production
- Whitelist IPs in MongoDB Atlas
- Set proper CORS origins for production

---

**🎉 Your Ticket System is now complete and ready to use!**
