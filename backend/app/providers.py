from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ProviderResult:
    provider: str
    external_id: str
    metadata: dict[str, Any]


class CRMProvider(ABC):
    @abstractmethod
    def export(self, records: list[dict[str, Any]]) -> ProviderResult: ...


class AnalysisProvider(ABC):
    @abstractmethod
    def analyze(self, redacted_text: str) -> dict[str, Any]: ...


class MockCRMProvider(CRMProvider):
    def export(self, records: list[dict[str, Any]]) -> ProviderResult:
        return ProviderResult("mock-crm", f"mock-{len(records)}", {"accepted": len(records)})


class MockAnalysisProvider(AnalysisProvider):
    def analyze(self, redacted_text: str) -> dict[str, Any]:
        return {"provider": "mock", "tokens_sent": 0, "summary": redacted_text[:120]}
