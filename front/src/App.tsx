import { useEffect, useState } from 'react'
import axios from 'axios'

interface Guide {
  id: number
  title: string
  game: string
  content: string
  difficulty: string
  created_at: string
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Facile: '#22c55e',
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
    if (!window.confirm('Tu es sûr?')) return
    
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
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => setSelected(null)}
        style={{ marginBottom: '1.5rem', cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}>
        ← Retour
      </button>
      <span style={{
        background: DIFFICULTY_COLOR[selected.difficulty] + '22',
        color: DIFFICULTY_COLOR[selected.difficulty],
        padding: '3px 10px', borderRadius: 6, fontSize: 13
      }}>{selected.difficulty}</span>
      <h1 style={{ margin: '0.5rem 0' }}>{selected.title}</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>
        {selected.game} · {new Date(selected.created_at).toLocaleDateString()}
      </p>
      <p style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selected.content}</p>
      <button onClick={() => deleteGuide(selected.id)}
        style={{ marginTop: '2rem', color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none', fontSize: 14 }}>
        Supprimer ce guide
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>ggguide</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: 14 }}>
          {showForm ? 'Annuler' : '+ Nouveau guide'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1.5rem', fontSize: 14 }}>
          {error}
        </div>
      )}

      {loading && (
        <p style={{ color: '#888', textAlign: 'center', marginBottom: '1.5rem' }}>Chargement...</p>
      )}

      {showForm && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem', marginBottom: '2rem' }}>
          <input placeholder="Titre du guide" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            style={{ width: '100%', marginBottom: 10, padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', boxSizing: 'border-box' }}/>
          <input placeholder="Nom du jeu" value={form.game}
            onChange={e => setForm({ ...form, game: e.target.value })}
            style={{ width: '100%', marginBottom: 10, padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', boxSizing: 'border-box' }}/>
          <textarea placeholder="Contenu du guide..." value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            rows={4}
            style={{ width: '100%', marginBottom: 10, padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', boxSizing: 'border-box', resize: 'vertical' }}/>
          <select value={form.difficulty}
            onChange={e => setForm({ ...form, difficulty: e.target.value })}
            style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
            <option>Facile</option>
            <option>Moyen</option>
            <option>Difficile</option>
          </select>
          <br/>
          <button onClick={submit} style={{ cursor: 'pointer', marginTop: 6, background: 'none', border: 'none', fontSize: 14, color: '#2563eb' }}>
            Publier le guide
          </button>
        </div>
      )}

      {guides.length === 0 && !loading && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: '3rem' }}>
          Aucun guide pour l'instant — crées-en un !
        </p>
      )}

      {guides.map(g => (
        <div key={g.id} onClick={() => setSelected(g)}
          style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 12, cursor: 'pointer', transition: 'all 0.2s', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>{g.title}</span>
            <span style={{
              background: DIFFICULTY_COLOR[g.difficulty] + '22',
              color: DIFFICULTY_COLOR[g.difficulty],
              padding: '2px 8px', borderRadius: 6, fontSize: 12
            }}>{g.difficulty}</span>
          </div>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>{g.game}</p>
        </div>
      ))}
    </div>
  )
}
