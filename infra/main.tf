resource "google_cloud_run_service" "default" {
  name     = "flask-minesweeper"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/flask-minesweeper:latest"

        resources {
          limits = {
            memory = "512Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  autogenerate_revision_name = true
}

output "cloud_run_url" {
  value = google_cloud_run_service.default.status[0].url
}