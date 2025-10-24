# Supabase Realtime Setup Guide

For competitive PvP gameplay, you MUST enable realtime on the following tables in your Supabase dashboard:

## Steps to Enable Realtime

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Enable realtime for these tables:
   - `units`
   - `buildings`
   - `user_game_states`
   - `combat_logs`
   - `chat_messages`

## Verify RLS Policies Allow Realtime

Realtime subscriptions respect Row Level Security (RLS) policies. Ensure your policies allow SELECT access:

\`\`\`sql
-- Example: Check if users can view units in their world
SELECT * FROM units WHERE world_id = 1;
\`\`\`

## Test Realtime Connection

After enabling, check the browser console for:
- `[v0] Realtime connected for world 1` ✅ Success
- `[v0] Realtime subscription timed out` ❌ Not enabled or RLS blocking

## Performance Notes

- Realtime uses WebSockets for instant updates (< 100ms latency)
- Free tier: 200 concurrent connections
- Pro tier: 500 concurrent connections
- For 1000+ players, consider Pro plan ($25/month)

## Troubleshooting

**Timeout errors?**
- Verify realtime is enabled on tables
- Check RLS policies allow SELECT
- Ensure Supabase project is not paused

**High latency?**
- Check your Supabase region (should be close to users)
- Monitor connection count (may need to upgrade plan)
- Consider using broadcast channels for combat events
