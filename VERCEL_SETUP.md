# Vercel deployment

The chatbot and skin quiz call the `/api/groq` Vercel Function. The Groq key is read only by that server-side function; do not add it to frontend code or use a `VITE_` variable.

## Configure the API key

1. In Vercel, open the project settings and add `GROQ_API_KEY` under **Settings → Environment Variables**.
2. Add it to the environments where you will run the app, then redeploy.
3. For local Vercel development, install the Vercel CLI, link the project, and run `vercel env pull .env.local` followed by `vercel dev`.

Keep the key in the ignored local `.env.local` file or Vercel's environment settings. Never commit it. The normal `npm run dev` command starts Vite only; use `vercel dev` when testing the `/api/groq` function locally.

This demo endpoint is public and has no user authentication or durable rate limiting. Add rate limiting and abuse protections before using it with a production API key.
