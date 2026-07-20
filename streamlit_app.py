"""Publica o jogo HTML dentro do Streamlit Community Cloud."""

from base64 import b64encode
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent


def data_uri(path: Path) -> str:
    """Converte uma imagem local em uma URL incorporada ao documento."""
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    encoded = b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def build_game_page() -> str:
    """Monta um único HTML autocontido para o componente do Streamlit."""
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    styles = (ROOT / "style.css").read_text(encoding="utf-8")
    script = (ROOT / "script.js").read_text(encoding="utf-8")

    page = page.replace(
        '<link rel="stylesheet" href="style.css">',
        f"<style>{styles}</style>",
    )
    page = page.replace(
        '<script src="script.js"></script>',
        f"<script>{script}</script>",
    )

    for image_path in (ROOT / "imagens").iterdir():
        if image_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        page = page.replace(
            f"imagens/{image_path.name}",
            data_uri(image_path),
        )

    return page


st.set_page_config(
    page_title="Quebra-Cabeça dos Amigos",
    page_icon="Q",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
      #MainMenu, header, footer { visibility: hidden; }
      .stApp { background: #f3f0e9; }
      .block-container { max-width: none; padding: 0; }
      iframe { display: block; }
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(build_game_page(), height=1200, scrolling=True)
