# Étape 1 : image intermédiaire qui installe les dépendances.
# Elle peut contenir des outils de build (compilateur, en-têtes...) qui ne partiront pas en production.
FROM python:3.14-alpine AS build

WORKDIR /build

# On copie d'abord uniquement requirements.txt : tant qu'il ne change pas,
# Docker réutilise cette couche en cache et ne réinstalle pas les dépendances.
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Étape 2 : image finale, la plus légère possible.
FROM python:3.14-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances déjà installées par l'étape de build
COPY --from=build /install /usr/local

# Code de l'application (filtré par .dockerignore)
COPY . .

# Ne pas tourner en root dans le conteneur
RUN adduser -D -H app
USER app

# La version change à chaque build : on la déclare en dernier pour ne pas invalider le cache des étapes précédentes.
ARG VERSION
ENV VERSION=$VERSION

EXPOSE 5000

# Serveur de production (le serveur intégré de Flask est réservé au développement)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
