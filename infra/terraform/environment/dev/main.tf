terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "network" {
  source = "../../modules/network"

  project_id = var.project_id
  region     = var.region
}

module "gke" {
  source = "../../modules/gke"

  project_id = var.project_id
  region     = var.region

  vpc_id    = module.network.vpc_id
  subnet_id = module.network.subnet_id
}