#!/bin/bash
# setup-gcp-secrets.sh
# Run once to create all Secret Manager secrets for the Cloud Run deployment.
# Usage: bash scripts/setup-gcp-secrets.sh <PROJECT_ID>
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project <PROJECT_ID>
#   gcloud services enable secretmanager.googleapis.com

set -e
PROJECT_ID=${1:-$(gcloud config get-value project)}

echo "Creating secrets in project: $PROJECT_ID"

create_secret() {
  local name=$1
  local prompt=$2
  echo -n "$prompt: "
  read -rs value
  echo
  if gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    echo "  ↻  $name already exists — adding new version"
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT_ID"
  else
    echo "  +  Creating $name"
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic --project="$PROJECT_ID"
  fi
}

create_secret "anthropic-api-key"      "ANTHROPIC_API_KEY"
create_secret "replicate-api-token"    "REPLICATE_API_TOKEN"
create_secret "woo-consumer-key"       "WOO_CONSUMER_KEY"
create_secret "woo-consumer-secret"    "WOO_CONSUMER_SECRET"
create_secret "wp-app-password"        "WP_APP_PASSWORD"
create_secret "admin-password"         "ADMIN_PASSWORD"

# Grant Cloud Build service account access to read secrets
CB_SA="${PROJECT_ID}@cloudbuild.gserviceaccount.com"
CR_SA="service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@serverless-robot-prod.iam.gserviceaccount.com"

echo ""
echo "Granting secret access to Cloud Build SA: $CB_SA"
for secret in anthropic-api-key replicate-api-token woo-consumer-key woo-consumer-secret wp-app-password admin-password; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$CB_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" --quiet
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$CR_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" --quiet
done

echo ""
echo "✅ All secrets created. Cloud Run and Cloud Build can now access them."
echo ""
echo "Next: Create the Artifact Registry repository if it doesn't exist:"
echo "  gcloud artifacts repositories create designranga \\"
echo "    --repository-format=docker \\"
echo "    --location=asia-south1 \\"
echo "    --project=$PROJECT_ID"
