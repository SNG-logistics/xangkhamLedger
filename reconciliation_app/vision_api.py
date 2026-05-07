import os
import base64
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def encode_image(image_path):
    """Encodes image to base64 string"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_ledger_data_from_image(image_path):
    """
    Calls CometAPI Vision Model to extract expenses and promotion summary from the image.
    Returns a structured dictionary of the extracted data.
    """
    api_key = os.getenv("COMET_API_KEY")
    base_url = os.getenv("COMET_API_BASE", "https://api.cometapi.com/v1")
    model = os.getenv("AI_VISION_MODEL", "gemini-3-flash")
    
    if not api_key:
        raise ValueError("COMET_API_KEY is not set in environment.")

    base64_image = encode_image(image_path)
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    prompt = """
    You are an expert financial accountant. Please analyze this ledger/account summary image.
    Extract all expense categories and their corresponding amounts in LAK. Pay close attention to Thai/Lao text and any negative values or deductions.
    Also, identify if there is a 'Promotion' summary or category.
    
    Return the response ONLY as a valid JSON object with the following structure:
    {
      "date": "YYYY-MM-DD", // Extract the date of the summary if visible, else null
      "items": [
        {"category": "Name of expense", "amount_lak": 100000}
      ],
      "promotions": {
        "total_promotions_lak": 50000,
        "details": "Optional text describing promotion items"
      }
    }
    
    Do not include any markdown formatting (like ```json), just the raw JSON text.
    """
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 2048,
        "temperature": 0.1
    }
    
    try:
        response = requests.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        # Clean up potential markdown formatting if the model disobeys instructions
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        data = json.loads(content.strip())
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"API Request failed: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON response: {e}")
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None
