from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    db_path: Path
    billing_service_path: Path
    router_bin: str | None


def get_settings() -> Settings:
    here = Path(__file__).resolve()
    repo_root = here.parents[4]
    db_path = Path(os.getenv("TESSERA_DB_PATH", repo_root / "data" / "tessera.db"))
    billing = Path(
        os.getenv(
            "TESSERA_BILLING_SERVICE_PATH",
            repo_root / "examples" / "billing-service",
        )
    )
    router_bin = os.getenv("TESSERA_ROUTER_BIN") or None
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return Settings(db_path=db_path, billing_service_path=billing, router_bin=router_bin)
