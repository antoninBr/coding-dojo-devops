resource "google_cloud_run_service" "default" {
  name     = "flask-minesweeper"
  location = var.region

  template {
    metadata {
      annotations = {
        # Plafond d'instances : limite la facture en cas de pic de trafic (ou d'attaque).
        "autoscaling.knative.dev/maxScale" = "2"
      }
    }

    spec {
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/flask-minesweeper:${var.image_tag}"
        ports {
          container_port = 5000
        }

        resources {
          limits = {
            cpu    = "1000m"
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
  description = "URL publique du service Cloud Run."
  value       = google_cloud_run_service.default.status[0].url
}