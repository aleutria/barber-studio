from fastapi import APIRouter, Request

from template_engine import templates

router = APIRouter(tags=["paginas"])


@router.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        request=request, name="index.html", context={}
    )

@router.get("/admin")
async def panel_admin(request: Request):
    return templates.TemplateResponse(
        request=request, name="admin.html", context={}
    )