"""
Batch Job Scheduler — Member 4
================================
Runs batch_job.py every hour using Python's built-in schedule library.
This is the entry point of the spark/ container for Member 4's work.

Mode: Docker — runs as a long-lived process, fires batch_job every hour

Environment variables:
  HBASE_HOST   (default: hbase)
  HBASE_PORT   (default: 9090)
  SPARK_MASTER (default: spark://spark-master:7077)
  BATCH_INTERVAL_MINUTES (default: 60)
"""

import os
import time
import logging
import subprocess
from datetime import datetime

# ── Configuration ────────────────────────────────────────────────────
BATCH_INTERVAL_MINUTES = int(os.environ.get('BATCH_INTERVAL_MINUTES', '60'))
BATCH_SCRIPT = '/opt/spark/work-dir/batch_job.py'
SPARK_MASTER = os.environ.get('SPARK_MASTER', 'spark://spark-master:7077')
LOG_FILE     = '/var/log/batch.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [scheduler] %(levelname)s — %(message)s'
)
logger = logging.getLogger('scheduler')


# ── Runner ───────────────────────────────────────────────────────────
def run_batch():
    """Submit batch_job.py via spark-submit and log the result."""
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    logger.info(f'Triggering batch job at {now}')

    cmd = [
        '/opt/spark/bin/spark-submit',
        '--master', SPARK_MASTER,
        BATCH_SCRIPT,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600   # 10-minute hard timeout per run
        )

        if result.returncode == 0:
            logger.info('Batch job completed successfully')
        else:
            logger.error(f'Batch job failed (exit code {result.returncode})')
            logger.error(f'STDERR:\n{result.stderr[-2000:]}')  # last 2000 chars

        # Append output to log file
        with open(LOG_FILE, 'a') as f:
            f.write(f'\n=== Batch run at {now} ===\n')
            f.write(result.stdout)
            if result.stderr:
                f.write('--- STDERR ---\n')
                f.write(result.stderr)

    except subprocess.TimeoutExpired:
        logger.error('Batch job timed out after 10 minutes')
    except FileNotFoundError:
        logger.error('spark-submit not found — is Spark installed?')
    except Exception as e:
        logger.error(f'Unexpected error running batch job: {e}')


# ── Main loop ─────────────────────────────────────────────────────────
def main():
    logger.info(f'Scheduler started — interval: every {BATCH_INTERVAL_MINUTES} minute(s)')
    logger.info(f'Spark Master : {SPARK_MASTER}')
    logger.info(f'Batch script : {BATCH_SCRIPT}')

    interval_seconds = BATCH_INTERVAL_MINUTES * 60

    # Run once immediately on startup so we don't wait an hour for first data
    run_batch()

    while True:
        logger.info(f'Next run in {BATCH_INTERVAL_MINUTES} minute(s)...')
        time.sleep(interval_seconds)
        run_batch()


if __name__ == '__main__':
    main()