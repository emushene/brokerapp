# 🚀 BrokerApp — SRE Infrastructure (Terraform)

![Terraform](https://img.shields.io/badge/IaC-Terraform-623CE4?logo=terraform)
![GCP](https://img.shields.io/badge/Cloud-Google%20Cloud-4285F4?logo=googlecloud)
![Kubernetes](https://img.shields.io/badge/Orchestration-Kubernetes-326CE5?logo=kubernetes)
![Status](https://img.shields.io/badge/Status-In%20Progress-yellow)
![License](https://img.shields.io/badge/License-Internal-lightgrey)

---

## 🧭 Overview

BrokerApp SRE infrastructure is a Terraform-driven cloud platform built on Google Cloud Platform (GCP).

It is designed for:

- Infrastructure as Code (Terraform)
- Kubernetes-native workloads (GKE)
- Secure secret management (GCP Secret Manager)
- Identity-first security (Workload Identity)
- Zero reliance on `.env` or static credentials

---

## 🏗️ Architecture Goals

- Immutable infrastructure
- Declarative provisioning
- Least-privilege IAM
- Identity-based authentication
- Fully reproducible environments

---

## 📁 Terraform Structure

infra/terraform/environments/dev

This is the active development environment where all modules are composed and deployed.

---

## 🧩 Core Modules

### 🌐 Network (`modules/network`)
- VPC: broker-vpc
- Subnet: broker-subnet
- Secondary IP ranges for GKE pods
- Private Google access enabled

### ☸️ GKE (`modules/gke`)
- Cluster: broker-gke
- Node pool: default-pool
- Region: africa-south1
- VPC-native networking
- Workload Identity enabled

### 🔐 IAM (`modules/iam`) (in progress)
- Google Service Accounts
- IAM bindings
- Workload Identity mapping

### 🔑 Secrets
- broker-db-connection-string
- firebase-admin-key
- google-drive-service-account

---

## 🔐 Security Architecture

Pod → KSA → GSA → Secret Manager

---

## ☁️ Current State

### ✅ Done
- VPC + Subnet
- GKE Cluster
- Node Pool
- Workload Identity
- Secret Manager setup

### 🟡 In Progress
- IAM bindings
- KSA → GSA link

### 🔴 Pending
- .NET integration
- CI/CD pipeline

---

## 🧠 Summary
Production-grade SRE platform using Terraform + GCP + Kubernetes + Identity-based security.

---

## 🔐 Secrets management & importing

The `secrets` module enables the Secret Manager API and can manage secret resources and versions. If secrets were created manually (outside Terraform), import them into the environment state to avoid `409 Already exists` errors.

Run these commands from `infra/terraform/environment/dev` (replace the project id if different):

```bash
terraform import 'module.secrets.google_secret_manager_secret.this["broker-db-connection-string"]' 'projects/project-d4757723-0bc3-412e-b9f/secrets/broker-db-connection-string'
terraform import 'module.secrets.google_secret_manager_secret.this["firebase-admin-key"]' 'projects/project-d4757723-0bc3-412e-b9f/secrets/firebase-admin-key'
terraform import 'module.secrets.google_secret_manager_secret.this["google-drive-service-account"]' 'projects/project-d4757723-0bc3-412e-b9f/secrets/google-drive-service-account'
```

If you also want Terraform to manage secret values (secret versions), import secret versions or create them via the module. Example (optional):

```bash
# import a specific version (replace VERSION_ID as needed)
terraform import 'module.secrets.google_secret_manager_secret_version.this["broker-db-connection-string:1"]' 'projects/project-d4757723-0bc3-412e-b9f/secrets/broker-db-connection-string/versions/1'
```

Security notes:
- Do NOT commit secret values or plaintext credentials to version control. Use secure variable files or a secrets pipeline for values.
- Each secret must have at least one version (the application reads `latest`).
- Ensure the Kubernetes ServiceAccount (`broker-api-sa`) is created and your Deployment sets `serviceAccountName: broker-api-sa` so Workload Identity is used.

After importing, run `terraform plan` to verify a clean state and then `terraform apply` when ready.
