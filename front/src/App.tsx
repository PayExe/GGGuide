import { useEffect, useState } from 'react'
import axios from 'axios'
import './index.css'

interface Guide {
  id: number
  title: string
  game: string
  content: string
  difficulty: string
  created_at: string
}

const API = axios.create({
  baseURL: import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '',
  timeout: 10000,
})

export default function App() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [selected, setSelected] = useState<Guide | null>(null)
  const [form, setForm] = useState({ title: '', game: '', content: '', difficulty: 'Facile' })
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGuides()
  }, [])

  async function fetchGuides() {
    try {
      setLoading(true)
      setError(null)
      const res = await API.get('/api/guides')
      setGuides(res.data)
    } catch {
      setError('Connexion impossible au serveur')
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
    if (!form.title || !form.game || !form.content) {
      setError('Tous les champs sont requis')
      return
    }
    try {
      setError(null)
      await API.post('/api/guides', form)
      setForm({ title: '', game: '', content: '', difficulty: 'Facile' })
      setShowForm(false)
      fetchGuides()
    } catch {
      setError('Erreur lors de la création')
    }
  }

  async function deleteGuide(id: number) {
    if (!confirm('Supprimer ce guide ?')) return
    try {
      await API.delete(`/api/guides/${id}`)
      setSelected(null)
      fetchGuides()
    } catch {
      setError('Erreur lors de la suppression')
    }
  }

  if (selected) {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">GG<span>Guide</span></div>
        </header>
        <main className="main">
          <div className="back" onClick={() => setSelected(null)}>← Retour</div>
          <div className="detail">
            <div className="detail-header">
              <div className="detail-badge">
                <span className={`badge badge-${badge(selected.difficulty)}`}>{selected.difficulty}</span>
              </div>
              <h1 className="detail-title">{selected.title}</h1>
              <p className="detail-meta">{selected.game} · {new Date(selected.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <p className="detail-content">{selected.content}</p>
            <div className="detail-actions">
              <button className="btn btn-danger" onClick={() => deleteGuide(selected.id)}>Supprimer</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">GG<span>Guide</span></div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouveau'}
        </button>
      </header>
      <main className="main">
        {error && <div className="error">{error}</div>}

        {loading && <div className="loading">Chargement...</div>}

        {showForm && (
          <div className="form">
            <h2 className="form-title">Nouveau guide</h2>
            <div className="form-group">
              <label className="form-label">Titre</label>
              <input className="form-input" placeholder="Titre du guide" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Jeu</label>
              <input className="form-input" placeholder="Nom du jeu" value={form.game} onChange={e => setForm({...form, game: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Contenu</label>
              <textarea className="form-textarea" placeholder="Contenu du guide" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Difficulté</label>
              <select className="form-select" value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
                <option>Facile</option>
                <option>Moyen</option>
                <option>Difficile</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={submit}>Publier</button>
          </div>
        )}

        {!loading && guides.length === 0 && (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <p className="empty-title">Aucun guide</p>
            <p className="empty-text">Crée le premier pour commencer</p>
          </div>
        )}

        <div className="guides">
          {guides.map(g => (
            <div key={g.id} className="guide" onClick={() => setSelected(g)}>
              <div className="guide-top">
                <div>
                  <h3 className="guide-title">{g.title}</h3>
                  <p className="guide-game">{g.game}</p>
                </div>
                <span className={`badge badge-${badge(g.difficulty)}`}>{g.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function badge(difficulty: string): string {
  if (difficulty === 'Facile') return 'success'
  if (difficulty === 'Moyen') return 'warning'
  return 'danger'
}
