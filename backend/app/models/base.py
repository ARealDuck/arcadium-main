from sqlalchemy import CheckConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def str_enum(enum_cls):
    return SAEnum(
        enum_cls,
        native_enum=False,
        create_constraint=False,
        length=max(len(member.value) for member in enum_cls),
        values_callable=lambda e: [member.value for member in e]
    )

# Creates a constraint on a column in the database such that the values that the column can hold are ONLY those from a specific enum

def enum_check(column: str, enum_cls, name: str) -> CheckConstraint:
    allowed = ", ".join(f"'{member.value}'" for member in enum_cls)
    return CheckConstraint(f"{column} IN ({allowed})", name=name)