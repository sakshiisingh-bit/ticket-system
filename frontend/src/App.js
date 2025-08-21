import React, { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001'

function App() {
  const [tickets, setTickets] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState(null)
  const [solution, setSolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState('open')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [isAdmin, setIsAdmin] = useState(false)
  const [view, setView] = useState('tickets')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [users, setUsers] = useState([])

  const saveToken = t => {
    setToken(t)
    localStorage.setItem('token', t)
  }
  const logout = () => {
    setToken('')
    localStorage.removeItem('token')
    setIsAdmin(false)
  }

  const auth = e => {
    e.preventDefault()
    setError('')
    setNotif('')
    fetch(`${API}/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(r => {
        if (r.token) {
          saveToken(r.token)
          setIsAdmin(r.is_admin || false)
          setNotif('Logged in')
        } else setError(r.error || 'Auth failed')
      })
      .catch(() => setError('Auth failed'))
  }

  useEffect(() => {
    if (token) {
      const url = statusFilter || search ? 
        `${API}/tickets?${search ? `search=${search}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}` :
        `${API}/tickets`
      fetch(url)
        .then(res => res.json())
        .then(setTickets)
    }
  }, [token, search, statusFilter])

  const createTicket = e => {
    e.preventDefault()
    setError('')
    setNotif('')
    if (!title.trim() || !description.trim()) {
      setError('Title and description required')
      return
    }
    setCreating(true)
    fetch(`${API}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ title, description })
    })
      .then(res => res.json())
      .then(t => {
        if (t.error) setError(t.error)
        else {
          setTickets([...tickets, t])
          setTitle('')
          setDescription('')
          setNotif('Ticket created')
        }
        setCreating(false)
      })
      .catch(() => {
        setError('Failed to create ticket')
        setCreating(false)
      })
  }

  const loadComments = id => {
    fetch(`${API}/tickets/${id}/comments`)
      .then(res => res.json())
      .then(c => setComments({...comments, [id]: c}))
  }

  const addComment = (ticketId) => {
    if (!newComment.trim()) return
    fetch(`${API}/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ content: newComment })
    })
      .then(res => res.json())
      .then(c => {
        setComments({...comments, [ticketId]: [...(comments[ticketId] || []), c]})
        setNewComment('')
      })
  }

  const loadUsers = () => {
    fetch(`${API}/admin/users`, { headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.json())
      .then(setUsers)
  }

  const saveEdit = e => {
    e.preventDefault()
    setError('')
    setNotif('')
    if (!editTitle.trim() || !editDesc.trim()) {
      setError('Title and description required')
      return
    }
    fetch(`${API}/tickets/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ title: editTitle, description: editDesc, status: editStatus })
    })
      .then(res => res.json())
      .then(t => {
        if (t.error) setError(t.error)
        else {
          setTickets(tickets.map(x => x.id === editId ? t : x))
          setNotif('Ticket updated')
          setEditId(null)
        }
      })
      .catch(() => setError('Failed to update ticket'))
  }

  const delTicket = id => {
    if (!window.confirm('Delete this ticket?')) return
    fetch(`${API}/tickets/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.json())
      .then(r => {
        if (r.success) {
          setTickets(tickets.filter(t => t.id !== id))
          setNotif('Ticket deleted')
        } else setError('Delete failed')
      })
      .catch(() => setError('Delete failed'))
  }

  const showSolution = id => {
    setLoading(true)
    setSolution('')
    setError('')
    fetch(`${API}/tickets/${id}/solution`, { headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => {
        setSolution(data.solution || data.error)
        setSelected(id)
        setLoading(false)
      })
      .catch(() => {
        setSolution('')
        setError('Failed to fetch solution')
        setLoading(false)
      })
  }

  if (!token) return (
    <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={auth} style={{ marginBottom: 20 }}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required style={{ width: '100%', marginBottom: 8 }} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" required style={{ width: '100%', marginBottom: 8 }} />
        <button type="submit">{authMode === 'login' ? 'Login' : 'Sign Up'}</button>
      </form>
      <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ marginBottom: 10 }}>
        {authMode === 'login' ? 'Create an account' : 'Already have an account? Login'}
      </button>
      {notif && <div style={{ color: 'green', marginBottom: 10 }}>{notif}</div>}
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
    </div>
  )

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'right', marginBottom: 10 }}>
        <span style={{ marginRight: 10 }}>Logged in as {username}</span>
        {isAdmin && <button onClick={() => setView('admin')} style={{ marginRight: 10 }}>Admin Panel</button>}
        <button onClick={() => setView('tickets')} style={{ marginRight: 10 }}>Tickets</button>
        <button onClick={logout}>Logout</button>
      </div>

      {view === 'admin' && isAdmin && (
        <div>
          <h2>Admin Panel</h2>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <h3>Users</h3>
              <button onClick={loadUsers}>Load Users</button>
              <ul>
                {users.map(u => (
                  <li key={u.id}>{u.username} {u.is_admin ? '(Admin)' : ''}</li>
                ))}
              </ul>
            </div>
            <div style={{ flex: 1 }}>
              <h3>All Tickets</h3>
              <ul>
                {tickets.map(t => (
                  <li key={t.id}>
                    <b>{t.title}</b> by {t.username} - {t.status}
                    <button onClick={() => delTicket(t.id)} style={{ marginLeft: 5 }}>Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {view === 'tickets' && (
        <>
          <h2>Create Ticket</h2>
          <form onSubmit={createTicket} style={{ marginBottom: 30 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required style={{ width: '100%', marginBottom: 8 }} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" required style={{ width: '100%', marginBottom: 8 }} />
            <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
          </form>

          <div style={{ marginBottom: 20 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." style={{ marginRight: 10 }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {notif && <div style={{ color: 'green', marginBottom: 10 }}>{notif}</div>}
          {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

          <h2>Tickets</h2>
          <ul>
            {tickets.map(t => (
              <li key={t.id} style={{ marginBottom: 20, border: '1px solid #ccc', padding: 10 }}>
                {editId === t.id ? (
                  <form onSubmit={saveEdit} style={{ display: 'inline' }}>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: 100 }} />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: 200 }} />
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                      <option value="open">open</option>
                      <option value="closed">closed</option>
                    </select>
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setEditId(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <div>
                      <b>{t.title}</b> by {t.username} - {t.description} 
                      <span style={{ color: t.status === 'closed' ? 'red' : 'green' }}> [{t.status}]</span>
                      <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</span>
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <button onClick={() => showSolution(t.id)} disabled={loading && selected === t.id}>
                        {loading && selected === t.id ? 'Loading...' : 'Get Solution'}
                      </button>
                      <button onClick={() => { setEditId(t.id); setEditTitle(t.title); setEditDesc(t.description); setEditStatus(t.status || 'open'); }} style={{ marginLeft: 5 }}>Edit</button>
                      <button onClick={() => delTicket(t.id)} style={{ marginLeft: 5 }}>Delete</button>
                      <button onClick={() => loadComments(t.id)} style={{ marginLeft: 5 }}>Comments</button>
                    </div>
                    {selected === t.id && solution && (
                      <div style={{ marginTop: 5, color: '#333', background: '#eee', padding: 10 }}>
                        {solution}
                      </div>
                    )}
                    {comments[t.id] && (
                      <div style={{ marginTop: 10 }}>
                        <h4>Comments:</h4>
                        {comments[t.id].map(c => (
                          <div key={c.id} style={{ marginBottom: 5, padding: 5, background: '#f9f9f9' }}>
                            <b>{c.username}</b>: {c.content}
                            <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{new Date(c.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 5 }}>
                          <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add comment..." style={{ width: 200 }} />
                          <button onClick={() => addComment(t.id)}>Add</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default App;
