# OLANIX

OLANIX is an AI assistant web app built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

## Run locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

Create a local `.env.local` file with the environment variables required by the app. Never commit API keys or secrets.

For image generation, add `REPLICATE_API_TOKEN` to `.env.local`. The token is read only by the server-side image-generation route and must never use a `NEXT_PUBLIC_` prefix. Image generation uses Replicate's FLUX Schnell model and may incur usage charges; configure it only if you accept the provider's current pricing.

## Image features

- Upload an image in chat to ask OLANIX to analyze it.
- Ask OLANIX to create, draw, generate, or make an image, such as "Give me a lion image", to use the image-generation endpoint.
- Generated images are displayed in the conversation and saved with the conversation message. The image provider's hosted URL may have its own retention limits.

## Build

```bash
npm run build
```
