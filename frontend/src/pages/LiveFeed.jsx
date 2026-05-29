import { useState } from "react"
import { usePolling } from "../hooks/usePolling"

const SENTIMENT_STYLING = {
  positive: {
    label: "Positive",
    icon: "😊",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.2)",
    text: "#065f46"
  },
  neutral: {
    label: "Neutral",
    icon: "😐",
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.08)",
    border: "rgba(100, 116, 139, 0.2)",
    text: "#334155"
  },
  negative: {
    label: "Negative",
    icon: "😞",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.2)",
    text: "#991b1b"
  }
}

export default function LiveFeed() {
  const { data: rawTweets, loading } = usePolling("/api/tweets/recent?limit=50", 2500)
  
  // Track local engagement interaction state
  const [likesState, setLikesState] = useState({})
  const [retweetsState, setRetweetsState] = useState({})
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [sentimentFilter, setSentimentFilter] = useState("all")

  // Helper to extract deterministic initials and background gradient based on User ID
  const getAvatarDetails = (tweetId) => {
    const parts = tweetId.split("_")
    let userNum = "1"
    if (parts.length > 2) {
      userNum = parts[2]
    }
    const num = parseInt(userNum) || 1
    const gradients = [
      "linear-gradient(135deg, #6366f1, #a855f7)", // Indigo to Purple
      "linear-gradient(135deg, #10b981, #059669)", // Emerald to Green
      "linear-gradient(135deg, #f59e0b, #d97706)", // Amber to Gold
      "linear-gradient(135deg, #ec4899, #be185d)", // Pink to Rose
      "linear-gradient(135deg, #3b82f6, #1d4ed8)", // Blue to Cobalt
      "linear-gradient(135deg, #06b6d4, #0891b2)"  // Cyan to Teal
    ]
    const gradient = gradients[num % gradients.length]
    return {
      displayName: `User ${userNum}`,
      handle: `@user_${userNum}`,
      initials: `U${userNum}`,
      gradient
    }
  }

  // Handle local likes
  const handleLike = (id) => {
    setLikesState(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }))
  }

  // Handle local retweets
  const handleRetweet = (id) => {
    setRetweetsState(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }))
  }

  // Pre-process and sanitize tweets
  const tweets = rawTweets || []

  // Derived metrics from current tweets session pool (unfiltered for accurate metrics overview)
  const totalTweetsInSession = tweets.length
  const positiveTweets = tweets.filter(t => t.sentiment === "positive").length
  const neutralTweets = tweets.filter(t => t.sentiment === "neutral").length
  const negativeTweets = tweets.filter(t => t.sentiment === "negative").length
  
  const positivityRate = totalTweetsInSession > 0 
    ? Math.round((positiveTweets / totalTweetsInSession) * 100) 
    : 0

  // Filter tweets list
  const filteredTweets = tweets.filter(t => {
    const avatar = getAvatarDetails(t.tweet_id)
    const matchesSearch = 
      t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.location && t.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.hashtags && t.hashtags.some(h => h.toLowerCase().includes(searchQuery.toLowerCase())))

    const matchesSentiment = 
      sentimentFilter === "all" || 
      t.sentiment === sentimentFilter

    return matchesSearch && matchesSentiment
  })

  // Styles
  const pageContainer = {
    maxWidth: 780,
    margin: "0 auto",
    padding: "0 8px 48px",
    display: "flex",
    flexDirection: "column",
    gap: 20
  }

  const headerCard = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0"
  }

  const liveBadge = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 11,
    color: "#16a34a",
    fontWeight: 600
  }

  const statsRow = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    background: "#ffffff",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #e2e8f0"
  }

  const statItem = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    borderRight: "1px solid #f1f5f9",
    paddingLeft: 8
  }

  const controlsCard = {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14
  }

  const searchWrapper = {
    position: "relative",
    display: "flex",
    alignItems: "center"
  }

  const searchInput = {
    width: "100%",
    padding: "10px 14px 10px 36px",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 12,
    color: "#0f172a",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s"
  }

  const filterTabs = {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 2
  }

  const tabStyle = (active, color) => ({
    padding: "8px 14px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    background: active ? color + "15" : "transparent",
    border: `1px solid ${active ? color : "#e2e8f0"}`,
    color: active ? color : "#64748b",
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap"
  })

  const tweetCard = {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    display: "flex",
    gap: 14,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)"
  }

  const avatarCircle = (gradient) => ({
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)"
  })

  const hashtagPill = {
    background: "#eef2ff",
    color: "#4f46e5",
    border: "1px solid #e0e7ff",
    padding: "3px 10px",
    borderRadius: 15,
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s"
  }

  const actionButton = (active, color) => ({
    background: "transparent",
    border: "none",
    color: active ? color : "#94a3b8",
    fontSize: 12,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    padding: "6px 10px",
    borderRadius: 6,
    transition: "all 0.15s",
    outline: "none"
  })

  // RENDER LOADING SHIMMER STATE
  if (loading && tweets.length === 0) {
    return (
      <div style={pageContainer} className="animate-fade-in">
        <div style={headerCard}>
          <div style={{ width: 120, height: 24, borderRadius: 4 }} className="shimmer-bg" />
          <div style={{ width: 100, height: 28, borderRadius: 20 }} className="shimmer-bg" />
        </div>
        <div style={statsRow}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: 60, height: 10, borderRadius: 2 }} className="shimmer-bg" />
              <div style={{ width: 100, height: 22, borderRadius: 4 }} className="shimmer-bg" />
            </div>
          ))}
        </div>
        <div style={controlsCard}>
          <div style={{ width: "100%", height: 36, borderRadius: 8 }} className="shimmer-bg" />
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ width: 80, height: 28, borderRadius: 6 }} className="shimmer-bg" />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ ...tweetCard, height: 140 }} className="shimmer-bg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={pageContainer} className="animate-fade-in">
      
      {/* 1. PULSING LIVE HEADER */}
      <div style={headerCard}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3 }}>
            Live Stream Analysis
          </h2>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Simulated high-velocity HBase feed ingestion
          </p>
        </div>
        <div style={liveBadge}>
          <span className="pulse-dot" />
          <span>LIVE PIPELINE</span>
        </div>
      </div>

      {/* 2. LIVE METRICS SUMMARY OVERVIEW */}
      <div style={statsRow}>
        <div style={statItem}>
          <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.6 }}>
            SESSION VOLUME
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
            {totalTweetsInSession}
            <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>tweets</span>
          </span>
        </div>
        
        <div style={statItem}>
          <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.6 }}>
            POSITIVITY RATE
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
            {positivityRate}%
          </span>
          {/* Sentiment Ratio Bar */}
          <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", marginTop: 4, width: "80%" }}>
            <div style={{ background: "#10b981", width: `${(positiveTweets/totalTweetsInSession)*100 || 33}%` }} />
            <div style={{ background: "#64748b", width: `${(neutralTweets/totalTweetsInSession)*100 || 34}%` }} />
            <div style={{ background: "#ef4444", width: `${(negativeTweets/totalTweetsInSession)*100 || 33}%` }} />
          </div>
        </div>

        <div style={{ ...statItem, borderRight: "none" }}>
          <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.6 }}>
            CURRENT RATE
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
            2.5s
            <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>poll refresh</span>
          </span>
        </div>
      </div>

      {/* 3. SEARCH & SENTIMENT CONTROLS PANEL */}
      <div style={controlsCard}>
        <div style={searchWrapper}>
          <i className="ti ti-search" style={{ position: "absolute", left: 13, color: "#94a3b8", fontSize: 14 }} aria-hidden="true" />
          <input
            style={searchInput}
            type="text"
            placeholder="Search tweet text, users, locations, or hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 12, background: "transparent",
                border: "none", cursor: "pointer", color: "#64748b", fontSize: 12
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={filterTabs}>
          <button 
            style={tabStyle(sentimentFilter === "all", "#6366f1")}
            onClick={() => setSentimentFilter("all")}
          >
            📊 All ({totalTweetsInSession})
          </button>
          <button 
            style={tabStyle(sentimentFilter === "positive", "#10b981")}
            onClick={() => setSentimentFilter("positive")}
          >
            😊 Positive ({positiveTweets})
          </button>
          <button 
            style={tabStyle(sentimentFilter === "neutral", "#64748b")}
            onClick={() => setSentimentFilter("neutral")}
          >
            😐 Neutral ({neutralTweets})
          </button>
          <button 
            style={tabStyle(sentimentFilter === "negative", "#ef4444")}
            onClick={() => setSentimentFilter("negative")}
          >
            😞 Negative ({negativeTweets})
          </button>
        </div>
      </div>

      {/* 4. REAL-TIME TWEET CARDS FEED */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredTweets.length > 0 ? (
          filteredTweets.map(t => {
            const avatar = getAvatarDetails(t.tweet_id)
            const sentiment = SENTIMENT_STYLING[t.sentiment] || SENTIMENT_STYLING.neutral
            
            // Calculate final likes and retweets including local clicks
            const extraLikes = likesState[t.tweet_id] || 0
            const extraRetweets = retweetsState[t.tweet_id] || 0
            const totalLikes = t.likes + extraLikes
            const totalRetweets = t.retweets + extraRetweets

            return (
              <div 
                key={t.tweet_id} 
                style={tweetCard} 
                className="hover-lift animate-slide-up"
              >
                {/* Profile Avatar Column */}
                <div style={avatarCircle(avatar.gradient)}>
                  {avatar.initials}
                </div>

                {/* Content Column */}
                <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 6 }}>
                  
                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        {avatar.displayName}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>
                        {avatar.handle}
                      </span>
                    </div>
                    
                    {/* Sentiment Glowing Pill */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 20,
                      fontSize: 10, fontWeight: 600,
                      background: sentiment.bg,
                      border: `1px solid ${sentiment.border}`,
                      color: sentiment.text
                    }}>
                      <span>{sentiment.icon}</span>
                      <span>{sentiment.label}</span>
                    </div>
                  </div>

                  {/* Body Text */}
                  <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, margin: "2px 0 4px" }}>
                    {t.text}
                  </p>

                  {/* Hashtags Row */}
                  {t.hashtags && t.hashtags.length > 0 && t.hashtags[0] !== "" && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0" }}>
                      {t.hashtags.map(h => (
                        <span 
                          key={h} 
                          style={hashtagPill} 
                          className="hover-lift"
                          onClick={() => setSearchQuery(h)}
                        >
                          {h.startsWith("#") ? h : `#${h}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ height: 1, background: "#f1f5f9", margin: "6px 0" }} />

                  {/* Footer Interaction Controls Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                      {/* Interactive Like Button */}
                      <button 
                        style={actionButton(extraLikes > 0, "#ec4899")}
                        onClick={() => handleLike(t.tweet_id)}
                        className="hover-lift"
                      >
                        <i className="ti ti-heart" style={{ fontSize: 13 }} aria-hidden="true" />
                        <span style={{ fontSize: 11, fontWeight: extraLikes > 0 ? 700 : 500 }}>
                          {totalLikes.toLocaleString()}
                        </span>
                      </button>

                      {/* Interactive Retweet Button */}
                      <button 
                        style={actionButton(extraRetweets > 0, "#10b981")}
                        onClick={() => handleRetweet(t.tweet_id)}
                        className="hover-lift"
                      >
                        <i className="ti ti-reload" style={{ fontSize: 12 }} aria-hidden="true" />
                        <span style={{ fontSize: 11, fontWeight: extraRetweets > 0 ? 700 : 500 }}>
                          {totalRetweets.toLocaleString()}
                        </span>
                      </button>
                    </div>

                    {/* Location Badge */}
                    {t.location && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 10, color: "#64748b",
                        background: "#f1f5f9", padding: "4px 8px", borderRadius: 4
                      }}>
                        <i className="ti ti-location-pin" style={{ fontSize: 11 }} aria-hidden="true" />
                        <span>{t.location}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )
          })
        ) : (
          /* Empty Search/Filter State */
          <div style={{
            background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
            padding: "48px 24px", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center"
          }} className="animate-fade-in">
            <i className="ti ti-info-alt" style={{ fontSize: 32, color: "#cbd5e1" }} aria-hidden="true" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>No matching tweets found</p>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Try relaxing your search terms or selecting a different sentiment tab.
              </p>
            </div>
            <button
              onClick={() => { setSearchQuery(""); setSentimentFilter("all"); }}
              style={{
                background: "#6366f1", border: "none", color: "#ffffff",
                fontSize: 11, fontWeight: 600, padding: "8px 16px", borderRadius: 6,
                cursor: "pointer", marginTop: 4, boxShadow: "0 2px 4px rgba(99, 102, 241, 0.2)"
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

    </div>
  )
}