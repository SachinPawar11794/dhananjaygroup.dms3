# DMS - Dhananjay Manufacturing System

This repository contains the DMS frontend (Vite) and a lightweight backend API (Express) that proxies Supabase-style queries to PostgreSQL. The app has been migrated to Google Cloud:

- Frontend: Firebase Hosting
- Backend: Cloud Run (connected to Cloud SQL)

Live sites
- Firebase Hosting: https://dms--my-project-40013.asia-southeast1.hosted.app
- Cloud Run API: https://dms-api-169633813068.asia-south1.run.app

Quick local development

1. Install dependencies

```bash
npm install
```

2. Start the local API (proxies queries to Postgres)

```bash
npm run start-local-api
# server listens on http://localhost:3001
```

3. Run the frontend (dev)

```bash
npm run dev
# open http://localhost:3000
```

Production build & Firebase Hosting (CI)

- A GitHub Action (`.github/workflows/firebase-hosting.yml`) builds the Vite app and deploys to Firebase Hosting on pushes to `main`.  
- To enable the Action, create a CI token locally:
  1. `npx firebase-tools login:ci` (copy token)
  2. In your GitHub repo settings -> Secrets -> Actions -> add `FIREBASE_TOKEN`

Manual build & deploy (one-off)

```bash
# build
npm run build

# deploy hosting (requires firebase-tools and login)
npx firebase-tools deploy --only hosting
```

Cloud Run (backend) deploy (one-off)

The backend is packaged and deployed using Cloud Build / Cloud Run. Example CLI:

```bash
gcloud builds submit --config=cloudbuild.yaml --project=my-project-40013
gcloud run deploy dms-api \
  --image=asia-south1-docker.pkg.dev/my-project-40013/dms-repo/dms-api:latest \
  --region=asia-south1 --platform=managed \
  --service-account=dms-run-sa@my-project-40013.iam.gserviceaccount.com \
  --add-cloudsql-instances=my-project-40013:asia-south1:dhananjaygroup-dms-db-mumbai \
  --set-env-vars INSTANCE_CONNECTION_NAME=my-project-40013:asia-south1:dhananjaygroup-dms-db-mumbai,DB_USER=postgres,DB_NAME=dmsdb,DB_PORT=5432 \
  --set-secrets DB_PASS=projects/169633813068/secrets/db-password:latest
```

Notes & troubleshooting
- If CI fails during `npm ci` ensure `package-lock.json` is committed and in sync (`npm install` locally then commit `package-lock.json`).  
- The frontend reads runtime config from `window.FIREBASE_CONFIG` (set in `index.html`). The backend URL is read from `window.__BACKEND_API_URL__`.
- Admin actions require Firebase Admin SDK credentials. Use `scripts/set-admin-claim.js` with a service account JSON (set `GOOGLE_APPLICATION_CREDENTIALS` for local runs).

Contact / Next steps
- If you want the repo badges, custom domain or DNS cutover, tell me and I will prepare the DNS and CI checklist.


