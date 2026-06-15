# Cloud Run Deployment Guide

## One-time setup

### 1. Enable GCP APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Create Artifact Registry repository
```bash
gcloud artifacts repositories create designranga \
  --repository-format=docker \
  --location=asia-south1 \
  --description="designranga-admin Docker images"
```

### 3. Create secrets
```bash
bash scripts/setup-gcp-secrets.sh <YOUR_PROJECT_ID>
```
This prompts for each secret value and stores them in Secret Manager.  
**Never put secrets in `cloudbuild.yaml` or the Docker image.**

### 4. Grant Cloud Build the Cloud Run deployer role
```bash
PROJECT_NUMBER=$(gcloud projects describe <YOUR_PROJECT_ID> --format='value(projectNumber)')

gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

---

## Deploy

### Manual (first deploy or one-off)
```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_REGION=asia-south1,_SERVICE_NAME=designranga-admin \
  --project=<YOUR_PROJECT_ID>
```

### Automatic via GitHub trigger
1. Cloud Build console → Triggers → Connect repository → select your GitHub repo  
2. Set trigger event: push to `main`  
3. Config: `cloudbuild.yaml`  
4. Add substitutions: `_REGION=asia-south1`, `_SERVICE_NAME=designranga-admin`

---

## Custom domain (admin.designranga.com)

```bash
gcloud run domain-mappings create \
  --service=designranga-admin \
  --domain=admin.designranga.com \
  --region=asia-south1
```

Then add the CNAME record shown in the output to your DNS (Cloudflare).  
Set Cloudflare proxy status to **DNS only** (grey cloud) for the admin subdomain —  
Cloud Run handles its own TLS and doesn't work behind Cloudflare's proxy for custom domains.

---

## Environment variables on the service

Non-secret vars are set directly in `cloudbuild.yaml` via `--update-env-vars`.  
Secrets are injected via `--update-secrets` which mounts them as env vars from Secret Manager.

To update a secret value:
```bash
echo -n "new-value" | gcloud secrets versions add <secret-name> --data-file=-
# Then redeploy to pick up the new version
gcloud run services update designranga-admin --region=asia-south1
```

---

## Resource sizing

| Setting | Value | Reason |
|---|---|---|
| Memory | 1Gi | sharp + jszip ZIP generation peaks at ~400MB |
| CPU | 1 | image processing is single-threaded |
| Concurrency | 4 | prevents OOM under burst traffic |
| Min instances | 0 | scale to zero — admin tool, not customer-facing |
| Max instances | 3 | hard cap on cost |
| Timeout | 120s | ZIP upload to Bluehost can take ~30-60s |

---

## Local Docker test (before deploying)

```bash
# Build
docker build -t designranga-admin .

# Run with env vars from .env.local
docker run --rm -p 8080:8080 \
  --env-file .env.local \
  -e PORT=8080 \
  designranga-admin

# Open http://localhost:8080
```
