terraform {
  backend "gcs" {
    bucket = "coding-dojo-devops_tfstate"
    prefix = "ENV"
  }
}