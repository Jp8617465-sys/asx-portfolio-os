"""
app/core/repository.py
Base repository class providing generic CRUD operations for database access.
"""

from typing import TypeVar, Generic, Optional, List, Dict, Any
from psycopg2.extras import RealDictCursor, execute_values

from app.core import db_context, logger


T = TypeVar('T')


class BaseRepository(Generic[T]):
    """
    Base repository with common CRUD operations.

    This class provides generic database access methods that can be inherited
    by feature-specific repositories. It uses raw SQL with psycopg2 (no ORM)
    and follows the repository pattern for clean separation of data access logic.

    Attributes:
        table_name: Name of the database table this repository manages

    Example:
        class SignalRepository(BaseRepository):
            def __init__(self):
                super().__init__('model_a_ml_signals')

            def get_live_signals(self, limit: int) -> List[Dict[str, Any]]:
                # Custom query method
                pass
    """

    def __init__(self, table_name: str):
        """
        Initialize repository with table name.

        Args:
            table_name: Name of the database table to operate on
        """
        self.table_name = table_name
        logger.debug(f"Initialized {self.__class__.__name__} for table '{table_name}'")

    def find_by_id(self, id: int) -> Optional[Dict[str, Any]]:
        """
        Find a single record by its primary key ID.

        Args:
            id: Primary key value to search for

        Returns:
            Dictionary with column names as keys, or None if not found

        Example:
            >>> repo = SignalRepository()
            >>> signal = repo.find_by_id(123)
            >>> print(signal['ticker'])
            'BHP.AX'
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)
                cur.execute(
                    f"SELECT * FROM {self.table_name} WHERE id = %s",
                    (id,)
                )
                result = cur.fetchone()
                if result:
                    logger.debug(f"Found record with id={id} in {self.table_name}")
                return result
        except Exception as e:
            logger.error(f"Error finding record by id={id} in {self.table_name}: {e}")
            raise

    def find_all(
        self,
        limit: int = 100,
        offset: int = 0,
        order_by: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve multiple records with pagination.

        Args:
            limit: Maximum number of records to return (default: 100)
            offset: Number of records to skip (default: 0)
            order_by: Optional ORDER BY clause (e.g., "created_at DESC")

        Returns:
            List of dictionaries, each representing a database row

        Example:
            >>> repo = SignalRepository()
            >>> signals = repo.find_all(limit=20, order_by="generated_at DESC")
            >>> len(signals)
            20
        """
        try:
            query = f"SELECT * FROM {self.table_name}"

            if order_by:
                query += f" ORDER BY {order_by}"

            query += " LIMIT %s OFFSET %s"

            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)
                cur.execute(query, (limit, offset))
                results = cur.fetchall()
                logger.debug(
                    f"Retrieved {len(results)} records from {self.table_name} "
                    f"(limit={limit}, offset={offset})"
                )
                return results
        except Exception as e:
            logger.error(f"Error retrieving records from {self.table_name}: {e}")
            raise

    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insert a single record and return its ID.

        Args:
            data: Dictionary with column names as keys and values to insert

        Returns:
            The primary key ID of the newly inserted record

        Raises:
            ValueError: If data is empty
            Exception: If database insert fails

        Example:
            >>> repo = SignalRepository()
            >>> new_id = repo.insert({
            ...     'ticker': 'BHP.AX',
            ...     'signal': 'BUY',
            ...     'confidence': 0.85
            ... })
            >>> print(new_id)
            456
        """
        if not data:
            raise ValueError("Cannot insert empty data")

        try:
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['%s'] * len(data))
            values = list(data.values())

            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"INSERT INTO {self.table_name} ({columns}) "
                    f"VALUES ({placeholders}) RETURNING id",
                    values
                )
                new_id = cur.fetchone()[0]
                logger.info(
                    f"Inserted record into {self.table_name} with id={new_id}"
                )
                return new_id
        except Exception as e:
            logger.error(f"Error inserting record into {self.table_name}: {e}")
            raise

    def bulk_insert(self, records: List[Dict[str, Any]]) -> None:
        """
        Insert multiple records efficiently using execute_values.

        This method is optimized for inserting large batches of records
        by using psycopg2's execute_values function, which is much faster
        than individual INSERTs.

        Args:
            records: List of dictionaries, each representing a record to insert.
                    All records must have the same keys (columns).

        Raises:
            ValueError: If records list is empty or records have inconsistent columns
            Exception: If database bulk insert fails

        Example:
            >>> repo = SignalRepository()
            >>> repo.bulk_insert([
            ...     {'ticker': 'BHP.AX', 'signal': 'BUY', 'confidence': 0.85},
            ...     {'ticker': 'CBA.AX', 'signal': 'SELL', 'confidence': 0.72}
            ... ])
        """
        if not records:
            logger.debug(f"No records to insert into {self.table_name}")
            return

        try:
            # Validate all records have the same columns
            first_keys = set(records[0].keys())
            for i, record in enumerate(records[1:], start=1):
                if set(record.keys()) != first_keys:
                    raise ValueError(
                        f"Record at index {i} has inconsistent columns. "
                        f"Expected {first_keys}, got {set(record.keys())}"
                    )

            columns = list(records[0].keys())
            values = [[rec[col] for col in columns] for rec in records]

            with db_context() as conn:
                cur = conn.cursor()
                execute_values(
                    cur,
                    f"INSERT INTO {self.table_name} ({', '.join(columns)}) VALUES %s",
                    values
                )
                logger.info(
                    f"Bulk inserted {len(records)} records into {self.table_name}"
                )
        except Exception as e:
            logger.error(
                f"Error bulk inserting {len(records)} records into {self.table_name}: {e}"
            )
            raise

    def update(self, id: int, data: Dict[str, Any]) -> bool:
        """
        Update a record by its primary key ID.

        Args:
            id: Primary key value of record to update
            data: Dictionary with column names as keys and new values

        Returns:
            True if a record was updated, False if no record found with given ID

        Raises:
            ValueError: If data is empty
            Exception: If database update fails

        Example:
            >>> repo = SignalRepository()
            >>> success = repo.update(123, {'confidence': 0.90, 'signal': 'STRONG_BUY'})
            >>> print(success)
            True
        """
        if not data:
            raise ValueError("Cannot update with empty data")

        try:
            set_clause = ', '.join([f"{col} = %s" for col in data.keys()])
            values = list(data.values()) + [id]

            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"UPDATE {self.table_name} SET {set_clause} WHERE id = %s",
                    values
                )
                updated = cur.rowcount > 0
                if updated:
                    logger.info(f"Updated record with id={id} in {self.table_name}")
                else:
                    logger.debug(f"No record found with id={id} in {self.table_name}")
                return updated
        except Exception as e:
            logger.error(f"Error updating record with id={id} in {self.table_name}: {e}")
            raise

    def delete(self, id: int) -> bool:
        """
        Delete a record by its primary key ID.

        Args:
            id: Primary key value of record to delete

        Returns:
            True if a record was deleted, False if no record found with given ID

        Example:
            >>> repo = SignalRepository()
            >>> deleted = repo.delete(123)
            >>> print(deleted)
            True
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"DELETE FROM {self.table_name} WHERE id = %s",
                    (id,)
                )
                deleted = cur.rowcount > 0
                if deleted:
                    logger.info(f"Deleted record with id={id} from {self.table_name}")
                else:
                    logger.debug(f"No record found with id={id} in {self.table_name}")
                return deleted
        except Exception as e:
            logger.error(f"Error deleting record with id={id} from {self.table_name}: {e}")
            raise

    def count(self, where_clause: Optional[str] = None, params: Optional[tuple] = None) -> int:
        """
        Count records in the table, optionally with a WHERE clause.

        Args:
            where_clause: Optional SQL WHERE clause (without "WHERE" keyword)
            params: Optional tuple of parameters for the WHERE clause

        Returns:
            Number of records matching the criteria

        Example:
            >>> repo = SignalRepository()
            >>> buy_signals = repo.count("signal = %s", ('BUY',))
            >>> print(buy_signals)
            45
        """
        try:
            query = f"SELECT COUNT(*) FROM {self.table_name}"

            if where_clause:
                query += f" WHERE {where_clause}"

            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(query, params or ())
                count = cur.fetchone()[0]
                logger.debug(f"Count query on {self.table_name}: {count} records")
                return count
        except Exception as e:
            logger.error(f"Error counting records in {self.table_name}: {e}")
            raise

    def exists(self, id: int) -> bool:
        """
        Check if a record exists by its primary key ID.

        Args:
            id: Primary key value to check

        Returns:
            True if record exists, False otherwise

        Example:
            >>> repo = SignalRepository()
            >>> exists = repo.exists(123)
            >>> print(exists)
            True
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT 1 FROM {self.table_name} WHERE id = %s LIMIT 1",
                    (id,)
                )
                exists = cur.fetchone() is not None
                logger.debug(f"Record with id={id} {'exists' if exists else 'does not exist'} in {self.table_name}")
                return exists
        except Exception as e:
            logger.error(f"Error checking existence of id={id} in {self.table_name}: {e}")
            raise
