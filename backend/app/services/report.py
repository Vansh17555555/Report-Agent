import asyncio
from typing import AsyncGenerator, List
from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.params import CHROMA_DB_DIR, EMBEDDING_MODEL, LLM_MODEL, COLLECTION_NAME

class ReportService:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
        self.vector_store = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=self.embeddings,
            collection_name=COLLECTION_NAME
        )
        self.llm = ChatOllama(model=LLM_MODEL, temperature=0.3) # Lower temp for factual reports

    async def generate_report_stream(self, topic: str) -> AsyncGenerator[str, None]:
        """
        Generates a report in steps:
        1. Plan research queries
        2. Retrieve documents
        3. Synthesize report
        Yields progress strings and final report chunks.
        """
        
        # 1. Planning
        yield "event: status\ndata: 🧠 Analyzing topic and planning research...\n\n"
        
        planning_prompt = ChatPromptTemplate.from_template(
            "You are a research planner. Given the topic '{topic}', "
            "generate a list of 3 specific search queries to gather comprehensive information "
            "from a vector database. Return ONLY the queries separated by newlines."
        )
        planner = planning_prompt | self.llm | StrOutputParser()
        plan_text = await planner.ainvoke({"topic": topic})
        queries = [q.strip() for q in plan_text.split('\n') if q.strip()]
        
        yield f"event: status\ndata: 🔍 Plan generated: {len(queries)} research vectors.\n\n"

        # 2. Research / Retrieval
        all_context = []
        retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})
        
        for i, query in enumerate(queries):
            yield f"event: status\ndata: 🕵️‍♀️ Executing search {i+1}/{len(queries)}: '{query}'...\n\n"
            docs = await retriever.ainvoke(query)
            for doc in docs:
                source = doc.metadata.get("source", "Unknown")
                content = doc.page_content.replace("\n", " ")
                all_context.append(f"[Source: {source}] {content}")
        
        unique_context = list(set(all_context)) # Simple dedupe
        context_str = "\n\n".join(unique_context)
        
        yield f"event: status\ndata: 📚 Analyzed {len(unique_context)} unique content chunks. Writing report...\n\n"

        # 3. Synthesis
        report_prompt = ChatPromptTemplate.from_template(
            "You are an Executive Analyst. Write a comprehensive report on '{topic}' "
            "based ONLY on the following context. "
            "Format nicely with Markdown (Headers, Bullet points). "
            "Include a clean 'Executive Summary' at the start. "
            "Cite sources explicitly using [Source: filename] notation where appropriate.\n\n"
            "Context:\n{context}"
        )
        
        writer = report_prompt | self.llm | StrOutputParser()
        
        # Stream the final report
        yield "event: report_start\ndata: \n\n"
        async for chunk in writer.astream({"topic": topic, "context": context_str}):
            # SSE format requires "data: " prefix for each line
            # But simple streaming often handles just raw bytes if client expects it.
            # Here we follow a custom SSE-like convention or just raw text.
            # To integrate easily with our frontend reader (which handles raw text), 
            # we should separate status from content. 
            # Let's switch to a structured event format if frontend can handle it, 
            # OR just dump text.
            
            # Implementation Choice: 
            # The previous chat implementation used a simple text decoder. 
            # Mixing "Status updates" and "Markdown Report" in one raw stream is messy.
            # Let's use a special separator or just yield the report text for now to keep it simple compatible?
            # User wants "Deep Research Agent". Status updates are cool.
            # I will use a prefix convention that the frontend can parse, OR
            # Just yield the report directly for simplicity, but that loses the "Agent" feel.
            
            # Let's stick to Server Sent Events (SSE) format strictly.
            # data: <content>\n\n
            yield f"data: {chunk}\n\n"
            
        yield "event: done\ndata: \n\n"
