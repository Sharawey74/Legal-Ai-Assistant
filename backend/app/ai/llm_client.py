from langchain_openai import ChatOpenAI
from app.config import settings

def get_llm():
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        temperature=0,
        openai_api_key=settings.OPENAI_API_KEY
    )
