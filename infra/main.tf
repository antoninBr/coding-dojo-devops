resource "google_cloud_run_service" "default" {
  name     = "flask-minesweeper"
  location = var.region

  template {
    spec {
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/flask-minesweeper:stable"
        ports {
          container_port = 5000
        }

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
  value = "TODO: Mettre l'url du service exposé sur internet"
}