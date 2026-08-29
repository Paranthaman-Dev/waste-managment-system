"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role = sa.Enum("USER", "COLLECTOR", "RECYCLER", "MANAGEMENT", name="userrole")
pickup_status = sa.Enum("PENDING", "ASSIGNED", "EN_ROUTE", "COLLECTED", "DECLINED", "CANCELLED", name="pickupstatus")
batch_status = sa.Enum("AVAILABLE", "REQUESTED", "ACCEPTED", "PROCESSING", "COMPLETED", name="batchstatus")


def upgrade() -> None:
    user_role.create(op.get_bind(), checkfirst=True)
    pickup_status.create(op.get_bind(), checkfirst=True)
    batch_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "collectors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("service_area", sa.String(length=100), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False),
    )

    op.create_table(
        "recyclers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("accepted_waste_types", sa.JSON(), nullable=True),
        sa.Column("capacity_kg", sa.Float(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=False),
    )

    op.create_table(
        "pickup_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("collector_id", sa.Integer(), sa.ForeignKey("collectors.id"), nullable=True),
        sa.Column("waste_type", sa.String(length=50), nullable=False),
        sa.Column("quantity_kg", sa.Float(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("preferred_time", sa.DateTime(), nullable=True),
        sa.Column("status", pickup_status, nullable=False),
        sa.Column("requested_at", sa.DateTime(), nullable=False),
        sa.Column("collected_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_pickup_requests_user_id", "pickup_requests", ["user_id"])
    op.create_index("ix_pickup_requests_collector_id", "pickup_requests", ["collector_id"])
    op.create_index("ix_pickup_requests_waste_type", "pickup_requests", ["waste_type"])
    op.create_index("ix_pickup_requests_status", "pickup_requests", ["status"])

    op.create_table(
        "waste_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pickup_request_id", sa.Integer(), sa.ForeignKey("pickup_requests.id"), nullable=False, unique=True),
        sa.Column("recycler_id", sa.Integer(), sa.ForeignKey("recyclers.id"), nullable=True),
        sa.Column("status", batch_status, nullable=False),
        sa.Column("handed_over_at", sa.DateTime(), nullable=True),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("proof_url", sa.String(length=500), nullable=True),
    )
    op.create_index("ix_waste_batches_recycler_id", "waste_batches", ["recycler_id"])
    op.create_index("ix_waste_batches_status", "waste_batches", ["status"])

    op.create_table(
        "public_bins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("accepted_waste_types", sa.JSON(), nullable=True),
        sa.Column("capacity_kg", sa.Float(), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_public_bins_latitude", "public_bins", ["latitude"])
    op.create_index("ix_public_bins_longitude", "public_bins", ["longitude"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"])

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("generated_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("report_type", sa.String(length=50), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_public_bins_longitude", table_name="public_bins")
    op.drop_index("ix_public_bins_latitude", table_name="public_bins")
    op.drop_table("public_bins")
    op.drop_index("ix_waste_batches_status", table_name="waste_batches")
    op.drop_index("ix_waste_batches_recycler_id", table_name="waste_batches")
    op.drop_table("waste_batches")
    op.drop_index("ix_pickup_requests_status", table_name="pickup_requests")
    op.drop_index("ix_pickup_requests_waste_type", table_name="pickup_requests")
    op.drop_index("ix_pickup_requests_collector_id", table_name="pickup_requests")
    op.drop_index("ix_pickup_requests_user_id", table_name="pickup_requests")
    op.drop_table("pickup_requests")
    op.drop_table("recyclers")
    op.drop_table("collectors")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
    batch_status.drop(op.get_bind(), checkfirst=True)
    pickup_status.drop(op.get_bind(), checkfirst=True)
    user_role.drop(op.get_bind(), checkfirst=True)
