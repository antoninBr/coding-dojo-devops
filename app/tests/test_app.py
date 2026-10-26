import pytest

from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_index_returns_game_page(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "Démineur" in response.get_data(as_text=True)


def test_index_shows_version(client):
    app.config["VERSION"] = "20261026120000"

    response = client.get("/")

    assert "Version : 20261026120000" in response.get_data(as_text=True)


def test_index_without_version_falls_back_to_local(client):
    app.config["VERSION"] = None

    response = client.get("/")

    assert "Version : locale" in response.get_data(as_text=True)


def test_game_script_is_served(client):
    response = client.get("/static/minesweeper.js")

    assert response.status_code == 200
    assert "javascript" in response.content_type


def test_unknown_page_returns_404(client):
    assert client.get("/nope").status_code == 404
