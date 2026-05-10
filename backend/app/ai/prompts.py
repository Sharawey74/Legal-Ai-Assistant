from langchain_core.prompts import ChatPromptTemplate

def build_rag_prompt():
    return ChatPromptTemplate.from_template("""
    You are a legal assistant. Use the following context to answer the question.
    Context: {context}
    Question: {question}
    Answer:""")

def build_context_block(chunks: list[dict]) -> str:
    return "\n\n".join([f"Doc: {c['filename']}, Page: {c['page_number']}\n{c['text']}" for c in chunks])
