# coding-dojo-devops

Simple projet de construction et de déploiement sur GCP d'un démineur accessible en https.

## Stack

### App

* Python
* Flask (Port 5000)

### Construction & Déploiement

* Github Actions
* Docker
* Terraform

## Local

Se positionner dans le dossier /app.  

`pip install --no-cache-dir -r requirements.txt`

`python app.py`

Application accessible par http://localhost:5000 si éxecution poste local, sur une Url indiquée dans la console si Github Space.

## Modules

### App

Code applicatif en python du jeu.

### Infra

Code terraform de création du service sur GCP Cloud Run et gestion IAM.

## Accès

https://flask-minesweeper-hyqkspxkzq-od.a.run.app/


