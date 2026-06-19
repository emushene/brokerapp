variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "service_account_id" {
  description = "Service account ID (without domain)"
  type        = string
}

variable "service_account_display_name" {
  description = "Display name for the service account"
  type        = string
}

variable "roles" {
  description = "List of IAM roles to bind"
  type        = list(string)
}

variable "create_wif_binding" {
  description = "Whether to create a Workload Identity binding for a Kubernetes service account"
  type        = bool
  default     = false
}

variable "ksa_name" {
  description = "Kubernetes Service Account name to bind the IAM role to"
  type        = string
  default     = ""
}

variable "ksa_namespace" {
  description = "Kubernetes Service Account namespace to bind the IAM role to"
  type        = string
  default     = ""
}

