variable "project_id" {
  description = "The ID of the GCP project."
  type        = string
}

variable "region" {
  description = "The region to deploy Cloud Run service."
  type        = string
  default     = "us-central1"
}