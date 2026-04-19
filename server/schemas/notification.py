from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from models.notification import NotificationType


class NotificationOut(BaseModel):
    id: UUID = Field(..., description="Notification UUID")
    user_id: UUID = Field(..., description="Recipient user UUID")
    type: NotificationType = Field(..., description="Notification type discriminator")
    title: str = Field(..., description="Short headline displayed in the bell/drawer")
    body: str | None = Field(default=None, description="Optional longer body text")
    link: str | None = Field(
        default=None,
        description="Optional frontend route to deep-link to on click",
        examples=["/debts/00000000-0000-0000-0000-000000000001"],
    )
    payload: dict[str, Any] | None = Field(
        default=None, description="Optional machine-readable context payload"
    )
    read_at: datetime | None = Field(
        default=None, description="UTC timestamp when the user marked this as read"
    )
    created_at: datetime = Field(..., description="UTC datetime when emitted")
    actor_display_name: str | None = Field(
        default=None,
        description="Display name of the actor who triggered this notification, if applicable",
        examples=["Jane Smith"],
    )
    actor_username: str | None = Field(
        default=None,
        description="Username of the actor who triggered this notification, if applicable",
        examples=["janesmith"],
    )

    model_config = {"from_attributes": True}


class NotificationListOut(BaseModel):
    items: list[NotificationOut] = Field(
        ..., description="Recent notifications for the authenticated user, newest first"
    )
    unread: int = Field(..., description="Count of unread notifications for this user")


class PushKeys(BaseModel):
    p256dh: str = Field(
        ...,
        description="ECDH public key (base64url) from the browser PushSubscription",
        examples=["BLc4xRzKlKORKWlbdgFaBrrPK3ydWAH..."],
    )
    auth: str = Field(
        ...,
        description="Auth secret (base64url) from the browser PushSubscription",
        examples=["4vQK-3eN1aBcDeFgHiJkLm"],
    )


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(
        ...,
        description="Browser push endpoint URL",
        examples=["https://fcm.googleapis.com/fcm/send/abc123"],
    )
    keys: PushKeys = Field(..., description="ECDH + auth secret pair bound to this endpoint")


class PushSubscriptionOut(BaseModel):
    id: UUID = Field(..., description="Subscription UUID")
    endpoint: str = Field(..., description="Browser push endpoint URL")
    user_agent: str | None = Field(
        default=None, description="User-Agent header captured at subscription time"
    )
    created_at: datetime = Field(..., description="UTC datetime when the subscription was stored")

    model_config = ConfigDict(from_attributes=True)
