#!/usr/bin/env python3
"""
scripts/debug_render_environment.py

Comprehensive diagnostic script for debugging Render deployment environment.
Checks file system permissions, database connectivity, environment variables,
and attempts to write test files to diagnose issues.
"""

import os
import sys
import platform
import shutil
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=".env", override=True)

def print_header(title):
    """Print a formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_check(label, status, details=""):
    """Print a check result with status indicator."""
    icon = "✅" if status == "ok" else "❌" if status == "error" else "⚠️"
    print(f"{icon} {label}: {details if details else status.upper()}")

def check_system_info():
    """Check and display system information."""
    print_header("SYSTEM INFORMATION")
    print_check("Python Version", "ok", sys.version.split()[0])
    print_check("Platform", "ok", platform.platform())
    print_check("Architecture", "ok", platform.machine())
    print_check("Processor", "ok", platform.processor() or "Unknown")
    print_check("Working Directory", "ok", os.getcwd())
    print_check("Script Location", "ok", os.path.abspath(__file__))
    print_check("User", "ok", os.getenv("USER", "unknown"))
    print_check("Home Directory", "ok", os.path.expanduser("~"))

def check_disk_space():
    """Check available disk space."""
    print_header("DISK SPACE")
    try:
        stat = shutil.disk_usage("/")
        total_gb = stat.total / (1024**3)
        used_gb = stat.used / (1024**3)
        free_gb = stat.free / (1024**3)
        percent_used = (stat.used / stat.total) * 100
        
        print(f"  Total: {total_gb:.2f} GB")
        print(f"  Used: {used_gb:.2f} GB ({percent_used:.1f}%)")
        print(f"  Free: {free_gb:.2f} GB")
        
        status = "ok" if free_gb > 1.0 else "warning" if free_gb > 0.5 else "error"
        print_check("Disk Space Status", status, f"{free_gb:.2f} GB available")
    except Exception as e:
        print_check("Disk Space Check", "error", str(e))

def check_environment_variables():
    """Check critical environment variables (with redaction)."""
    print_header("ENVIRONMENT VARIABLES")
    
    critical_vars = [
        "DATABASE_URL",
        "EODHD_API_KEY",
        "OS_API_KEY",
        "NEWS_API_KEY",
        "LOOKBACK_MONTHS",
        "BATCH_SIZE",
        "FETCH_EODHD",
    ]
    
    for var in critical_vars:
        value = os.getenv(var)
        if value:
            # Redact sensitive values
            if "KEY" in var or "URL" in var:
                display_value = f"[SET - {len(value)} chars]"
            else:
                display_value = value
            print_check(var, "ok", display_value)
        else:
            print_check(var, "warning", "NOT SET")

def check_database_connectivity():
    """Test database connection and query capabilities."""
    print_header("DATABASE CONNECTIVITY")
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print_check("Database URL", "error", "DATABASE_URL not set")
        return
    
    print_check("Database URL", "ok", f"[SET - {len(database_url)} chars]")
    
    try:
        # Test connection
        conn = psycopg2.connect(database_url)
        print_check("Connection", "ok", "Successfully connected")
        
        # Test query
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            print_check("PostgreSQL Version", "ok", version[:60])
            
            # Check tables
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = [row[0] for row in cur.fetchall()]
            print_check("Tables Found", "ok", f"{len(tables)} tables")
            print(f"  Tables: {', '.join(tables[:10])}" + ("..." if len(tables) > 10 else ""))
            
            # Check prices table
            if "prices" in tables:
                cur.execute("SELECT COUNT(*) FROM prices")
                count = cur.fetchone()[0]
                print_check("Prices Table Records", "ok", f"{count:,} rows")
            else:
                print_check("Prices Table", "warning", "NOT FOUND")
        
        conn.close()
        print_check("Database Test", "ok", "All checks passed")
        
    except psycopg2.Error as e:
        print_check("Database Connection", "error", str(e))
    except Exception as e:
        print_check("Database Test", "error", str(e))

def check_directories():
    """Check required directories and permissions."""
    print_header("DIRECTORY PERMISSIONS")
    
    required_dirs = [
        "/app",
        "/app/outputs",
        "/app/data",
        "/app/data/training",
        "outputs",
        "data/training",
    ]
    
    for dir_path in required_dirs:
        try:
            exists = os.path.exists(dir_path)
            
            if not exists:
                print_check(dir_path, "warning", "Does not exist")
                # Try to create it
                try:
                    os.makedirs(dir_path, exist_ok=True)
                    print(f"    → Created directory: {dir_path}")
                    exists = True
                except Exception as create_error:
                    print(f"    → Failed to create: {create_error}")
                    continue
            
            # Check permissions
            readable = os.access(dir_path, os.R_OK)
            writable = os.access(dir_path, os.W_OK)
            executable = os.access(dir_path, os.X_OK)
            
            perms = []
            if readable: perms.append("R")
            if writable: perms.append("W")
            if executable: perms.append("X")
            
            status = "ok" if (readable and writable) else "warning"
            print_check(dir_path, status, f"Permissions: {'/'.join(perms) if perms else 'NONE'}")
            
            # Show ls -ld output
            try:
                import subprocess
                result = subprocess.run(
                    ["ls", "-ld", dir_path],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    print(f"    → {result.stdout.strip()}")
            except:
                pass
                
        except Exception as e:
            print_check(dir_path, "error", str(e))

def test_file_write():
    """Test writing files to various directories."""
    print_header("FILE WRITE TESTS")
    
    test_dirs = [
        "/app/outputs",
        "outputs",
        "data/training",
    ]
    
    for dir_path in test_dirs:
        try:
            # Create directory if it doesn't exist
            os.makedirs(dir_path, exist_ok=True)
            
            # Write test file
            test_file = os.path.join(dir_path, f"test_write_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
            test_content = f"Test write at {datetime.now().isoformat()}\n"
            
            with open(test_file, 'w') as f:
                f.write(test_content)
            
            # Verify file exists and content
            if os.path.exists(test_file):
                size = os.path.getsize(test_file)
                with open(test_file, 'r') as f:
                    content = f.read()
                
                if content == test_content:
                    print_check(f"Write to {dir_path}", "ok", f"Success ({size} bytes)")
                    # Clean up
                    os.remove(test_file)
                else:
                    print_check(f"Write to {dir_path}", "error", "Content mismatch")
            else:
                print_check(f"Write to {dir_path}", "error", "File not found after write")
                
        except Exception as e:
            print_check(f"Write to {dir_path}", "error", str(e))

def check_python_packages():
    """Check critical Python packages are installed."""
    print_header("PYTHON PACKAGES")
    
    packages = [
        "pandas",
        "numpy",
        "psycopg2",
        "lightgbm",
        "scikit-learn",
        "fastapi",
        "uvicorn",
        "python-dotenv",
    ]
    
    for package in packages:
        try:
            __import__(package.replace("-", "_"))
            print_check(package, "ok", "Installed")
        except ImportError:
            print_check(package, "error", "NOT INSTALLED")

def main():
    """Run all diagnostic checks."""
    print("\n")
    print("🔍 ASX PORTFOLIO OS - RENDER ENVIRONMENT DIAGNOSTICS")
    print(f"📅 Run Date: {datetime.now().isoformat()}")
    
    try:
        check_system_info()
        check_disk_space()
        check_environment_variables()
        check_python_packages()
        check_directories()
        test_file_write()
        check_database_connectivity()
        
        print_header("DIAGNOSTIC COMPLETE")
        print("✅ All diagnostic checks completed successfully!")
        print("\nIf you see any errors above, please address them before running training jobs.")
        print("=" * 70)
        print()
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Diagnostic interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Diagnostic failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
