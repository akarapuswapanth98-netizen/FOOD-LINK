"""Shared API schemas (restored: routes_health/routes_chat import these).

Additive-only module - no existing logic touched.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    llm_provider: str = "mock"
    llm_model: str = ""
    rag_enabled: bool = False
    db_enabled: bool = False
    llm_configured: bool = False


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    use_rag: bool = False


class ChatResponse(BaseModel):
    reply: str
    provider: str = "mock"
    model: str = ""
    sources: List[Any] = Field(default_factory=list)
    meta: Dict[str, Any] = Field(default_factory=dict)
