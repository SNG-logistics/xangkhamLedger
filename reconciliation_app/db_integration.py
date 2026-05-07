import mysql.connector
from mysql.connector import Error
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Establish a connection to the local MySQL database."""
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "changkhum_ledger"),
            port=os.getenv("DB_PORT", 3306)
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
    return None

def fetch_expenses_for_date(target_date):
    """
    Fetch system expenses for a specific date from the 'expenses' table.
    Groups by category and sums the amount_lak.
    target_date should be a string in 'YYYY-MM-DD' format.
    """
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        # Fetching expenses where the DATE of occurred_at matches target_date
        # Excluding deleted records
        query = """
        SELECT 
            category, 
            SUM(amount_lak) as total_amount_lak
        FROM expenses
        WHERE DATE(occurred_at) = %s AND is_deleted = FALSE
        GROUP BY category
        """
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, (target_date,))
        records = cursor.fetchall()
        
        df = pd.DataFrame(records)
        return df
        
    except Error as e:
        print(f"Error fetching data: {e}")
        return None
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def get_system_summary(target_date):
    """
    Returns a dictionary mapping category to total amount_lak.
    """
    df = fetch_expenses_for_date(target_date)
    if df is None or df.empty:
        return {}
    
    # Convert to dict {category: total_amount_lak}
    # Handling potential Decimal types from MySQL
    return {row['category']: float(row['total_amount_lak']) for _, row in df.iterrows()}
