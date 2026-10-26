# coding-dojo-devops

Coding dojo DevOps : on prend une petite application web (un **démineur** en Python/Flask) et on la fait passer
du code source jusqu'à une URL publique en **https** sur Google Cloud, de manière **entièrement automatisée**.

Le but n'est pas le jeu, mais tout ce qu'il y a autour :

* **conteneuriser** une application (Docker) ;
* **vérifier** sa qualité automatiquement (lint du Dockerfile avec hadolint) ;
* **construire et publier** une image à chaque push (GitHub Actions + Artifact Registry) ;
* **décrire l'infrastructure en code** et la déployer (Terraform + Cloud Run).

> Un `git push` sur `main` = une nouvelle version en ligne, sans aucune action manuelle.

## Vue d'ensemble de la stack

```mermaid
flowchart LR
    dev["👩‍💻 Développeur"] -- git push --> gh["GitHub<br/>repo coding-dojo-devops"]

    subgraph ci["GitHub Actions"]
        lint["hadolint<br/>(lint Dockerfile)"] --> build["docker build"]
        build --> tf["terraform plan / apply"]
    end

    gh --> lint

    subgraph gcp["Google Cloud (projet coding-dojo-devops, europe-west9)"]
        ar[("Artifact Registry<br/>repo app")]
        state[("Cloud Storage<br/>tfstate Terraform")]
        run["Cloud Run<br/>service flask-minesweeper"]
    end

    build -- docker push --> ar
    tf -- lit / écrit l'état --> state
    tf -- crée / met à jour --> run
    ar -- image :stable --> run
    user["🌍 Utilisateurs"] -- https --> run
```

| Brique | Rôle |
|---|---|
| **Python / Flask** | L'application : sert la page du démineur sur le port 5000. |
| **Docker** | Emballe l'application et ses dépendances dans une image exécutable partout. |
| **GitHub Actions** | La CI/CD : exécute le pipeline à chaque push. |
| **hadolint** | Linter de Dockerfile : bloque le pipeline si le Dockerfile ne respecte pas les bonnes pratiques. |
| **Artifact Registry** | Registre privé GCP qui stocke les images Docker. |
| **Terraform** | Infrastructure as Code : décrit le service Cloud Run et ses droits, puis l'applique. |
| **Cloud Storage** | Stocke le *state* Terraform (ce que Terraform a déjà créé) pour qu'il soit partagé. |
| **Cloud Run** | Exécute le conteneur en serverless et l'expose en https. |

## Processus de déploiement

Le pipeline est défini dans [`.github/workflows/docker-build-and-terraform.yml`](.github/workflows/docker-build-and-terraform.yml).

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Développeur
    participant GH as GitHub Actions
    participant AR as Artifact Registry
    participant TF as Terraform
    participant CR as Cloud Run

    Dev->>GH: git push (n'importe quelle branche)
    GH->>GH: hadolint app/Dockerfile
    GH->>GH: docker build (tag = horodatage)
    GH->>AR: docker push flask-minesweeper:AAAAMMJJHHMMSS

    alt branche main uniquement
        GH->>GH: docker build (tag = stable)
        GH->>AR: docker push flask-minesweeper:stable
        GH->>TF: terraform init / plan / apply
        TF->>CR: crée ou met à jour le service (image :stable)
        CR-->>Dev: application en ligne en https
    end
```

* **Toutes les branches** : lint + build + push d'une image taguée avec la date. Ça permet de vérifier que tout
  se construit, sans toucher à la production.
* **Branche `main`** : en plus, publication du tag `stable` et déploiement Terraform sur Cloud Run.

## Organisation du repo

```text
.
├── app/                     # L'application
│   ├── app.py               # Serveur Flask
│   ├── templates/index.html # Le démineur (HTML/JS)
│   ├── requirements.txt     # Dépendances Python
│   ├── Dockerfile           # Construction de l'image
│   └── docker-compose.yml   # Lancement local avec Docker
├── infra/                   # L'infrastructure (Terraform)
│   ├── backend.tf           # State stocké dans un bucket GCS
│   ├── versions.tf          # Versions de Terraform et du provider google
│   ├── provider.tf          # Configuration du provider google
│   ├── variables.tf         # Variables d'entrée
│   ├── env.tfvars           # Valeurs : projet, région, registre
│   ├── main.tf              # Service Cloud Run
│   └── iam.tf               # Accès public (allUsers -> run.invoker)
├── docs/                    # Documentation à publier
└── .github/workflows/       # Pipeline CI/CD
```

## Lancer en local

Sans Docker (Python 3.10+) :

```bash
cd app
pip install --no-cache-dir -r requirements.txt
python app.py
```

Avec Docker :

```bash
cd app
docker compose up --build
```

L'application est accessible sur http://localhost:5000 (ou sur l'URL indiquée par la console dans un GitHub Codespace).

## Configuration GCP

Ces éléments sont créés **à la main une fois pour toutes** (ils ne sont pas gérés par Terraform) :

| Élément | Valeur |
|---|---|
| Projet | `coding-dojo-devops-473609` |
| Région | `europe-west9` (Paris) |
| Bucket du state Terraform | `coding-dojo-devops_tfstate` |
| Repo Artifact Registry | `app` |
| Service account de la CI | `tf-sa-github` |

Secrets GitHub utilisés par le pipeline (*Settings > Secrets and variables > Actions*) :

| Secret | Contenu |
|---|---|
| `GCP_SERVICE_ACCOUNT_KEY` | Clé JSON du service account `tf-sa-github` |
| `GCP_PROJECT_ID` | ID du projet GCP |
| `REGION` | Région GCP |
| `ARTIFACT_REGISTRY_REPO` | Nom du repo Artifact Registry |

## Le dojo

Les exercices sont signalés par des commentaires `TODO` dans le code :

```bash
git grep -n TODO
```

On travaille sur la branche `dojo`. Chaque push déclenche le pipeline : regardez l'onglet **Actions** de GitHub
pour voir ce qui passe... ou casse.

## Accès

https://flask-minesweeper-28477363719.europe-west9.run.app
