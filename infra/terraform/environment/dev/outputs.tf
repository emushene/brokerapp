output "vpc_name" {
  value = module.network.vpc_name
}

output "subnet_name" {
  value = module.network.subnet_name
}

output "cluster_name" {
  value = module.gke.cluster_name
}

output "cluster_endpoint" {
  value = module.gke.cluster_endpoint
}

output "postgres_instance_name" {
  value = module.postgres.instance_name
}

output "postgres_connection_name" {
  value = module.postgres.instance_connection_name
}

output "postgres_database_name" {
  value = module.postgres.database_name
}

output "postgres_db_user" {
  value = module.postgres.db_user
}

output "postgres_instance_ip_address" {
  value     = module.postgres.instance_ip_address
  sensitive = true
}