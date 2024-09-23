# Utiliser l'image Python alpine de base
FROM python:3.9-alpine

#ARGUMENT
ARG VERSION

#ENV VAR
ENV VERSION=$VERSION

# Définir le répertoire de travail
WORKDIR /app

# TODO: Copier application et dépendances PIP
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

# Exposer le port 5000
EXPOSE 5000

# Définir la commande pour exécuter l'application
CMD ["python", "app.py"]
