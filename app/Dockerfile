# Utiliser l'image Python alpine de base
FROM python:3.9-alpine

#ARGUMENT
ARG VERSION

#ENV VAR
ENV VERSION=$VERSION

# Définir le répertoire de travail
WORKDIR /app

# Copier le fichier de dépendances
COPY requirements.txt .

# Installer les dépendances
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste de l'application
COPY . .

# Exposer le port 5000
EXPOSE 5000

# Définir la commande pour exécuter l'application
CMD ["python", "app.py"]
