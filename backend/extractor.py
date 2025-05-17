import pandas as pd
import requests
import pdfplumber
import openpyxl
from io import BytesIO
import logging
from typing import Optional

class Extractor:
    def __init__(self):
        logging.info("Extractor initialized.")

    def fetch_data(self, url: str) -> Optional[pd.DataFrame]:
        """Fetch data from a URL in various formats."""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            if url.endswith('.csv'):
                return pd.read_csv(BytesIO(response.content))
            elif url.endswith('.json'):
                return pd.json_normalize(response.json())
            elif url.endswith('.xlsx') or url.endswith('.xls'):
                return pd.read_excel(BytesIO(response.content))
            elif url.endswith('.pdf'):
                with pdfplumber.open(BytesIO(response.content)) as pdf:
                    text = ""
                    tables = []
                    for page in pdf.pages:
                        text += page.extract_text() or ""
                        page_tables = page.extract_tables()
                        if page_tables:
                            tables.extend(page_tables)
                    if tables:
                        # Convert first table to DataFrame (simplified)
                        df = pd.DataFrame(tables[0][1:], columns=tables[0][0])
                        logging.info(f"Extracted table from PDF at {url}")
                        return df
                    else:
                        logging.info(f"Extracted text from PDF at {url}. No tables found.")
                        return pd.DataFrame([{"Content": text}])
            else:
                logging.warning(f"Unsupported format for URL: {url}")
                return None
        except Exception as e:
            logging.error(f"Failed to fetch data from {url}: {e}")
            return None