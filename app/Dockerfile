# TODO: Transformer ce Dockerfile en build multistage :
#   - une image intermédiaire qui installe les dépendances PIP ;
#   - une image finale qui ne récupère que les dépendances installées et le code.
FROM python:3.14-alpine

ARG VERSION
ENV VERSION=$VERSION

WORKDIR /app

# TODO: Copier les dépendances PIP et l'application, en tirant parti du cache Docker
#       (l'ordre des instructions compte, VERSION comprise)

# TODO: Ne pas exécuter l'application en root

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
