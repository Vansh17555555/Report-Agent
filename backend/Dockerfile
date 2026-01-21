# Use official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory to /app
WORKDIR /app

# Install system dependencies
# gcc and python3-dev are often needed for compiling some python packages (like chroma or numpy)
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
# We assume the docker build context is the root (rag-plus), so path is backend/requirements.txt
# If build context is backend/ then it is just requirements.txt. 
# Let's assume user builds inside `backend` folder.
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.main:app when the container launches
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
