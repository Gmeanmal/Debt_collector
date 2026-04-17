from fastapi import Depends, HTTPException

from core.config import Settings, get_settings


def require_medical_feature(settings: Settings = Depends(get_settings)) -> None:
    if not settings.medical_feature_enabled:
        raise HTTPException(status_code=404, detail="Not Found")
