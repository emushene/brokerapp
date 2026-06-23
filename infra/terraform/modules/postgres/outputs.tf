output "instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.postgres.name
}

output "instance_connection_name" {
  description = "Connection name (project:region:instance) used for Cloud SQL Proxy"
  value       = google_sql_database_instance.postgres.connection_name
}

output "instance_self_link" {
  description = "Self link of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.self_link
}

output "database_name" {
  description = "Created database name"
  value       = google_sql_database.brokerapp.name
}

output "db_user" {
  description = "Created DB user name"
  value       = local.final_db_user
}

output "instance_ip_address" {
  description = "The IPv4 address assigned to the instance"
  value       = google_sql_database_instance.postgres.private_ip_address != null ? google_sql_database_instance.postgres.private_ip_address : google_sql_database_instance.postgres.public_ip_address
  sensitive   = true
}
