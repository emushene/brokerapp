resource "google_container_cluster" "primary" {
  name     = "broker-gke"
  location = var.region

  network    = var.vpc_id
  subnetwork = var.subnet_id

  deletion_protection = false   # IMPORTANT

  remove_default_node_pool = true
  initial_node_count       = 1

  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {}

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}