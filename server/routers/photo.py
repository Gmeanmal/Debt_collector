from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.photo_controller import SubPhotoController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.sub_photo import SubPhotoOut

_E400 = {"description": "Bad request — unsupported MIME type or file exceeds 5 MB limit"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller is not a sub, or sub has no assigned goddess"}
_E413 = {"description": "Payload too large — file exceeds the 5 MB size limit"}
_E415 = {"description": "Unsupported media type — only jpeg, png, webp are accepted"}

router = APIRouter(tags=["sub-profile"])


@router.post(
    "/profile/photos",
    summary="Upload a sub profile photo",
    description=(
        "Sub uploads a profile photo via multipart/form-data. "
        "The server validates MIME type (jpeg, png, webp) and size (≤ 5 MB), "
        "strips all EXIF metadata, derives the goddess assignment from the calling sub's profile, "
        "stores the object under `<goddess_id>/<sub_id>/<uuid>.<ext>`, "
        "and inserts a `sub_photo` row with `status=pending`. "
        "The response includes a presigned GET URL valid for 10 minutes. "
        "Goddess review (approve/reject) is handled by B5."
    ),
    response_model=SubPhotoOut,
    status_code=201,
    tags=["sub-profile"],
    responses={
        400: _E400,
        401: _E401,
        403: _E403,
        413: _E413,
        415: _E415,
    },
)
async def upload_profile_photo(
    file: UploadFile = File(..., description="Photo to upload (jpeg, png, or webp; ≤ 5 MB)."),
    session: AsyncSession = Depends(get_session),
    caller: User = Depends(require_role(UserRole.sub)),
) -> SubPhotoOut:
    """Upload a profile photo as the authenticated sub."""
    raw = await file.read()
    mime = file.content_type or ""
    ctrl = SubPhotoController(session)
    photo, presigned_url = await ctrl.upload(caller=caller, file_bytes=raw, mime_type=mime)
    await session.commit()
    return SubPhotoOut(
        id=photo.id,
        status=photo.status,
        uploaded_at=photo.uploaded_at,
        r2_key=photo.r2_key,
        presigned_get_url=presigned_url,
    )
