require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const SECRET = process.env.JWT_SECRET || 'changeme123'
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

const app = express()
app.use(express.json())

// CORS allowlist sourced from env FRONTEND_ORIGINS (comma-separated)
const envOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const allowedOrigins = [...new Set(['http://localhost:3000', ...envOrigins])]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) // allow Postman/curl
    if (allowedOrigins.length === 0) return callback(null, true)
    const isAllowed = allowedOrigins.includes(origin)
    return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed)
  },
  credentials: true
}))

mongoose.connect(process.env.MONGODB_URI || '')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message))

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  is_admin: { type: Boolean, default: false }
})

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, default: 'open' },
  created_at: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
})

const commentSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  created_at: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)
const Ticket = mongoose.model('Ticket', ticketSchema)
const Comment = mongoose.model('Comment', commentSchema)

async function seedAdminIfMissing() {
  try {
    const count = await User.countDocuments({ is_admin: true })
    if (count === 0) {
      const hash = await bcrypt.hash('admin123', 10)
      await User.create({ username: 'admin', password: hash, is_admin: true })
      console.log('Admin user created: admin/admin123')
    }
  } catch (err) {
    console.error('Admin seed error:', err.message)
  }
}
seedAdminIfMissing()

function auth(req, res, next) {
  const h = req.headers['authorization']
  if (!h) return res.status(401).json({ error: 'No token' })
  const token = h.split(' ')[1]
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' })
    req.user = user
    next()
  })
}

function adminAuth(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin required' })
  next()
}

app.post('/signup', async (req, res) => {
  try {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
    const hash = await bcrypt.hash(password, 10)
    const user = await User.create({ username, password: hash, is_admin: false })
    const token = jwt.sign({ id: user._id.toString(), username, is_admin: false }, SECRET)
    res.json({ token, is_admin: false, username })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'Username taken' })
    }
    res.status(500).json({ error: 'Signup error' })
  }
})

app.post('/login', async (req, res) => {
  try {
  const { username, password } = req.body
    const user = await User.findOne({ username })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const same = await bcrypt.compare(password, user.password)
    if (!same) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ id: user._id.toString(), username: user.username, is_admin: user.is_admin }, SECRET)
    res.json({ token, is_admin: user.is_admin, username: user.username })
  } catch (err) {
    res.status(500).json({ error: 'Login error' })
  }
})

app.get('/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, is_admin: 1 }).lean()
    res.json(users.map(u => ({ id: u._id, username: u.username, is_admin: u.is_admin })))
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/admin/tickets', auth, adminAuth, async (req, res) => {
  try {
    const tickets = await Ticket.find({}).populate('user', 'username').lean()
    res.json(tickets.map(t => ({ id: t._id, title: t.title, description: t.description, status: t.status, created_at: t.created_at, username: t.user?.username || '' })))
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.post('/tickets', auth, async (req, res) => {
  try {
  const { title, description } = req.body
  if (!title || !title.trim() || !description || !description.trim()) {
    return res.status(400).json({ error: 'Title and description required' })
  }
    const ticket = await Ticket.create({ title, description, status: 'open', user: req.user.id })
    const populated = await Ticket.findById(ticket._id).populate('user', 'username').lean()
    res.json({ id: populated._id, title: populated.title, description: populated.description, status: populated.status, created_at: populated.created_at, username: populated.user?.username || '' })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/tickets', async (req, res) => {
  try {
  const { search, status } = req.query
    const filter = {}
    if (status) filter.status = status
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    const tickets = await Ticket.find(filter).populate('user', 'username').lean()
    res.json(tickets.map(t => ({ id: t._id, title: t.title, description: t.description, status: t.status, created_at: t.created_at, username: t.user?.username || '' })))
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/tickets/:id', async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id).lean()
    if (!t) return res.status(404).json({ error: 'Not found' })
    res.json({ id: t._id, title: t.title, description: t.description, status: t.status, created_at: t.created_at, user_id: t.user?.toString?.() })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/tickets/:id/solution', auth, async (req, res) => {
  try {
    const row = await Ticket.findById(req.params.id).lean()
    if (!row) return res.status(404).json({ error: 'Not found' })
    try {
      const ollamaRes = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'llama2',
        prompt: row.description
      })
      res.json({ solution: ollamaRes.data.response })
    } catch (e) {
      res.status(500).json({ error: 'Ollama error', details: e.message })
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.post('/tickets/:id/comments', auth, async (req, res) => {
  try {
  const { content } = req.body
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment required' })
    const created = await Comment.create({ ticket: req.params.id, user: req.user.id, content })
    const populated = await Comment.findById(created._id).populate('user', 'username').lean()
    res.json({ id: populated._id, ticket_id: req.params.id, user_id: req.user.id, content: populated.content, created_at: populated.created_at, username: populated.user?.username || '' })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/tickets/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ ticket: req.params.id }).sort({ created_at: 1 }).populate('user', 'username').lean()
    res.json(comments.map(c => ({ id: c._id, ticket_id: c.ticket?.toString?.(), user_id: c.user?._id?.toString?.(), content: c.content, created_at: c.created_at, username: c.user?.username || '' })))
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.put('/tickets/:id', auth, async (req, res) => {
  try {
  const { title, description, status } = req.body
  if (!title || !title.trim() || !description || !description.trim()) {
    return res.status(400).json({ error: 'Title and description required' })
  }
    const updated = await Ticket.findByIdAndUpdate(req.params.id, { title, description, status: status || 'open' }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Not found' })
    const t = await Ticket.findById(updated._id).lean()
    res.json({ id: t._id, title: t.title, description: t.description, status: t.status, created_at: t.created_at, user_id: t.user })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.delete('/tickets/:id', auth, async (req, res) => {
  try {
    const r = await Ticket.findByIdAndDelete(req.params.id)
    if (!r) return res.status(404).json({ error: 'Not found' })
    await Comment.deleteMany({ ticket: req.params.id })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT)