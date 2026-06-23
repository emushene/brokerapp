variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the instance"
  type        = string
  default     = "us-central1"
}

variable "instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "broker-postgres"
}

variable "database_version" {
  description = "Postgres version for Cloud SQL"
  type        = string
  default     = "POSTGRES_14"
}

variable "tier" {
  description = "Machine type / tier (e.g., db-e2-micro)"
  type        = string
  default     = "db-e2-micro"
}

variable "availability_type" {
  description = "Availability type: ZONAL or REGIONAL"
  type        = string
  default     = "ZONAL"
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Prevent accidental deletion of instance"
  type        = bool
  default     = false
}

variable "database_name" {
  description = "Database to create"
  type        = string
  default     = "brokerapp"
}

variable "db_user" {
  description = "Database user to create (used if connection_string_secret is not provided)"
  type        = string
  default     = "brokeruser"
}

variable "db_password" {
  description = "Password for the database user (direct input; used if connection_string_secret is not provided)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "connection_string_secret" {
  description = "Secret Manager secret resource id containing the full PostgreSQL connection string (postgresql://user:password@host:port/database)"
  type        = string
  default     = ""
}

variable "network" {
  description = "VPC network self-link or name to use for private IP (e.g., from modules/network output vpc_id)"
  type        = string
  default     = ""
}

variable "require_private_ip" {
  description = "If true, disallow public IP and use private IP only"
  type        = bool
  default     = true
}
