from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from database import get_db
from rag.drafter import draft_document, TEMPLATES

router = APIRouter()


class DraftRequest(BaseModel):
    doc_type: str                   # e.g. "employment_contract"
    instructions: str               # specific details to include
    language: str = "mt"            # mt = Maltese (default), en = English


@router.get("/templates")
async def list_templates():
    """List all available document templates."""
    return [{"id": k, "title": v} for k, v in TEMPLATES.items()]


@router.post("/")
async def create_draft(
    req: DraftRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a DOCX legal document grounded in Maltese law."""
    docx_bytes = await draft_document(
        doc_type=req.doc_type,
        instructions=req.instructions,
        language=req.language,
        db=db,
    )
    filename = f"{req.doc_type}_{req.language}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
