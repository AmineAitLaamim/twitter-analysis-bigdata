FROM apache/spark:3.5.0

USER root

# Install Python dependencies
COPY requirements.txt /opt/spark/work-dir/
RUN pip install --no-cache-dir -r /opt/spark/work-dir/requirements.txt

# Download TextBlob corpora (needed for sentiment analysis)
RUN python -m textblob.download_corpora

# Copy application code
COPY sentiment.py /opt/spark/work-dir/
COPY streaming_job.py /opt/spark/work-dir/
COPY batch_job.py /opt/spark/work-dir/
COPY scheduler.py /opt/spark/work-dir/

WORKDIR /opt/spark/work-dir
