# Data source to read connection string from Secret Manager
data "google_secret_manager_secret_version" "connection_string" {
  count   = var.connection_string_secret != "" ? 1 : 0
  secret  = var.connection_string_secret
  project = var.project_id
  version = "latest"
}

# -----------------------------
# LOCALS (SAFE PARSING)
# -----------------------------
locals {
  connection_string = var.connection_string_secret != "" ?
    data.google_secret_manager_secret_version.connection_string[0].secret_data :
    ""

  # Convert: Host=...;Port=...;Database=...;Username=...;Password=...
  parsed_map = local.connection_string != "" ?
    {
      for pair in split(";", trimspace(local.connection_string)) :
      trimspace(split("=", pair)[0]) =>
      trimspace(join("=", slice(split("=", pair), 1, length(split("=", pair)))))
      if strcontains(pair, "=")
    }
    : {}

  # Final resolved values (fallback to variables if missing)
  final_db_user = lookup(local.parsed_map, "Username", var.db_user)

  final_db_password = lookup(
    local.parsed_map,
    "Password",
    var.db_password
  )

  final_database_name = lookup(
    local.parsed_map,
    "Database",
    var.database_name
  )
}

# -----------------------------
# CLOUD SQL INSTANCE
# -----------------------------
resource "google_sql_database_instance" "postgres" {
  name             = var.instance_name
  project          = var.project_id
  region           = var.region
  database_version = var.database_version

  settings {
    tier              = var.tier
    availability_type = var.availability_type

    backup_configuration {
      enabled = var.backup_enabled

      # Recommended for SRE
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      private_network = var.network != "" ? var.network : null

      # Modern replacement for require_ssl
      ssl_mode = "ENCRYPTED_ONLY"

      # Strongly recommended for SRE
      ipv4_enabled = false
    }
  }

  deletion_protection = var.deletion_protection
}

# -----------------------------
# DATABASE
# -----------------------------
resource "google_sql_database" "brokerapp" {
  name     = local.final_database_name
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
}

# -----------------------------
# DATABASE USER
# -----------------------------
resource "google_sql_user" "brokeruser" {
  name     = local.final_db_user
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
  password = local.final_db_password
}