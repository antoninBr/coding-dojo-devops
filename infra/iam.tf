resource "google_cloud_run_service_iam_member" "member" {
  location = var.region
  project  = var.project_id
  service  = "flask-minesweeper"
  role     = "roles/run.invoker"
  member   = "allUsers"
}