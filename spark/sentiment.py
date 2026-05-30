"""
Sentiment Analysis Module
=========================
Reusable sentiment analysis using TextBlob.
Used by both streaming_job.py (Member 3) and batch_job.py (Member 4).

Usage:
    from sentiment import analyze
    result = analyze("I love this product!")
    # {'sentiment': 'positive', 'sentiment_score': 0.5}
"""

from textblob import TextBlob


def analyze(text: str) -> dict:
    """Analyze sentiment of a text string.

    Args:
        text: The text to analyze.

    Returns:
        dict with keys:
            - 'sentiment': 'positive', 'neutral', or 'negative'
            - 'sentiment_score': float from -1.0 to 1.0
    """
    try:
        blob = TextBlob(str(text))
        score = blob.sentiment.polarity  # -1.0 to +1.0

        if score > 0.1:
            label = 'positive'
        elif score < -0.1:
            label = 'negative'
        else:
            label = 'neutral'

        return {
            'sentiment': label,
            'sentiment_score': round(score, 3)
        }
    except Exception:
        return {'sentiment': 'neutral', 'sentiment_score': 0.0}


def analyze_batch(texts: list) -> list:
    """Analyze sentiment for a list of texts.

    Args:
        texts: List of text strings.

    Returns:
        List of sentiment dicts.
    """
    return [analyze(t) for t in texts]
