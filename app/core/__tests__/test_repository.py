"""
app/core/__tests__/test_repository.py
Comprehensive unit tests for BaseRepository following TDD best practices.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, call
from typing import Dict, Any, List

from app.core.repository import BaseRepository


class TestRepository(BaseRepository):
    """Concrete implementation of BaseRepository for testing."""
    def __init__(self):
        super().__init__('test_table')


@pytest.fixture
def mock_db_context():
    """Mock database context manager."""
    with patch('app.core.repository.db_context') as mock_ctx:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Setup context manager
        mock_ctx.return_value.__enter__.return_value = mock_conn
        mock_ctx.return_value.__exit__.return_value = None

        # Setup cursor
        mock_conn.cursor.return_value = mock_cursor

        yield {
            'context': mock_ctx,
            'conn': mock_conn,
            'cursor': mock_cursor
        }


@pytest.fixture
def mock_logger():
    """Mock logger."""
    with patch('app.core.repository.logger') as mock_log:
        yield mock_log


@pytest.fixture
def repository():
    """Create a test repository instance."""
    return TestRepository()


class TestBaseRepositoryInit:
    """Test BaseRepository initialization."""

    def test_init_sets_table_name(self, mock_logger):
        """Test that init sets the table name correctly."""
        repo = TestRepository()
        assert repo.table_name == 'test_table'

    def test_init_logs_initialization(self, mock_logger):
        """Test that init logs the initialization."""
        repo = TestRepository()
        mock_logger.debug.assert_called_once()
        assert 'TestRepository' in str(mock_logger.debug.call_args)
        assert 'test_table' in str(mock_logger.debug.call_args)


class TestFindById:
    """Test find_by_id method."""

    def test_find_by_id_success(self, repository, mock_db_context, mock_logger):
        """Test finding a record by ID successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        expected_result = {'id': 1, 'name': 'test', 'value': 100}
        mock_cursor.fetchone.return_value = expected_result

        # Execute
        result = repository.find_by_id(1)

        # Verify
        assert result == expected_result
        mock_cursor.execute.assert_called_once()

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'SELECT * FROM test_table WHERE id = %s' in call_args[0][0]
        assert call_args[0][1] == (1,)

        # Verify logging
        mock_logger.debug.assert_called()

    def test_find_by_id_not_found(self, repository, mock_db_context, mock_logger):
        """Test finding a record that doesn't exist."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = None

        # Execute
        result = repository.find_by_id(999)

        # Verify
        assert result is None
        mock_cursor.execute.assert_called_once()
        assert mock_cursor.execute.call_args[0][1] == (999,)

    def test_find_by_id_error_handling(self, repository, mock_db_context, mock_logger):
        """Test error handling when database fails."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Database connection failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.find_by_id(1)

        assert "Database connection failed" in str(exc_info.value)
        mock_logger.error.assert_called_once()


class TestFindAll:
    """Test find_all method."""

    def test_find_all_default_params(self, repository, mock_db_context, mock_logger):
        """Test finding all records with default parameters."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        expected_results = [
            {'id': 1, 'name': 'test1'},
            {'id': 2, 'name': 'test2'},
        ]
        mock_cursor.fetchall.return_value = expected_results

        # Execute
        results = repository.find_all()

        # Verify
        assert results == expected_results
        mock_cursor.execute.assert_called_once()

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'SELECT * FROM test_table' in call_args[0][0]
        assert 'LIMIT %s OFFSET %s' in call_args[0][0]
        assert call_args[0][1] == (100, 0)  # Default limit and offset

    def test_find_all_with_pagination(self, repository, mock_db_context, mock_logger):
        """Test finding all records with pagination."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        expected_results = [{'id': 11, 'name': 'test11'}]
        mock_cursor.fetchall.return_value = expected_results

        # Execute
        results = repository.find_all(limit=10, offset=10)

        # Verify
        assert results == expected_results
        call_args = mock_cursor.execute.call_args
        assert call_args[0][1] == (10, 10)

    def test_find_all_with_order_by(self, repository, mock_db_context, mock_logger):
        """Test finding all records with ordering."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        repository.find_all(order_by="created_at DESC")

        # Verify SQL query includes ORDER BY
        call_args = mock_cursor.execute.call_args
        assert 'ORDER BY created_at DESC' in call_args[0][0]

    def test_find_all_empty_result(self, repository, mock_db_context, mock_logger):
        """Test finding all when no records exist."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        results = repository.find_all()

        # Verify
        assert results == []
        assert len(results) == 0

    def test_find_all_error_handling(self, repository, mock_db_context, mock_logger):
        """Test error handling in find_all."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Query failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.find_all()

        assert "Query failed" in str(exc_info.value)
        mock_logger.error.assert_called_once()


class TestInsert:
    """Test insert method."""

    def test_insert_success(self, repository, mock_db_context, mock_logger):
        """Test inserting a record successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = [123]
        data = {'name': 'test', 'value': 100}

        # Execute
        new_id = repository.insert(data)

        # Verify
        assert new_id == 123
        mock_cursor.execute.assert_called_once()

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'INSERT INTO test_table' in call_args[0][0]
        assert 'name, value' in call_args[0][0] or 'value, name' in call_args[0][0]
        assert 'RETURNING id' in call_args[0][0]
        assert call_args[0][1] == list(data.values())

        # Verify logging
        mock_logger.info.assert_called_once()

    def test_insert_error_empty_data(self, repository, mock_db_context, mock_logger):
        """Test inserting empty data raises ValueError."""
        # Execute & Verify
        with pytest.raises(ValueError) as exc_info:
            repository.insert({})

        assert "Cannot insert empty data" in str(exc_info.value)

    def test_insert_error_database_failure(self, repository, mock_db_context, mock_logger):
        """Test error handling when insert fails."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Insert failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.insert({'name': 'test'})

        assert "Insert failed" in str(exc_info.value)
        mock_logger.error.assert_called_once()


class TestBulkInsert:
    """Test bulk_insert method."""

    def test_bulk_insert_success(self, repository, mock_db_context, mock_logger):
        """Test bulk inserting records successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        records = [
            {'name': 'test1', 'value': 100},
            {'name': 'test2', 'value': 200},
        ]

        # Execute
        with patch('app.core.repository.execute_values') as mock_execute_values:
            repository.bulk_insert(records)

            # Verify
            mock_execute_values.assert_called_once()
            call_args = mock_execute_values.call_args
            assert mock_cursor == call_args[0][0]
            assert 'INSERT INTO test_table' in call_args[0][1]

            # Verify values match records
            values = call_args[0][2]
            assert len(values) == 2

        mock_logger.info.assert_called_once()

    def test_bulk_insert_empty_list(self, repository, mock_db_context, mock_logger):
        """Test bulk inserting empty list does nothing."""
        # Execute
        repository.bulk_insert([])

        # Verify
        mock_logger.debug.assert_called()
        assert 'No records to insert' in str(mock_logger.debug.call_args)

    def test_bulk_insert_inconsistent_columns(self, repository, mock_db_context, mock_logger):
        """Test bulk inserting with inconsistent columns raises ValueError."""
        # Setup
        records = [
            {'name': 'test1', 'value': 100},
            {'name': 'test2', 'different_key': 200},  # Inconsistent columns
        ]

        # Execute & Verify
        with pytest.raises(ValueError) as exc_info:
            repository.bulk_insert(records)

        assert "inconsistent columns" in str(exc_info.value).lower()

    def test_bulk_insert_error_handling(self, repository, mock_db_context, mock_logger):
        """Test error handling in bulk insert."""
        # Setup
        records = [{'name': 'test1'}]

        # Execute & Verify
        with patch('app.core.repository.execute_values') as mock_execute_values:
            mock_execute_values.side_effect = Exception("Bulk insert failed")

            with pytest.raises(Exception) as exc_info:
                repository.bulk_insert(records)

            assert "Bulk insert failed" in str(exc_info.value)
            mock_logger.error.assert_called_once()


class TestUpdate:
    """Test update method."""

    def test_update_success(self, repository, mock_db_context, mock_logger):
        """Test updating a record successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.rowcount = 1
        data = {'name': 'updated', 'value': 999}

        # Execute
        result = repository.update(1, data)

        # Verify
        assert result is True
        mock_cursor.execute.assert_called_once()

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'UPDATE test_table SET' in call_args[0][0]
        assert 'WHERE id = %s' in call_args[0][0]
        # Values should include data values plus id
        assert call_args[0][1] == list(data.values()) + [1]

        mock_logger.info.assert_called_once()

    def test_update_not_found(self, repository, mock_db_context, mock_logger):
        """Test updating a record that doesn't exist."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.rowcount = 0

        # Execute
        result = repository.update(999, {'name': 'test'})

        # Verify
        assert result is False
        mock_logger.debug.assert_called()

    def test_update_error_empty_data(self, repository, mock_db_context, mock_logger):
        """Test updating with empty data raises ValueError."""
        # Execute & Verify
        with pytest.raises(ValueError) as exc_info:
            repository.update(1, {})

        assert "Cannot update with empty data" in str(exc_info.value)

    def test_update_error_handling(self, repository, mock_db_context, mock_logger):
        """Test error handling in update."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Update failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.update(1, {'name': 'test'})

        assert "Update failed" in str(exc_info.value)
        mock_logger.error.assert_called_once()


class TestDelete:
    """Test delete method."""

    def test_delete_success(self, repository, mock_db_context, mock_logger):
        """Test deleting a record successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.rowcount = 1

        # Execute
        result = repository.delete(1)

        # Verify
        assert result is True
        mock_cursor.execute.assert_called_once()

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'DELETE FROM test_table WHERE id = %s' in call_args[0][0]
        assert call_args[0][1] == (1,)

        mock_logger.info.assert_called_once()

    def test_delete_not_found(self, repository, mock_db_context, mock_logger):
        """Test deleting a record that doesn't exist."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.rowcount = 0

        # Execute
        result = repository.delete(999)

        # Verify
        assert result is False
        mock_logger.debug.assert_called()

    def test_delete_error_handling(self, repository, mock_db_context, mock_logger):
        """Test error handling in delete."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Delete failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.delete(1)

        assert "Delete failed" in str(exc_info.value)
        mock_logger.error.assert_called_once()


class TestCount:
    """Test count method."""

    def test_count_all_records(self, repository, mock_db_context, mock_logger):
        """Test counting all records without filter."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = [42]

        # Execute
        count = repository.count()

        # Verify
        assert count == 42
        mock_cursor.execute.assert_called_once()

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'SELECT COUNT(*) FROM test_table' in call_args[0][0]
        assert call_args[0][1] == ()

    def test_count_with_where_clause(self, repository, mock_db_context, mock_logger):
        """Test counting records with WHERE clause."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = [10]

        # Execute
        count = repository.count(where_clause="status = %s", params=('active',))

        # Verify
        assert count == 10
        call_args = mock_cursor.execute.call_args
        assert 'WHERE status = %s' in call_args[0][0]
        assert call_args[0][1] == ('active',)

    def test_count_error_handling(self, repository, mock_db_context, mock_logger):
        """Test error handling in count."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Count failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.count()

        assert "Count failed" in str(exc_info.value)
        mock_logger.error.assert_called_once()


class TestExists:
    """Test exists method."""

    def test_exists_true(self, repository, mock_db_context, mock_logger):
        """Test exists returns True when record exists."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = [1]

        # Execute
        exists = repository.exists(1)

        # Verify
        assert exists is True
        mock_cursor.execute.assert_called_once()

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'SELECT 1 FROM test_table WHERE id = %s LIMIT 1' in call_args[0][0]
        assert call_args[0][1] == (1,)

    def test_exists_false(self, repository, mock_db_context, mock_logger):
        """Test exists returns False when record doesn't exist."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = None

        # Execute
        exists = repository.exists(999)

        # Verify
        assert exists is False

    def test_exists_error_handling(self, repository, mock_db_context, mock_logger):
        """Test error handling in exists."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Exists check failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.exists(1)

        assert "Exists check failed" in str(exc_info.value)
        mock_logger.error.assert_called_once()


class TestIntegrationScenarios:
    """Integration-style tests for common workflows."""

    def test_crud_workflow(self, repository, mock_db_context, mock_logger):
        """Test a complete CRUD workflow."""
        mock_cursor = mock_db_context['cursor']

        # Create
        mock_cursor.fetchone.return_value = [1]
        new_id = repository.insert({'name': 'test'})
        assert new_id == 1

        # Read
        mock_cursor.fetchone.return_value = {'id': 1, 'name': 'test'}
        record = repository.find_by_id(1)
        assert record['name'] == 'test'

        # Update
        mock_cursor.rowcount = 1
        updated = repository.update(1, {'name': 'updated'})
        assert updated is True

        # Delete
        mock_cursor.rowcount = 1
        deleted = repository.delete(1)
        assert deleted is True

    def test_bulk_operations(self, repository, mock_db_context, mock_logger):
        """Test bulk insert followed by count."""
        mock_cursor = mock_db_context['cursor']

        # Bulk insert
        records = [{'name': f'test{i}'} for i in range(100)]
        with patch('app.core.repository.execute_values'):
            repository.bulk_insert(records)

        # Count
        mock_cursor.fetchone.return_value = [100]
        count = repository.count()
        assert count == 100
