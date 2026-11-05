"""A scripted LLM for offline session tests.

It replays a fixed list of replies, one per LLM request: a string is spoken
text, a ``ToolCall`` is a function call. The real AgentSession runs the real
tools, so these tests prove the SDK wiring (history, run context, guards)
without LiveKit Inference.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from livekit.agents import NOT_GIVEN, APIConnectOptions, NotGivenOr, llm
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS


@dataclass
class ToolCall:
    name: str
    arguments: dict[str, Any] = field(default_factory=dict)


Step = str | ToolCall | list[ToolCall]


class ScriptedLLM(llm.LLM):
    def __init__(self, steps: list[Step]) -> None:
        super().__init__()
        self._steps = list(steps)
        self.requests: list[llm.ChatContext] = []
        self._calls = 0

    @property
    def remaining(self) -> int:
        return len(self._steps)

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool] | None = None,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
        parallel_tool_calls: NotGivenOr[bool] = NOT_GIVEN,
        tool_choice: NotGivenOr[llm.ToolChoice] = NOT_GIVEN,
        extra_kwargs: NotGivenOr[dict[str, Any]] = NOT_GIVEN,
    ) -> llm.LLMStream:
        self.requests.append(chat_ctx.copy())
        step: Step = self._steps.pop(0) if self._steps else "(script exhausted)"
        self._calls += 1
        return _ScriptedStream(
            self,
            step=step,
            index=self._calls,
            chat_ctx=chat_ctx,
            tools=tools or [],
            conn_options=conn_options,
        )


class _ScriptedStream(llm.LLMStream):
    def __init__(self, scripted: ScriptedLLM, *, step: Step, index: int, **kwargs):
        super().__init__(scripted, **kwargs)
        self._step = step
        self._index = index

    async def _run(self) -> None:
        step = self._step
        if isinstance(step, str):
            delta = llm.ChoiceDelta(role="assistant", content=step)
        else:
            calls = step if isinstance(step, list) else [step]
            delta = llm.ChoiceDelta(
                role="assistant",
                tool_calls=[
                    llm.FunctionToolCall(
                        name=call.name,
                        arguments=json.dumps(call.arguments),
                        call_id=f"call-{self._index}-{i}",
                    )
                    for i, call in enumerate(calls)
                ],
            )
        self._event_ch.send_nowait(
            llm.ChatChunk(id=f"chunk-{self._index}", delta=delta)
        )
