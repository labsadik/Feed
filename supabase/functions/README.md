# Supabase Edge Functions

Production project: `dceneqgcvjikbrsqvzlt`

The repository mirrors the currently deployed Edge Functions so the backend can be rebuilt from source.

| Function | JWT | Purpose |
|---|---|---|
| `feed-actions` | required | authenticated views, history, reactions, saves, shares, comments, admin video CRUD |
| `video-actions` | required | legacy/admin video actions and duration/history compatibility |
| `youtube-public-info` | public | batched public YouTube title/channel/thumbnail/duration/live metadata |
| `youtube-public-metadata` | public | public metadata fallback |
| `youtube-oembed-metadata` | required | admin metadata resolver |
| `youtube-video-metadata` | required | legacy metadata resolver; requires its configured YouTube API key |

The application uses `feed-actions` and `youtube-public-info` as the primary current paths. Legacy functions remain checked in because they are still deployed in the production project.

## Deploy

From the repository root:

```bash
supabase login
supabase link --project-ref dceneqgcvjikbrsqvzlt
supabase db push
supabase functions deploy feed-actions
supabase functions deploy youtube-public-info
supabase functions deploy youtube-public-metadata
supabase functions deploy video-actions
supabase functions deploy youtube-oembed-metadata
supabase functions deploy youtube-video-metadata
```

Set required server secrets in Supabase before deploying admin/metadata functions. Never place service-role secrets in the React client.
