terraform {
  backend "gcs" {
    bucket = "brokerapp-tfstate"
    prefix = "terraform/state"
  }
}