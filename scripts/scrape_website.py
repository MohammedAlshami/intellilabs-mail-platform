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
Visit the website and extract the following information:

1. Business/company name
2. What the business is about (a short summary)
3. A brief description of what they do
4. Services they provide (list as many as you can find)
5. All email addresses found on the site
6. All phone numbers found on the site

Return the result as a JSON object with these fields:
- name (string)
- summary (string) - what the business is about
- description (string) - brief description of what they do
- services (array of strings) - services they provide
- emails (array of strings) - email addresses found
- phones (array of strings) - phone numbers found
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
