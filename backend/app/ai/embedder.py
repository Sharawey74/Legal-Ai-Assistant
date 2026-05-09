from langchain_openai import OpenAIEmbeddings
from app.config import settings

def embed_text(text: str) -> list[float]:
    embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
    return embeddings.embed_query(text)
