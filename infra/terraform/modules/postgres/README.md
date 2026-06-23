# Cloud SQL Postgres Module

This module provisions a Google Cloud SQL for Postgres instance with a database and user.

## Features

- Creates a Cloud SQL Postgres instance (configurable version and tier)
- Reads connection string from Secret Manager and extracts database name, username, and password
- Creates the database and user based on connection string components
- Automated backups enabled by default
- Configurable availability (ZONAL or REGIONAL)
- Deletion protection optional
- Falls back to direct inputs if connection string not provided

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `project_id` | GCP Project ID | `string` | - | Yes |
| `region` | GCP region | `string` | `us-central1` | No |
| `instance_name` | Cloud SQL instance name | `string` | `broker-postgres` | No |
| `database_version` | Postgres version (e.g., POSTGRES_14, POSTGRES_15) | `string` | `POSTGRES_14` | No |
| `tier` | Machine type (e.g., db-e2-micro) | `string` | `db-e2-micro` | No |
| `availability_type` | ZONAL or REGIONAL | `string` | `ZONAL` | No |
| `backup_enabled` | Enable automated backups | `bool` | `true` | No |
| `deletion_protection` | Prevent accidental deletion | `bool` | `false` | No |
| `database_name` | Default database name (fallback if not in connection string) | `string` | `brokerapp` | No |
| `db_user` | Default database user (fallback if not in connection string) | `string` | `brokeruser` | No |
| `db_password` | Direct password input (fallback if not using connection string) | `string` (sensitive) | `""` | No |
| `connection_string_secret` | Secret Manager secret path containing connection string (postgresql://user:password@host:port/db) | `string` | `""` | No |
| `network` | VPC network self-link to use for private IP (e.g., from modules/network output) | `string` | `""` | No |
| `require_private_ip` | If true, disallow public IP and use private IP only | `bool` | `true` | No |

## Outputs

- `instance_name` - Cloud SQL instance name
- `instance_connection_name` - Connection string for Cloud SQL Proxy (project:region:instance)
- `instance_self_link` - Self link URL
- `database_name` - Database name
- `db_user` - Database user name
- `instance_ip_address` - Private or public IP address of the instance

## Connection String

The module expects the connection string from Secret Manager in this format:

```
postgresql://username:password@host:port/database
```

Example:
```
postgresql://brokeruser:mypassword@10.0.0.5:5432/brokerapp
```

The module will parse this and extract:
- `username` → used as `db_user`
- `password` → used as `db_password`
- `database` → used as `database_name`

## Usage

### Using Connection String from Secret Manager with VPC (RECOMMENDED)

```hcl
module "postgres" {
  source = "./modules/postgres"

  project_id                 = "my-gcp-project"
  region                     = "us-central1"
  instance_name              = "broker-postgres"
  connection_string_secret   = "projects/my-gcp-project/secrets/broker-db-connection-string"
  network                    = module.network.vpc_id  # From modules/network
  require_private_ip         = true
  tier                       = "db-e2-micro"
  backup_enabled             = true
  deletion_protection        = false
}
```

### Using Direct Inputs (Fallback)

If the connection string secret is not provided, the module falls back to:

```hcl
module "postgres" {
  source = "./modules/postgres"

  project_id        = "my-gcp-project"
  region            = "us-central1"
  instance_name     = "broker-postgres"
  database_name     = "brokerapp"
  db_user           = "brokeruser"
  db_password       = "my-password"  # NOT RECOMMENDED
  tier              = "db-e2-micro"
}
```

## Example Usage

```hcl
module "postgres" {
  source = "./modules/postgres"

  project_id                 = "my-gcp-project"
  region                     = "us-central1"
  instance_name              = "broker-postgres"
  connection_string_secret   = "projects/my-gcp-project/secrets/broker-db-connection-string"
  network                    = module.network.vpc_id  # From modules/network output
  require_private_ip         = true
  tier                       = "db-e2-micro"
  backup_enabled             = true
  deletion_protection        = false
}
```

## Notes

- Terraform runtime must have `roles/secretmanager.secretAccessor` to read secrets from Secret Manager
- The connection string secret must already exist in Secret Manager
- The module parses the connection string to extract username, password, and database name
- Falls back to `db_user`, `db_password`, and `database_name` variables if `connection_string_secret` is not provided
- If `network` is provided, the instance will use private IP within that VPC (pass `module.network.vpc_id` from modules/network)
- If `network` is not provided, the instance will use public IP (not recommended for production)
- `require_private_ip` is set to `true` by default; set to `false` to allow public IP
- Ensure the instance name does not conflict with existing Cloud SQL instances
