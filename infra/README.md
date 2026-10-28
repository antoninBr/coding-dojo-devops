<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.9 |
| <a name="requirement_google"></a> [google](#requirement\_google) | ~> 8.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_google"></a> [google](#provider\_google) | 8.8.1 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [google_cloud_run_service.default](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service) | resource |
| [google_cloud_run_service_iam_member.member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service_iam_member) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_artifact_registry_repo"></a> [artifact\_registry\_repo](#input\_artifact\_registry\_repo) | The registry name | `string` | n/a | yes |
| <a name="input_image_tag"></a> [image\_tag](#input\_image\_tag) | Tag of the image to deploy. The CI passes the immutable build tag so each push creates a new Cloud Run revision. | `string` | `"stable"` | no |
| <a name="input_project_id"></a> [project\_id](#input\_project\_id) | The ID of the GCP project. | `string` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | The region to deploy Cloud Run service. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cloud_run_url"></a> [cloud\_run\_url](#output\_cloud\_run\_url) | URL publique du service Cloud Run. |
<!-- END_TF_DOCS -->