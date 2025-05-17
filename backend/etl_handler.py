# etl_handler.py
import pandas as pd
from io import BytesIO
from flask import send_file
from extractor import Extractor
from transformer import Transformer

extractor = Extractor()
transformer = Transformer()

def handle_etl_request(output_columns, sources):
    final_df = pd.DataFrame(columns=output_columns)

    for source in sources:
        url = source.get("url")
        related_columns = source.get("related_columns", [])
        column_names = source.get("column_names", [])

        df = extractor.fetch_data(url)
        if df is None:
            continue

        # Rename columns
        df = df[related_columns]
        df.columns = column_names

        # Transform
        df = transformer.clean_normalize_standardize(df)

        # Align to output schema
        aligned = {col: df[col] if col in df else None for col in output_columns}
        aligned_df = pd.DataFrame(aligned)

        final_df = pd.concat([final_df, aligned_df], ignore_index=True)

    # Write to Excel in memory
    output = BytesIO()
    final_df.to_excel(output, index=False)
    output.seek(0)

    return send_file(output, as_attachment=True, download_name="etl_output.xlsx", mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
