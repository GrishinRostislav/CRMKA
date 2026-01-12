FROM python:3.9-alpine

# Install Docker CLI to interact with sibling containers
RUN apk add --no-cache docker-cli

# Install dependencies
RUN pip install requests

COPY monitor.py /app/monitor.py

WORKDIR /app

CMD ["python", "-u", "monitor.py"]
