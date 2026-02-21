# Setup Guide — Voiceflow Chat on Framer

This is a two-part setup. Takes about 10 minutes total.

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────┐
│  Framer Page    │──────▶ │  Vercel Proxy    │──────▶ │  Voiceflow   │
│  (your UI)      │  POST  │  /api/chat       │  POST  │  Runtime API │
│                 │        │  (hides API key) │        │              │
└─────────────────┘        └──────────────────┘        └──────────────┘
```

---

## Part 1 — Deploy the Vercel Proxy

The proxy is a single JavaScript file that sits between Framer and Voiceflow,
keeping your API key secret.

### Step 1 — Get your Voiceflow API key

1. Go to [app.voiceflow.com](https://app.voiceflow.com)
2. Open your project
3. Click **Settings** (bottom-left gear icon)
4. Click **API Keys**
5. Copy the key starting with `VF.DM.`

### Step 2 — Deploy to Vercel (no coding required)

**Option A — One-click via Vercel CLI:**

```bash
# Install Vercel CLI (once)
npm install -g vercel

# Enter the proxy folder
cd vercel-proxy

# Deploy
vercel

# Follow prompts:
#   Set up and deploy? → Y
#   Which scope? → your account
#   Link to existing project? → N
#   Project name? → voiceflow-proxy (or anything)
#   Directory? → ./ (press Enter)
#   Override settings? → N

# When done, Vercel gives you a URL like:
#   https://voiceflow-proxy-abc123.vercel.app
```

**Option B — GitHub + Vercel Dashboard (no CLI):**

1. Create a new GitHub repo and push the `vercel-proxy/` folder to it
2. Go to [vercel.com/new](https://vercel.com/new)
3. Click **Import** next to your repo
4. Under **Build & Output Settings**, leave everything blank (no framework)
5. Expand **Environment Variables** and add:
   - `VOICEFLOW_API_KEY` = `VF.DM.your_key_here`
   - `VOICEFLOW_VERSION_ID` = `production`
6. Click **Deploy**

### Step 3 — Add your API key as an environment variable

If you used the CLI (Option A), run:

```bash
vercel env add VOICEFLOW_API_KEY
# Paste your VF.DM.xxx key when prompted
# Select: Production, Preview, Development
# Then redeploy:
vercel --prod
```

### Step 4 — Note your proxy URL

Your proxy URL will look like:
```
https://voiceflow-proxy-abc123.vercel.app/api/chat
```

Copy this — you'll paste it into Framer next.

### Step 5 — Test the proxy (optional)

```bash
curl -X POST https://YOUR-PROXY.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userID":"test-123","action":{"type":"launch"}}'
```

You should get back JSON like: `{"text":"Hello! How can I help you today?"}`

If you get an error, check Environment Variables in your Vercel dashboard.

---

## Part 2 — Add the Component to Framer

### Step 1 — Create a new Code Component

1. Open your Framer project
2. In the **left panel**, click the **Assets** tab (cube icon)
3. Click the **Code** section
4. Click **+** (New Code File)
5. Name it exactly: `VoiceflowChat`
6. Click **Create**

### Step 2 — Paste the component code

1. Framer opens a code editor with a template
2. Select **all** the template code (Cmd+A / Ctrl+A)
3. Delete it
4. Open `framer-component/VoiceflowChat.tsx` from this project
5. Copy **all** its contents
6. Paste into the Framer code editor
7. Press **Cmd+S** (or Ctrl+S) to save

Framer will compile the component. You may see a brief loading spinner.

### Step 3 — Add it to your page

1. In the Assets → Code panel, you'll now see **VoiceflowChat**
2. Drag it onto your page canvas
3. In the right panel, set its size to fill the full page:
   - Width: **Fill** (or `100%`)
   - Height: **Fill** (or `100vh`)
4. Position: pin to all four edges

### Step 4 — Configure the proxy URL

1. With the component selected, look at the **right panel**
2. You'll see the property controls:

   | Property | What to enter |
   |---|---|
   | **Proxy URL** | `https://YOUR-PROXY.vercel.app/api/chat` |
   | **Welcome Text** | e.g. `How can I help?` |
   | **Input Placeholder** | e.g. `Say something…` |
   | **Hue — Orb 1** | 210 (blue) |
   | **Hue — Orb 2** | 340 (pink) |
   | **Hue — Orb 3** | 45 (warm gold) |

3. Paste your Vercel proxy URL into **Proxy URL**

### Step 5 — Preview and publish

1. Click the **Preview** button (▶) in Framer's top bar to test
2. Type a message — you should see a response from your Voiceflow bot
3. When happy, click **Publish** in the top-right corner

---

## Customising the Design

All visual changes are made in the Framer right panel or in the component file.

### Change the gradient colours (no code)

In the right panel, adjust the three **Hue** sliders (0–360 = full colour wheel):

| Hue value | Colour |
|---|---|
| 0 / 360 | Red |
| 30 | Orange |
| 60 | Yellow |
| 120 | Green |
| 180 | Cyan |
| 210 | Blue |
| 270 | Purple |
| 310 | Pink |
| 340 | Rose |

### Change the font

In `VoiceflowChat.tsx`, find the Google Fonts import line:

```ts
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
```

Replace `DM+Sans` with any Google Font name, e.g. `Lora`, `Playfair+Display`, `Figtree`.

Then find the `font` constant in the `styles()` function:

```ts
const font = "'DM Sans', ui-sans-serif, system-ui, sans-serif"
```

Replace `'DM Sans'` with your chosen font name.

### Change message text size

In the `styles()` function, find `assistantText`:

```ts
assistantText: {
  fontSize: 26,  // ← change this
```

### Remove the welcome text

Set **Welcome Text** to an empty string `""` in the right panel,
or change the empty state logic in the component.

---

## Troubleshooting

**"No proxy URL set" error in Framer**
→ Make sure you pasted the full URL including `/api/chat` in the right panel

**CORS error in browser console**
→ The `vercel.json` in the proxy handles CORS. Re-deploy to make sure it's active.
→ Check that your Vercel function is using `vercel.json` from the same folder.

**"Server configuration error"**
→ Your `VOICEFLOW_API_KEY` is not set in Vercel. Go to Vercel Dashboard → Project → Settings → Environment Variables.

**Empty responses (`…` appears)**
→ Check that your Voiceflow project is published to the `production` version.
→ Try setting `VOICEFLOW_VERSION_ID=development` in Vercel if testing.

**Framer says "Module not found"**
→ Make sure you saved the component with Cmd+S. Try closing and reopening the code editor.

**Component appears blank in Framer canvas**
→ This is normal — the component renders fully only in Preview or when published.

---

## How Session IDs Work

Each time a visitor loads (or refreshes) your Framer page, `generateSessionID()` runs:

```ts
function generateSessionID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()  // e.g. "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
```

- Uses the Web Crypto API's `randomUUID()` — cryptographically random
- Stored in a `useRef` — persists through re-renders but **not** through refresh
- On refresh → new UUID → new Voiceflow session → clean slate
- No cookies, no localStorage, no server state

---

## GDPR Notes

- No cookies are set by this component
- No conversation data is stored anywhere
- Session IDs are random and not linked to any user identity
- The proxy does not log conversation content
- Users are informed via the footer note in the UI
