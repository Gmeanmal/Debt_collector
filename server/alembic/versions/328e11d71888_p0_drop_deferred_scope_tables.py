"""P0 — drop deferred scope tables: payment_webhook_event, throne_connection, wishlist_item.

PG enum orphan values retained intentionally:
  paymentsource / declarationsource: 'ingested'
  paymentcategory: 'wishlist'
  allocationtargettype: 'wishlist_goal'
  notificationtype: 'wishlist_fulfilled'

Postgres does not support ALTER TYPE ... DROP VALUE, so these values stay as orphans.
No new rows will ever carry them; they are harmless dead entries in the enum type.

Revision ID: 328e11d71888
Revises: bca1c200482d
Create Date: 2026-04-16
"""

from alembic import op

revision = "328e11d71888"
down_revision = "bca1c200482d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_webhook_event_result", table_name="payment_webhook_event")
    op.drop_index("ix_webhook_event_goddess_id", table_name="payment_webhook_event")
    op.drop_table("payment_webhook_event")

    op.drop_table("throne_connection")

    op.drop_table("wishlist_item")


def downgrade() -> None:
    raise NotImplementedError("scope cut — see Docs/plan_post_wave7.md P0")
