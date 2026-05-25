// Hook React personnalisé permettant de récupérer automatiquement
// des données depuis une API à intervalle régulier.
// Il sert à faire du polling (rafraîchissement automatique des données)
// pour afficher des statistiques en temps réel dans le dashboard.
import { useState, useEffect } from "react"

export function usePolling(url, interval = 5000) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(url)
        const json = await res.json()
        setData(json)
      } catch {
        // API pas encore prête — on garde les données mockées
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const timer = setInterval(fetchData, interval)
    return () => clearInterval(timer)
  }, [url, interval])

  return { data, loading }
}