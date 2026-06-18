resource "google_container_node_pool" "default_pool" {
  name     = "default-pool"
  cluster  = google_container_cluster.primary.name
  location = var.region

  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 1
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = "e2-medium"   # IMPORTANT (not micro)
    disk_size_gb = 20            # IMPORTANT (prevents SSD quota blowups)

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}