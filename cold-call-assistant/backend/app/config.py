from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Universal env lives at the project root (cold-call-assistant/.env); a local backend/.env
# still works and overrides it. Secrets never get committed (git-ignored).
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
LOCAL_ENV = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ROOT_ENV), str(LOCAL_ENV)), extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    allowed_origins: str = "http://localhost:3000"

    @property
    def origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
