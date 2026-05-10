from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings


def get_llm(is_thinking_mode: bool = False) -> BaseChatModel:
    """
    Returns the configured LLM.

    LLM_PROVIDER=openrouter  → uses OpenRouter API
      - Normal mode  : settings.OPENROUTER_MODEL        (e.g. openai/gpt-oss-120b)
      - Thinking mode: settings.OPENROUTER_THINKING_MODEL (e.g. z-ai/glm-4.5-air:free)
                       with include_reasoning=True sent in the request body to activate
                       GLM-4.5-Air's chain-of-thought deep-thinking feature.
    LLM_PROVIDER=ollama      → uses local Ollama (llama3.2:3b)
    """
    if settings.LLM_PROVIDER == "openrouter":
        from langchain_openai import ChatOpenAI
        model_name    = settings.OPENROUTER_THINKING_MODEL if is_thinking_mode else settings.OPENROUTER_MODEL
        api_key_to_use = settings.OPENROUTER_THINKING_API_KEY if is_thinking_mode else settings.OPENROUTER_API_KEY

        # GLM-4.5-Air (and other OpenRouter reasoning models) require
        # `include_reasoning: true` in the request body to activate deep thinking.
        # LangChain passes model_kwargs as extra fields on the OpenAI payload.
        extra_kwargs = {"include_reasoning": True} if is_thinking_mode else {}

        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key_to_use,
            model=model_name,
            temperature=0.1,                         # low temperature for factual legal answers
            max_tokens=4096 if is_thinking_mode else 1024,
            model_kwargs=extra_kwargs,
        )
    else:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,            # llama3.2:3b
            temperature=0.1,
        )
