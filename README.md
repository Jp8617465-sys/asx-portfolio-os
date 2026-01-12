## Testing

Smoke test the running API:

```bash
pip install pytest requests
OS_API_KEY="YOUR_KEY" AS_OF="2025-12-31" BASE_URL="http://127.0.0.1:8790" pytest -q
```
