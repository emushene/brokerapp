resource "google_project_service" "secretmanager" {
  service = "secretmanager.googleapis.com"
}

resource "google_secret_manager_secret" "this" {
  for_each = toset(var.secret_ids)

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "this" {
  for_each = { for k, v in var.secret_values : k => v if contains(var.secret_ids, k) }

  secret      = google_secret_manager_secret.this[each.key].id
  secret_data = each.value
}