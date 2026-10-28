<p align="center"><img src="app/static/logo.svg" width="96" alt="Logo Démineur"></p>

# coding-dojo-devops

Coding dojo DevOps : on prend une petite application web (un **démineur** en Python/Flask) et on la fait passer
du code source jusqu'à une URL publique en **https** sur Google Cloud, de manière **entièrement automatisée**.

Le but n'est pas le jeu, mais tout ce qu'il y a autour :

* **tester** le code automatiquement (pytest + ruff) ;
* **conteneuriser** une application (Docker) ;
* **vérifier** sa qualité automatiquement (lint du Dockerfile avec hadolint) ;
* **construire et publier** une image à chaque push (GitHub Actions + Artifact Registry) ;
* **décrire l'infrastructure en code** et la déployer (Terraform + Cloud Run).

> Un `git push` sur `main` = une nouvelle version en ligne, sans aucune action manuelle.

![Capture du démineur](docs/screenshot.png)

Le jeu : trois niveaux, clic pour découvrir, clic droit (ou appui long sur mobile) pour poser un drapeau,
clic sur un chiffre pour découvrir ses voisins quand tous les drapeaux sont posés. Jouable au clavier
(flèches, Entrée, `F`).

## Vue d'ensemble de la stack

```mermaid
flowchart LR
    dev["👩‍💻 Développeur"] -- git push --> gh["GitHub<br/>repo coding-dojo-devops"]

    subgraph ci["GitHub Actions"]
        test["pytest + ruff<br/>(tests Python)"] --> lint["hadolint<br/>(lint Dockerfile)"]
        lint --> build["docker build"]
        build --> tf["terraform plan / apply"]
    end

    gh --> test

    subgraph gcp["Google Cloud (projet coding-dojo-devops, europe-west9)"]
        ar[("Artifact Registry<br/>repo app")]
        state[("Cloud Storage<br/>tfstate Terraform")]
        run["Cloud Run<br/>service flask-minesweeper"]
    end

    build -- docker push --> ar
    tf -- lit / écrit l'état --> state
    tf -- crée / met à jour --> run
    ar -- image du build --> run
    user["🌍 Utilisateurs"] -- https --> run
```

| Brique | Rôle |
|---|---|
| **Python / Flask / gunicorn** | L'application : sert la page du démineur sur le port 5000 (le jeu lui-même tourne en JavaScript dans le navigateur). gunicorn est le serveur de production dans le conteneur. |
| **pytest / ruff** | Tests unitaires et linter Python : le pipeline s'arrête si l'un échoue. |
| **Docker** | Emballe l'application et ses dépendances dans une image exécutable partout. Build *multistage* : une image intermédiaire installe les dépendances, l'image finale ne garde que le nécessaire. |
| **GitHub Actions** | La CI/CD : exécute le pipeline à chaque push. |
| **hadolint** | Linter de Dockerfile : bloque le pipeline si le Dockerfile ne respecte pas les bonnes pratiques. |
| **Artifact Registry** | Registre privé GCP qui stocke les images Docker. |
| **Terraform** | Infrastructure as Code : décrit le service Cloud Run et ses droits, puis l'applique. |
| **Cloud Storage** | Stocke le *state* Terraform (ce que Terraform a déjà créé) pour qu'il soit partagé. |
| **Cloud Run** | Exécute le conteneur en serverless et l'expose en https. Descend à 0 instance sans trafic, plafonné à 2. |

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
    GH->>GH: ruff check + pytest
    GH->>GH: hadolint app/Dockerfile
    GH->>GH: docker build (tag = horodatage)
    GH->>AR: docker push flask-minesweeper:AAAAMMJJHHMMSS

    alt branche main uniquement
        GH->>AR: même image retaguée flask-minesweeper:stable
        GH->>TF: terraform init / plan / apply
        TF->>CR: nouvelle révision avec l'image AAAAMMJJHHMMSS
        CR-->>Dev: application en ligne en https
    end
```

* **Toutes les branches** : tests + lint + build + push d'une image taguée avec la date. Ça permet de vérifier que tout
  se construit, sans toucher à la production.
* **Branche `main`** : en plus, l'image est aussi taguée `stable`, puis Terraform déploie sur Cloud Run
  l'image du tag horodaté. Ce tag ne change jamais, donc chaque push crée bien une nouvelle révision
  (avec un tag mobile comme `stable`, Terraform ne verrait aucune différence et ne redéploierait rien).

## Maîtriser les coûts : `maxScale`

Cloud Run facture à l'usage : CPU et mémoire pendant le traitement des requêtes, nombre de requêtes et trafic
sortant. Sans trafic, le service descend à **0 instance** et ne coûte rien. Avec beaucoup de trafic, il crée
automatiquement de nouvelles instances, jusqu'à **100 par défaut**... et la facture suit.

Dans [`infra/main.tf`](infra/main.tf), une annotation plafonne ce nombre :

```hcl
metadata {
  annotations = {
    "autoscaling.knative.dev/maxScale" = "2"
  }
}
```

* Chaque instance traite jusqu'à 80 requêtes en parallèle (`containerConcurrency`). Au-delà de
  2 × 80 requêtes simultanées, Cloud Run met les requêtes en attente puis répond `429` plutôt que d'ajouter
  des machines.
* Le coût CPU/mémoire est donc borné : au pire 2 instances qui tournent en continu.
* Ce qui **n'est pas** borné : le prix par requête et le trafic sortant. Un vrai DDoS se traite en amont
  (Cloud Armor derrière un load balancer), avec une **alerte de budget** sur le compte de facturation pour
  être prévenu.

C'est un compromis classique : on accepte de dégrader le service (des `429`) pour garantir la facture.
Pour un site marchand, on ferait l'inverse.

## Organisation du repo

```text
.
├── app/                     # L'application
│   ├── app.py               # Serveur Flask
│   ├── templates/index.html # Page du jeu (HTML/CSS)
│   ├── static/              # Logique du jeu (JS) et logo
│   ├── tests/               # Tests pytest
│   ├── requirements.txt     # Dépendances Python
│   ├── requirements-dev.txt # Dépendances de test (pytest, ruff)
│   ├── pyproject.toml       # Configuration pytest / ruff
│   ├── Dockerfile           # Construction de l'image (multistage)
│   ├── .dockerignore        # Fichiers exclus du contexte de build
│   └── docker-compose.yml   # Lancement local avec Docker
├── infra/                   # L'infrastructure (Terraform)
│   ├── backend.tf           # State stocké dans un bucket GCS
│   ├── versions.tf          # Versions de Terraform et du provider google
│   ├── provider.tf          # Configuration du provider google
│   ├── variables.tf         # Variables d'entrée
│   ├── env.tfvars           # Valeurs : projet, région, registre
│   ├── main.tf              # Service Cloud Run (plafonné à 2 instances)
│   └── iam.tf               # Accès public (allUsers -> run.invoker)
├── docs/                    # Documentation (AsciiDoc) publiée sur GitHub Pages
└── .github/workflows/       # Pipeline CI/CD et publication de la doc
```

## Prérequis

* Un compte GitHub avec accès au repo.
* Git et Python 3.10+ en local, ou un **GitHub Codespace** (rien à installer).
* Docker, optionnel, pour tester l'image en local.

Aucun accès à la console GCP n'est nécessaire : c'est la CI qui parle à Google Cloud.

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

Lancer les tests et le linter (ce que fait la CI) :

```bash
cd app
pip install -r requirements-dev.txt
ruff check .
pytest -v
```

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

Le repo a deux branches :

* **`dojo`** : l'énoncé. Le code à écrire a été retiré et remplacé par des commentaires `TODO`. On part de là.
* **`main`** : la solution complète, celle qui tourne en production.

Une pull request en *draft* `dojo` → `main` affiche le diff entre les deux, c'est-à-dire la correction.
Elle ne sera **jamais mergée**, et on ne la regarde qu'à la fin 😉

Pour démarrer :

```bash
git switch -c feature/<prenom> origin/dojo
git grep -n TODO
```

| Exercice | Où |
|---|---|
| Valider le Dockerfile avec hadolint dans la CI | `.github/workflows/docker-build-and-terraform.yml` |
| Écrire un Dockerfile multistage (dépendances, utilisateur non root, cache) | `app/Dockerfile` |
| Accélérer le build avec un `.dockerignore` | `app/.dockerignore` |
| Construire l'image avec docker compose | `app/docker-compose.yml` |
| Exposer l'URL du service en sortie Terraform | `infra/main.tf` |
| Écrire une doc et la publier sur GitHub Pages | `docs/index.adoc` + un nouveau workflow |

Chaque push déclenche le pipeline (tests, lint, build, push de l'image) : regardez l'onglet **Actions** de GitHub
pour voir ce qui passe... ou casse. Le déploiement sur Cloud Run ne part que depuis `main`.

Règles du jeu :

* jamais de secret ni de clé dans le code : tout passe par les secrets GitHub ;
* un pipeline rouge se répare avant de pousser autre chose ;
* on lit le message d'erreur en entier avant de demander de l'aide.

## Accès

* Le jeu : https://flask-minesweeper-28477363719.europe-west9.run.app
* La doc : https://antoninbr.github.io/coding-dojo-devops/
