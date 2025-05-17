import pandas as pd
import re
from typing import Optional, List
import logging
import numpy as np

class Transformer:
    def __init__(self, config: dict = None):
        self.config = config or {}
        logging.info("Transformer initialized.")

    def validate_data(self, data: pd.DataFrame) -> bool:
        """Validate DataFrame for integrity and quality."""
        try:
            # Check for duplicate rows
            if data.duplicated().any():
                logging.warning(f"Found {data.duplicated().sum()} duplicate rows. Removing duplicates.")
                data.drop_duplicates(inplace=True)

            # Check required columns
            required_columns = self.config.get("required_columns", [])
            missing_cols = [col for col in required_columns if col not in data.columns]
            if missing_cols:
                logging.error(f"Missing required columns: {missing_cols}")
                return False

            # Check for entirely NaN columns
            nan_cols = data.columns[data.isna().all()].tolist()
            if nan_cols:
                logging.warning(f"Columns with all NaN values: {nan_cols}")

            # Validate data types
            for col, dtype in self.config.get("expected_dtypes", {}).items():
                if col in data.columns:
                    if dtype == "integer":
                        try:
                            data[col] = pd.to_numeric(data[col], errors="coerce").astype("Int64")
                        except Exception as e:
                            logging.warning(f"Cannot convert {col} to integer: {e}")
                    elif dtype == "numeric":
                        if not pd.api.types.is_numeric_dtype(data[col]):
                            logging.warning(f"Column {col} is not numeric.")

            # Check string columns for invalid values
            for col in data.select_dtypes(include=["object"]):
                invalid = data[col].apply(lambda x: isinstance(x, str) and (not x.strip() or bool(re.search(r'[^\w\s]', x))))
                if invalid.any():
                    logging.warning(f"Invalid strings in {col}: {data[col][invalid].head().tolist()}")

            # Outlier detection for numeric columns
            for col in data.select_dtypes(include=["number"]):
                if col not in self.config.get("exclude_scaling", []):
                    z_scores = np.abs((data[col] - data[col].mean()) / data[col].std())
                    outliers = z_scores > self.config.get("outlier_threshold", 3)
                    if outliers.any():
                        logging.warning(f"Outliers detected in {col}: {data[col][outliers].head().tolist()}")
                        data.loc[outliers, col] = np.nan

            logging.info("Data validation completed.")
            return True
        except Exception as e:
            logging.error(f"Validation failed: {e}")
            return False

    def clean_normalize_standardize(self, data: pd.DataFrame, 
                                  columns_to_normalize: Optional[List[str]] = None) -> pd.DataFrame:
        """Clean, normalize, and standardize data with enhanced transformations."""
        try:
            # Create a copy to avoid SettingWithCopyWarning
            data = data.copy()

            # Validate data
            if not self.validate_data(data):
                logging.error("Data validation failed. Returning original data.")
                return data

            # Apply custom transformations from config
            for col, rules in self.config.get("transformations", {}).items():
                if col in data.columns:
                    if rules.get("to_numeric"):
                        data.loc[:, col] = pd.to_numeric(data[col], errors="coerce")
                    if rules.get("normalize_case"):
                        data.loc[:, col] = data[col].str.lower()
                    if rules.get("remove_special_chars"):
                        data.loc[:, col] = data[col].apply(lambda x: re.sub(r'[^\w\s]', '', str(x)) if isinstance(x, str) else x)
                    if rules.get("trim_whitespace"):
                        data.loc[:, col] = data[col].str.strip()
                    if rules.get("regex_clean"):
                        pattern = rules["regex_clean"]
                        data.loc[:, col] = data[col].apply(lambda x: re.sub(pattern, '', str(x)) if isinstance(x, str) else x)
                    if rules.get("categorical_map"):
                        data.loc[:, col] = data[col].map(rules["categorical_map"]).fillna(data[col])

            # Normalize Year to integer
            if "Year" in data.columns:
                data.loc[:, "Year"] = pd.to_numeric(data["Year"], errors="coerce").round().astype("Int64")
                fill_value = self.config.get("fill_values", {}).get("Year", pd.NA)
                if fill_value is not None:
                    data.loc[:, "Year"] = data["Year"].fillna(fill_value)
                else:
                    logging.info("No fill value specified for Year; keeping as is.")

            # Clean Population to positive integer
            if "Population" in data.columns:
                data.loc[:, "Population"] = pd.to_numeric(data["Population"], errors="coerce")
                data.loc[:, "Population"] = data["Population"].apply(lambda x: max(0, round(x)) if pd.notnull(x) else x)
                data.loc[:, "Population"] = data["Population"].astype("Int64")
                fill_value = self.config.get("fill_values", {}).get("Population", pd.NA)
                if fill_value is not None:
                    data.loc[:, "Population"] = data["Population"].fillna(fill_value)
                else:
                    logging.info("No fill value specified for Population; keeping as is.")

            # Fill missing values for other columns
            fill_value = self.config.get("fill_value", "N/A")
            data = data.fillna(fill_value)

            # Exclude specified columns from scaling
            exclude_scaling = self.config.get("exclude_scaling", [])

            # Normalize specified columns (if not excluded)
            if columns_to_normalize:
                for col in columns_to_normalize:
                    if col in data.columns and pd.api.types.is_numeric_dtype(data[col]) and col not in exclude_scaling:
                        min_val, max_val = data[col].min(), data[col].max()
                        if min_val != max_val:
                            data.loc[:, col] = (data[col] - min_val) / (max_val - min_val)

            # Standardize numeric columns (if not excluded)
            for col in data.select_dtypes(include=["number"]):
                if col not in exclude_scaling:
                    mean, std = data[col].mean(), data[col].std()
                    if std != 0:
                        data.loc[:, col] = (data[col] - mean) / std

            logging.info("Data transformation completed.")
            return data
        except Exception as e:
            logging.error(f"Transformation failed: {e}")
            raise