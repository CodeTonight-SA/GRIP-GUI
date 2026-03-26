# Python Async Safety

In async code (`async def`, `await`):
- `subprocess.run()` -> `asyncio.create_subprocess_exec()` (blocks event loop)
- `time.sleep()` -> `await asyncio.sleep()`
- `requests.get()` -> `aiohttp` or `httpx`
- Always `asyncio.wait_for()` for timeout control
- Handle `ConnectionClosed` on WebSocket sends
