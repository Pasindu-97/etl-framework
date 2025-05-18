# etl_handler.py
import pandas as pd
from io import BytesIO
from flask import send_file, jsonify
from extractor import Extractor
from transformer import Transformer
import logging

extractor = Extractor()
transformer = Transformer()

def handle_etl_request(output_columns, sources):
    final_df = pd.DataFrame(columns=output_columns)

    for source in sources:
        url = source.get("url")
        related_columns = source.get("related_columns", [])
        column_names = source.get("column_names", [])

        df = extractor.fetch_data(url)
        if df is None or df.empty:
            logging.warning(f"Skipped empty or failed fetch for {url}")
            continue

        try:
            # Subset and rename columns
            df = df[related_columns]
            df.columns = column_names

            df = transformer.clean_normalize_standardize(df)

            aligned = {col: df[col] if col in df else pd.Series(["N/A"] * len(df)) for col in output_columns}
            aligned_df = pd.DataFrame(aligned)

            # Skip if nothing usable in aligned_df
            if aligned_df.empty or aligned_df.dropna(how='all').empty:
                logging.warning(f"Skipping aligned data from {url} — empty after alignment.")
                continue

            final_df = pd.concat([final_df, aligned_df], ignore_index=True)
        except Exception as e:
            logging.error(f"Error processing {url}: {e}")
            continue

    # Final check before output
    if final_df.empty or final_df.dropna(how='all').empty:
        logging.error("Final output is empty after processing all sources.")
        return jsonify({"error": "No valid data to export."}), 400

    final_df.fillna("N/A", inplace=True)

    output = BytesIO()
    final_df.to_excel(output, index=False)
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="etl_output.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
