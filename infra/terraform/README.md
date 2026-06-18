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
