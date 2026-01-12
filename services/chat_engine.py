"""
services/chat_engine.py
Lightweight assistant response generator using OpenAI.
"""

import os
from openai import OpenAI

_api_key = os.getenv("OPENAI_API_KEY")
_client = OpenAI(api_key=_api_key) if _api_key else None


def generate_response(query: str) -> str:
    if not _client:
        raise RuntimeError("OPENAI_API_KEY not set")

    context = (
        "You are the portfolio assistant for ASX Portfolio OS. "
        "Respond with concise, financially grounded reasoning and reference model signals "
        "and features when appropriate."
    )
    resp = _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": context},
            {"role": "user", "content": query},
        ],
        temperature=0.4,
    )
    return resp.choices[0].message["content"]
