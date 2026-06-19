variable "project_id" {
  type = string
}
 
variable "secret_ids" {
  description = "List of Secret Manager secret IDs to create/manage"
  type        = list(string)
  default = [
    "broker-db-connection-string",
    "firebase-admin-key",
    "google-drive-service-account",
  ]
}

variable "secret_values" {
  description = "Optional secret values to seed Secret Manager secret versions"
  type        = map(string)
  default     = {}
}