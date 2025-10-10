-- Create alliance_news table for storing alliance announcements
CREATE TABLE IF NOT EXISTS alliance_news (
  id SERIAL PRIMARY KEY,
  alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_username TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_alliance_news_alliance_id ON alliance_news(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_news_created_at ON alliance_news(created_at DESC);
