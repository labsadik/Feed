# Feed — React + Tailwind + Supabase + Vidstack

A responsive video-feed web application built with **React**, **TypeScript**, **Tailwind CSS**, **Supabase**, and the **Vidstack** media player. Users can browse videos, authenticate, manage profiles, follow creators, react to and save videos, comment, share content, view watch history, and watch YouTube videos through Vidstack.

## Tech stack

- **React 19 + TypeScript** — UI and application logic
- **Vite** — development and production build tooling
- **Tailwind CSS** — responsive styling
- **React Router** — application routing
- **Supabase** — PostgreSQL database, authentication, Row Level Security (RLS), and Edge Functions
- **Vidstack** — video playback and the YouTube provider
- **Lucide React** — interface icons

## What the app does

### Visitors

- Browse the video feed without signing in
- Open individual watch pages
- Watch YouTube videos with Vidstack
- View public creator/profile information

### Signed-in users

- Sign in with Google through Supabase Auth
- Manage a profile and username
- Follow/unfollow creators
- Like/react to videos
- Comment on videos
- Save videos for later
- Share videos using native browser sharing when supported, with a fallback when it is not
- View watch history
- Browse a personalized Following feed

### Administrators

- Add/publish videos from the admin interface
- Enter a YouTube video ID or supported YouTube URL
- Use backend functions to hydrate public YouTube metadata such as title, thumbnail, channel, duration, and live state

## How it works

The app uses a shared application shell. `src/main.tsx` starts the app, `src/AppRoot.tsx` provides the main entry/routing, `src/components/AppChrome.tsx` provides the shared shell, and `src/components/Sidebar.tsx` provides reusable responsive navigation.

Typical video flow:

1. The visitor opens the feed.
2. React loads feed/video data from Supabase.
3. The user opens a watch page such as `/watch/<public-slug>`.
4. The watch page plays the YouTube video through Vidstack's YouTube provider.
5. Authenticated likes, comments, saves, follows, and watch history are persisted through Supabase and protected by RLS.
6. Admin publishing uses Supabase Edge Functions for backend operations and YouTube metadata.

## Project structure

```text
src/
├── main.tsx                    # Application bootstrap
├── AppRoot.tsx                 # Main entry/routing
├── components/
│   ├── AppChrome.tsx           # Shared application shell
│   ├── Sidebar.tsx             # Responsive navigation
│   ├── AddVideoModal.tsx       # Admin Add Video dialog
│   └── index.ts                # Shared component exports
├── contexts/                   # Application/auth contexts
├── integrations/supabase/      # Supabase client integration
└── ...                         # Pages, hooks, UI and feature code

supabase/
├── schema.sql                  # Schema, indexes, triggers, grants and RLS
├── config.toml                 # Supabase configuration
└── functions/                  # Edge Functions
```

The shared shell is mounted once around the pages, so feed, watch, profile, Following, history, saved, login, and admin screens use consistent navigation and layout.

## Getting started

### Requirements

- Node.js and npm
- A Supabase project
- Google OAuth configuration if Google login is required

### 1. Clone

```bash
git clone https://github.com/labsadik/Feed.git
cd login-page-builder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

`VITE_SUPABASE_ANON_KEY` is also accepted for compatibility.

**Security:** never put a Supabase service-role key in browser environment variables. Use the publishable/anon key and rely on Supabase Auth, RLS, and Edge Functions for protected operations.

### 4. Set up the database

The canonical database definition is `supabase/schema.sql`. It contains the application's database objects, indexes, triggers, grants, and RLS policies.

For a fresh Supabase project, enable Supabase Auth and apply the schema after linking the project. Existing production data is not included in the schema.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 5. Configure Google Auth

In Supabase, enable Google as an authentication provider and configure the local and production Site URLs and redirect URLs.

### 6. Run locally

```bash
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## YouTube + Vidstack

Admins add a YouTube video ID or accepted YouTube URL rather than uploading a video file directly to the app.

Supabase runtime functions retrieve public YouTube metadata such as title, thumbnail, channel, duration, and live state where available. Playback is handled by the **Vidstack YouTube provider**.

Vidstack documentation: https://vidstack.io/

## Routes

Watch pages use a database-generated public slug:

```text
/watch/<13-character-public-slug>
```

Public profile routes:

```text
/profile@username
/u/username
```

Following:

```text
/following
```

The application also includes login, saved, history, and admin experiences.

## Supabase Edge Functions

The application's Edge Functions are kept under `supabase/functions/`. JWT configuration is documented in `supabase/functions/README.md` and `supabase/config.toml`.

Primary runtime functions include:

- `feed-actions` — authenticated video, admin, and activity operations
- `youtube-public-info` — public YouTube metadata and live/duration hydration

Compatibility/legacy deployed functions are also checked in so the repository can match the production backend inventory.

Deploy functions with:

```bash
supabase functions deploy feed-actions
supabase functions deploy youtube-public-info
supabase functions deploy youtube-public-metadata
supabase functions deploy video-actions
supabase functions deploy youtube-oembed-metadata
supabase functions deploy youtube-video-metadata
```

## Database and security

Supabase provides the PostgreSQL backend and authentication layer. Database schema objects and RLS policies control protected data access.

The frontend should not bypass RLS or expose privileged credentials. Operations requiring elevated backend privileges belong in the appropriate Edge Function rather than browser code.

## Common development workflow

```bash
npm install
npm run dev
npm run build
npm run preview
```

## References

- Repository: https://github.com/labsadik/Feed
- Vidstack: https://vidstack.io/
- Supabase: https://supabase.com/
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- Vite: https://vite.dev/

## Notes

This README documents the current repository architecture and setup. Production data is not included in `supabase/schema.sql`; a new environment needs its own Supabase project, authentication settings, environment variables, and required YouTube/backend configuration.
