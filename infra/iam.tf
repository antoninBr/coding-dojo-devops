resource "google_cloud_run_service_iam_member" "member" {
  location = var.region
  project  = var.project_id
  service  = "default"
  role     = "roles/run.invoker"
  member   = "allUsers"
}