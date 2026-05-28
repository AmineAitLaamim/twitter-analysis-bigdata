import { usePolling } from "../hooks/usePolling"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"


export default function Trending() {
    const { data, loading } = usePolling("/api/hashtags/trending", 30000)
    if (loading) return <p className="p-6 text-gray-500">Loading...</p>

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">🔥 Trending Hashtags</h1>
            <div className="bg-white rounded-xl shadow p-6">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data} layout="vertical" >
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="hashtag" width={140} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )

}