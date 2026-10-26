variable "project_id" {
  description = "The ID of the GCP project."
  type        = string
}

variable "region" {
  description = "The region to deploy Cloud Run service."
  type        = string
}

variable "artifact_registry_repo" {
  description = "The registry name"
  type        = string
}
variable "image_tag" {
  description = "Tag of the image to deploy. The CI passes the immutable build tag so each push creates a new Cloud Run revision."
  type        = string
  default     = "stable"
}
