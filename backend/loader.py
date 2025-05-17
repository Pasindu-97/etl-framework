import sqlite3
import pandas as pd
import logging

class Loader:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        logging.info(f"Loader initialized with database: {db_path}")

    def load_data(self, data: pd.DataFrame, table_name: str):
        """Load data into SQLite database."""
        try:
            data.to_sql(table_name, self.conn, if_exists='append', index=False)
            self.conn.commit()
            logging.info(f"Data loaded into {table_name} successfully.")
        except Exception as e:
            logging.error(f"Data loading failed: {e}")
            raise

    def close(self):
        """Close database connection."""
        self.conn.close()
        logging.info("Database connection closed.")