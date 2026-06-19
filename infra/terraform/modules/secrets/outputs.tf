output "secret_manager_enabled" {
  value = true
}

output "secret_ids" {
  value = [for s in google_secret_manager_secret.this : s.secret_id]
}
