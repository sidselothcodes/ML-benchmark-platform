"""Dynamic batching engine for collecting and batching inference requests."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class BatchRequest:
    """A single pending inference request in the batch queue."""
    text: str
    max_new_tokens: int
    future: asyncio.Future
    submitted_at: float = field(default_factory=time.perf_counter)


class DynamicBatcher:
    """Collects individual requests and batches them for efficient inference.

    Flushes when either the batch reaches max_batch_size or max_wait_time_ms
    has elapsed since the first request in the current batch.
    """

    def __init__(
        self,
        server,
        max_batch_size: int = 8,
        max_wait_time_ms: float = 50.0,
    ):
        self.server = server
        self.max_batch_size = max_batch_size
        self.max_wait_time_ms = max_wait_time_ms
        self._queue: asyncio.Queue[BatchRequest] = asyncio.Queue()
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the batch processing loop."""
        self._running = True
        self._task = asyncio.create_task(self._process_loop())
        logger.info(
            "Dynamic batcher started: max_batch=%d, max_wait=%.1fms",
            self.max_batch_size, self.max_wait_time_ms,
        )

    async def stop(self) -> None:
        """Stop the batch processing loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def submit(self, text: str, max_new_tokens: int = 50) -> dict:
        """Submit a request and wait for the batched result."""
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        request = BatchRequest(text=text, max_new_tokens=max_new_tokens, future=future)
        await self._queue.put(request)
        return await future

    async def _process_loop(self) -> None:
        """Main loop: collect requests into batches and process them."""
        while self._running:
            batch: list[BatchRequest] = []

            try:
                # Wait for the first request
                first = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                batch.append(first)
            except asyncio.TimeoutError:
                continue

            # Collect more requests until batch is full or timeout
            deadline = time.perf_counter() + self.max_wait_time_ms / 1000.0
            while len(batch) < self.max_batch_size:
                remaining = deadline - time.perf_counter()
                if remaining <= 0:
                    break
                try:
                    req = await asyncio.wait_for(self._queue.get(), timeout=remaining)
                    batch.append(req)
                except asyncio.TimeoutError:
                    break

            # Process the batch
            await self._process_batch(batch)

    async def _process_batch(self, batch: list[BatchRequest]) -> None:
        """Process a batch of requests by running inference on each.

        For true batch inference, the model server would need a batch predict
        method. Here we run individual predictions but measure the batching
        overhead to demonstrate the batching infrastructure.
        """
        logger.debug("Processing batch of %d requests", len(batch))

        for req in batch:
            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda t=req.text, n=req.max_new_tokens: self.server.predict(t, n),
                )
                req.future.set_result({
                    "output": result.output,
                    "latency_ms": result.latency_ms,
                    "tokens_per_sec": result.tokens_per_sec,
                    "memory_mb": result.memory_mb,
                    "tokens_generated": result.tokens_generated,
                    "batch_size": len(batch),
                })
            except Exception as e:
                if not req.future.done():
                    req.future.set_exception(e)
