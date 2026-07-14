# BrokerApp - Full-Stack Advisor Portal

BrokerApp is a full-stack web application for insurance brokers and advisors to manage policy submissions. It consists of:

- **Backend:** `brokerApp.API` — ASP.NET Core (.NET 10) Web API with PostgreSQL (EF Core) and Firebase JWT authentication.
- **Frontend:** `brokerApp.client` — React + Vite single-page app (TypeScript) intended for static hosting (Cloudflare Pages recommended).

This repository contains application code plus Kubernetes manifests and observability plumbing (Prometheus + OpenTelemetry + Tempo) prepared for GKE.

## 🚀 Technology Stack

### Backend (`brokerApp.API`)
- **Framework:** .NET 10 (ASP.NET Core Web API)
- **Database:** PostgreSQL (Npgsql + EF Core)
- **Auth:** Firebase JWT Bearer Authentication
- **Docs:** Swagger (Swashbuckle)

### Frontend (`brokerApp.client`)
- **Framework:** React 19 + TypeScript
- **Build:** Vite
- **Host (recommended):** Cloudflare Pages (static hosting)

---

## 🛠️ Local & Deployment Setup

### Local prerequisites
- `dotnet` (10 SDK), `node` (LTS), `kubectl` (for cluster ops), and `docker` (for building images).

### Backend (local)
1. Edit `brokerApp.API/appsettings.json` or use Secret Manager values for:
   - `ConnectionStrings:DefaultConnection`
   - `Firebase:ProjectId`
2. Run migrations and start locally:
```bash
cd brokerApp.API
dotnet ef database update
dotnet run
```

### Frontend (local)
```bash
cd brokerApp.client
npm install
npm run dev
```

### Production hosting (recommended)
- **Frontend:** Cloudflare Pages — build with `npm run build` and publish the `dist` directory.
- **Backend:** GKE (you already use GKE). Build and push a container image and update the `image` fields in `infra/terraform/k8s/prod/deployment.yaml`.

Example image build & push (GCR/GAR):
```bash
docker build -t LOCATION-docker.pkg.dev/PROJECT_ID/REPO/brokerapp-api:stable brokerApp.API
docker push LOCATION-docker.pkg.dev/PROJECT_ID/REPO/brokerapp-api:stable
```

Then apply manifests:
```bash
kubectl apply -f infra/terraform/k8s/prod/namespace.yaml
kubectl apply -f infra/terraform/k8s/prod/otel-collector.yaml
kubectl apply -f infra/terraform/k8s/prod/deployment.yaml
kubectl apply -f infra/terraform/k8s/prod/servicemonitors.yaml
```

---

## 📂 Project Structure (high level)

- `brokerApp.API/` — .NET API source code and `Program.cs` startup.
- `brokerApp.client/` — React frontend source and Vite config.
- `infra/terraform/` — Terraform modules and supporting docs (secrets, GKE infra where used).
- `infra/terraform/k8s/dev/` — development Kubernetes manifests (deployment + service + otel collector).
- `infra/terraform/k8s/prod/` — production-ready Kubernetes manifests (namespace, otel collector HA, ServiceMonitors, brokerapp-api deployment/service).

Key files added by recent work:
- `infra/terraform/k8s/dev/deployment.yaml` — dev deployment + Prometheus annotations.
- `infra/terraform/k8s/dev/otel-collector.yaml` — dev collector (simple).
- `infra/terraform/k8s/prod/otel-collector.yaml` — production collector (3 replicas, memory limiter).
- `infra/terraform/k8s/prod/deployment.yaml` — production `brokerapp-api` deployment & service.
- `infra/terraform/k8s/prod/servicemonitors.yaml` — `ServiceMonitor` resources for Prometheus Operator.

---

## 🔒 Authentication
This application uses **Firebase Authentication**.

- To test via Swagger, open `/swagger` and use the **Authorize** button with a Firebase token: `Bearer <token>`.
- `SubmissionsController` and other protected controllers use `[Authorize]` and rely on the JWT `user_id` claim.

---

## 📈 Observability (what's included)

- **Prometheus metrics:** `brokerApp.API` exposes metrics via OpenTelemetry Prometheus exporter at `/metrics` (mapped in `Program.cs`). Prometheus scrapes via:
  - Annotations on `brokerapp-api` Service for basic setups.
  - `ServiceMonitor` resources for Prometheus Operator setups (see `infra/terraform/k8s/prod/servicemonitors.yaml`).

- **Tracing:** `brokerApp.API` is instrumented with OpenTelemetry tracing. The app sends OTLP to the in-cluster OpenTelemetry Collector (`otel-collector`), which forwards to Tempo.

- **Collector:** Production collector is configured for HA (3 replicas), memory limiting, and forwards traces to `tempo:4317` by default (update to your Tempo endpoint or object-store-backed Tempo Helm chart for production storage).

- **Metrics & Traces separation:** Prometheus handles metrics; Tempo handles traces. The Collector bridges traces from app to Tempo.

## 📈 API Endpoints (summary)

### Submissions
- `POST /api/Submissions` — create a policy submission (multipart for file upload).
- `GET /api/Submissions` — list submissions for authenticated advisor.

Additional endpoints exist for `Advisors`, `Financials`, `AdvisorGroups`, and background sync features — review `brokerApp.API/Controllers` for the full list.

---

## ✅ Verification & troubleshooting

1. Deploy the production manifests (see above).
2. Confirm pods:
```bash
kubectl -n prod get pods
kubectl -n prod get svc
```
3. Confirm Prometheus scraping:
  - If using Prometheus Operator, open the Prometheus UI and inspect `Status -> Targets` for `brokerapp-api` and `otel-collector`.
  - If not using Operator, Prometheus must be configured to scrape the `brokerapp-api` service endpoint `/metrics`.
4. Confirm tracing:
  - Ensure the collector is running and healthy (`kubectl -n prod get pods -l app=otel-collector`).
  - Ensure Tempo (or your tracing backend) is reachable from the collector.

## 🔧 Production hardening checklist (recommendations)

- Use secure OTLP transport (mTLS or TLS + auth) between app → collector and collector → Tempo.
- Configure Tempo with long-term storage (GCS/AWS S3) and a production-ready chart (Helm) rather than in-cluster ephemeral storage.
- Use Kubernetes `ServiceAccount` + Workload Identity for Google credentials and avoid embedding secrets in plain manifests.
- Add RBAC and network policies to limit access to `/metrics` and OTLP endpoints.
- Tune resource requests/limits for the collector and API based on load testing.
- Add alerting rules (Prometheus) for high latency, error-rate, or collector memory pressure.

## Next steeps

- Add a production-ready Tempo Helm manifest (with GCS storage) and Wire collector to it.
- Add TLS/auth to OTLP connections and create Kubernetes Secrets or use Workload Identity.
- Add CI/CD steps to build/push container images and automatically update `image` tags in the `prod` manifests.
options:
- generate the recommended Tempo Helm values and manifests tuned for GCS, and
- patch `brokerApp.API/Program.cs` to include logging correlation and recommended env var configuration.

---

