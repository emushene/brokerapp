variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "vpc_name" {
  type    = string
  default = "broker-vpc"
}

variable "subnet_cidr" {
  type    = string
  default = "10.10.0.0/16"
}