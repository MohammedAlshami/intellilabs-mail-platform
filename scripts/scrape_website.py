import os
import json
import sys
from dotenv import load_dotenv
from scrapegraphai.graphs import SmartScraperGraph

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

url = sys.argv[1]
output_path = sys.argv[2] if len(sys.argv) > 2 else None

api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    print(json.dumps({"error": "OPENROUTER_API_KEY not set"}))
    sys.exit(1)

graph_config = {
    "llm": {
        "api_key": api_key,
        "model": "openai/gpt-5-nano",
        "base_url": "https://openrouter.ai/api/v1",
        "temperature": 0.1,
    },
    "verbose": False,
    "headless": True,
}

prompt = """
Extract from this website and return ONLY valid JSON (no other text):

{
  "name": "Company name",
  "summary": "Short summary of what they do",
  "description": "Brief description",
  "services": ["service1", "service2"]
}

Use these exact keys. Value types must match exactly (string, string, string, array of strings).
"""

try:
    scraper = SmartScraperGraph(prompt=prompt, source=url, config=graph_config)
    result = scraper.run()

    if output_path:
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
