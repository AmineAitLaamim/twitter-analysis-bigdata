// Hook React personnalisé permettant de récupérer automatiquement
// des données depuis une API à intervalle régulier.
// Il sert à faire du polling (rafraîchissement automatique des données)
// pour afficher des statistiques en temps réel dans le dashboard.
import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export function usePolling(url, ms = 30000) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}${url}`)
        setData(res.data)
        setError(null)
        setLoading(false)
      } catch (e) {
        console.error(e)
        setError(e)
        setLoading(false)
      }
    }

    fetch()
    const id = setInterval(fetch, ms)
    return () => clearInterval(id)
  }, [url, ms])

  return { data, loading, error }
}