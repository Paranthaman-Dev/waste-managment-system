"""rewards & vouchers

Revision ID: 0002_rewards
Revises: 0001_initial_schema
Create Date: 2026-08-30
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0002_rewards"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

redemption_status = sa.Enum("PENDING", "ISSUED", "CANCELLED", name="redemptionstatus")


def upgrade() -> None:
    op.create_table(
        "reward_ledger",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("pickup_id", sa.Integer(), sa.ForeignKey("pickup_requests.id"), nullable=True, unique=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("waste_batches.id"), nullable=True),
        sa.Column("waste_type", sa.String(length=50), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_reward_ledger_user_id", "reward_ledger", ["user_id"])
    op.create_index("ix_reward_ledger_pickup_id", "reward_ledger", ["pickup_id"], unique=True)
    op.create_index("ix_reward_ledger_batch_id", "reward_ledger", ["batch_id"])

    op.create_table(
        "reward_balances",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("balance", sa.Integer(), nullable=False),
        sa.Column("lifetime_earned", sa.Integer(), nullable=False),
    )

    op.create_table(
        "vouchers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("cost_points", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("valid_until", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "redemptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("voucher_id", sa.Integer(), sa.ForeignKey("vouchers.id"), nullable=False),
        sa.Column("points_spent", sa.Integer(), nullable=False),
        sa.Column("status", redemption_status, nullable=False),
        sa.Column("redeemed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_redemptions_user_id", "redemptions", ["user_id"])
    op.create_index("ix_redemptions_voucher_id", "redemptions", ["voucher_id"])


def downgrade() -> None:
    op.drop_index("ix_redemptions_voucher_id", table_name="redemptions")
    op.drop_index("ix_redemptions_user_id", table_name="redemptions")
    op.drop_table("redemptions")
    op.drop_table("vouchers")
    op.drop_table("reward_balances")
    op.drop_index("ix_reward_ledger_batch_id", table_name="reward_ledger")
    op.drop_index("ix_reward_ledger_pickup_id", table_name="reward_ledger")
    op.drop_index("ix_reward_ledger_user_id", table_name="reward_ledger")
    op.drop_table("reward_ledger")
    redemption_status.drop(op.get_bind(), checkfirst=True)
