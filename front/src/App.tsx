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

const DIFFICULTY_COLOR: Record<string, string> = {
  Facile: '#10b981',
  Moyen: '#f59e0b',
  Difficile: '#ef4444',
}

const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || window.location.origin
  }
  return ''
}

const API = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
})

export default function App() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [selected, setSelected] = useState<Guide | null>(null)
  const [form, setForm] = useState({
    title: '', game: '', content: '', difficulty: 'Facile'
  })
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGuides = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await API.get('/api/guides')
      setGuides(res.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion au serveur'
      setError(message)
      console.error('Erreur fetch guides:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGuides() }, [])

  const submit = async () => {
    if (!form.title || !form.game || !form.content) {
      setError('Tous les champs sont obligatoires')
      return
    }

    try {
      setError(null)
      await API.post('/api/guides', form)
      setForm({ title: '', game: '', content: '', difficulty: 'Facile' })
      setShowForm(false)
      await fetchGuides()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création'
      setError(message)
      console.error('Erreur submit:', err)
    }
  }

  const deleteGuide = async (id: number) => {
    if (!window.confirm('Tu es sûr de vouloir supprimer ce guide?')) return
    
    try {
      setError(null)
      await API.delete(`/api/guides/${id}`)
      setSelected(null)
      await fetchGuides()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setError(message)
      console.error('Erreur delete:', err)
    }
  }

  if (selected) return (
    <div className="container guide-detail">
      <button className="back-btn" onClick={() => setSelected(null)}>
        ← Retour
      </button>

      <div style={{ marginBottom: '1rem' }}>
        <span className={`badge badge-${getDifficultyClass(selected.difficulty)}`}>
          {selected.difficulty}
        </span>
      </div>

      <h1>{selected.title}</h1>

      <p className="meta">
        {selected.game} · {new Date(selected.created_at).toLocaleDateString('fr-FR')}
      </p>

      <p className="content">{selected.content}</p>

      <button className="btn btn-danger" onClick={() => deleteGuide(selected.id)}>
        Supprimer ce guide
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="header">
        <h1>GGGuide</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouveau guide'}
        </button>
      </header>

      <main className="container" style={{ flex: 1 }}>
        {error && (
          <div className="error">{error}</div>
        )}

        {loading && (
          <div className="loading">Chargement des guides...</div>
        )}

        {showForm && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2>Créer un nouveau guide</h2>

            <div className="form-group">
              <label>Titre du guide</label>
              <input 
                placeholder="Ex: Comment farmer des ressources"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>Nom du jeu</label>
              <input 
                placeholder="Ex: Elden Ring"
                value={form.game}
                onChange={e => setForm({ ...form, game: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>Contenu du guide</label>
              <textarea 
                placeholder="Décris ton guide en détail..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={5}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>Difficulté</label>
              <select 
                value={form.difficulty}
                onChange={e => setForm({ ...form, difficulty: e.target.value })}
                style={{ width: '100%' }}
              >
                <option>Facile</option>
                <option>Moyen</option>
                <option>Difficile</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={submit}>
              Publier le guide
            </button>
          </div>
        )}

        {!loading && guides.length === 0 && (
          <div className="empty-state">
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</p>
            <p>Aucun guide pour l'instant</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Crée le premier guide et partage tes astuces!</p>
          </div>
        )}

        <ul className="guide-list">
          {guides.map(g => (
            <li key={g.id}>
              <div 
                className="card guide-item"
                onClick={() => setSelected(g)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <h2 style={{ marginBottom: '0.5rem' }}>{g.title}</h2>
                    <p style={{ color: 'var(--text-lighter)', fontSize: '0.875rem' }}>
                      {g.game}
                    </p>
                  </div>
                  <span className={`badge badge-${getDifficultyClass(g.difficulty)}`}>
                    {g.difficulty}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case 'Facile': return 'success'
    case 'Moyen': return 'warning'
    case 'Difficile': return 'danger'
    default: return 'success'
  }
}
