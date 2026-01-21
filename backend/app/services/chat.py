from typing import AsyncGenerator
from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from app.params import CHROMA_DB_DIR, EMBEDDING_MODEL, LLM_MODEL, COLLECTION_NAME

class ChatService:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
        self.vector_store = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=self.embeddings,
            collection_name=COLLECTION_NAME
        )
        self.llm = ChatOllama(model=LLM_MODEL)
        
        # 1. Contextualize question prompt
        # This prompt reformulates the question based on history
        contextualize_q_system_prompt = (
            "Given a chat history and the latest user question "
            "which might reference context in the chat history, "
            "formulate a standalone question which can be understood "
            "without the chat history. Do NOT answer the question, "
            "just reformulate it if needed and otherwise return it as is."
        )
        self.contextualize_q_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", contextualize_q_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )

        # 2. Answer prompt
        # This prompt answers the question using the retrieved context
        system_prompt = (
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer "
            "the question. If you don't know the answer, say that you "
            "don't know. Use three sentences maximum and keep the "
            "answer concise."
            "\n\n"
            "{context}"
        )
        self.qa_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )

    def get_rag_chain(self):
        retriever = self.vector_store.as_retriever()
        
        # History aware retriever
        history_aware_retriever = create_history_aware_retriever(
            self.llm, retriever, self.contextualize_q_prompt
        )
        
        # Question answer chain
        question_answer_chain = create_stuff_documents_chain(self.llm, self.qa_prompt)
        
        # Final RAG chain
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
        return rag_chain

    async def chat_stream(self, message: str, history: list) -> AsyncGenerator[str, None]:
        chain = self.get_rag_chain()
        
        # Convert simple list of dicts to LangChain Message objects
        # Expecting history format: [{"role": "user", "content": "..."}, {"role": "ai", "content": "..."}]
        chat_history = []
        for msg in history:
            if msg["role"] == "user":
                chat_history.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "ai":
                chat_history.append(AIMessage(content=msg["content"]))

        # Stream the response
        print("Starting LLM stream...")
        async for chunk in chain.astream({"input": message, "chat_history": chat_history}):
            if "answer" in chunk:
                print(f"Chunk received: {chunk['answer'][:20]}...")
                # The 'answer' chunk from create_retrieval_chain might be the whole string or token-by-token depending on the LLM
                # For ChatOllama it usually streams tokens if configured, but create_retrieval_chain often yields final answer in chunks.
                # Actually, 'answer' key in the dict is populated.
                # However, with astream, we get intermediate dictionary steps. 
                # We need to yield the content of the answer.
                yield chunk["answer"]
            # We can also yield context citations if needed from chunk["context"]
