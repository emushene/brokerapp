terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

module "network" {
  source     = "./modules/network"
  project_id = var.project_id
  region     = var.region
}

module "gke" {
  source      = "./modules/gke"
  project_id  = var.project_id
  region      = var.region
  vpc_name    = module.network.vpc_name
  subnet_name = module.network.subnet_name
}

