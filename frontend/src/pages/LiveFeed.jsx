import { usePolling } from "../hooks/usePolling"

const EMOJI = {
    positive: "😊",
    neutral: "😐",
    negative: "😞",
}

export default function LiveFeed() {
    const { data: tweets, loading} = usePolling("/api/tweets/recent?limit=50", 2000)

    if (loading) {
     return <p className="p-6 text-gray-500">Loading...</p>   
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">🔴 Live Feed</h1>
            <div className="space-y-3">
                {tweets?.map(t => (
                    <div key={t.tweet_id} 
                        className="bg-white rounded-xl p-4 shadow"
                    >
                        <div className="flex justify-between">
                            <span className="text-xs text-gray-400 font-mono">
                                {t.tweet_id.split('_').slice(0,2).join('_')}
                            </span>
                            <span>{EMOJI[t.sentiment] || "😐"}</span>
                        </div>
                        <p className="mt-2">{t.text}</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                            {t.hashtags.map(h => (
                                <span key={h} className="bg-indigo-100 text-indigo-700
                                text-xs px-2 py-1 rounded-full">
                                    {h}
                                </span>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                            ❤️ {t.likes} 🔁 {t.retweets}  📍 {t.location}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}