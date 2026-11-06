from pydantic import BaseModel, Field
from typing import Literal, Optional


class TradingSignal(BaseModel):

    secret: str

    signal_id: str = Field(min_length=1, max_length=100)

    strategy: str

    action: Literal["BUY", "SELL"]

    symbol: str

    lot: Optional[float] = Field(default=None, gt=0)

    sl: Optional[float] = None

    tp: Optional[float] = None