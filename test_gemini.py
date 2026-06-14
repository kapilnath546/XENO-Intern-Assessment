import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY', '').strip('"').strip("'")
genai.configure(api_key=api_key)

print("=" * 60)
print("TEST 1: Simple request with low max_output_tokens")
print("=" * 60)

model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content(
    'Write a short greeting.',
    generation_config=genai.types.GenerationConfig(max_output_tokens=100, temperature=0.9)
)
print(f"Response: {response.text}")
print(f"Length: {len(response.text)} chars")
print(f"Finish reason: {response.candidates[0].finish_reason}")

print("\n" + "=" * 60)
print("TEST 2: Marketing message request with 500 tokens")
print("=" * 60)

response = model.generate_content(
    'Write a 3-4 sentence marketing message for high-value customers on WhatsApp. Include a special offer. Make it personalized, warm, and authentic. Start with a greeting.',
    generation_config=genai.types.GenerationConfig(max_output_tokens=500, temperature=0.9)
)
print(f"Response: {response.text}")
print(f"Length: {len(response.text)} chars")
print(f"Finish reason: {response.candidates[0].finish_reason}")

print("\n" + "=" * 60)
print("TEST 3: With explicit length instruction")
print("=" * 60)

response = model.generate_content(
    'Write a marketing message of at least 150 characters for high-value customers on WhatsApp. Include greeting, personalization, offer, and call-to-action. Be warm and authentic.',
    generation_config=genai.types.GenerationConfig(max_output_tokens=500, temperature=0.9)
)
print(f"Response: {response.text}")
print(f"Length: {len(response.text)} chars")
print(f"Finish reason: {response.candidates[0].finish_reason}")
