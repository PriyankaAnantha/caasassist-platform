import requests
import time
import os
import shutil
from pathlib import Path

# --- Configuration ---
BASE_URL = "http://localhost:8000"
DATASET_FILENAME = "subtitles.txt"
TARGET_MODEL = "unsloth/Llama-3.2-1B-Instruct" 
# Use a very small model for faster testing if needed, e.g., "unsloth/tinyllama-bnb-4bit"
SAVED_MODEL_NAME = "my-finetuned-llama3.2-1b"

# Training parameters for a quick test run.
# NOTE: Set max_steps to a small number for a very fast test.
# Your current API doesn't expose max_steps, so we rely on a small dataset and 1 epoch.
TRAINING_PARAMS = {
    "model_name": TARGET_MODEL,
    "dataset_file": DATASET_FILENAME,
    "max_seq_length": 512,  # Smaller sequence length for faster processing
    "num_train_epochs": 1,
    "per_device_train_batch_size": 1,
    "gradient_accumulation_steps": 1,
    "save_steps": 10,  # Save checkpoint quickly
    "logging_steps": 1,
}

def create_sample_dataset():
    """Creates a small subtitles.txt file for testing."""
    print(f"-> Creating sample dataset: {DATASET_FILENAME}")
    content = """
    Greetings, everyone. My name is Priyanka. I'm a final-year student pursuing my B.Tech.
    This is a test sentence to ensure the model can learn.

    Today, we will discuss the fine-tuning of large language models.
    Unsloth provides an efficient way to train these models. This is the second block of text.

    The API should be able to handle this data format.
    Each block is separated by a newline. This is the third and final block.
    """
    with open(DATASET_FILENAME, "w") as f:
        f.write(content.strip())

def cleanup_previous_run():
    """Removes artifacts from previous test runs for a clean slate."""
    print("-> Cleaning up artifacts from previous runs...")
    # Remove previously saved model directory
    saved_model_path = Path("trained_models") / SAVED_MODEL_NAME
    if saved_model_path.exists():
        shutil.rmtree(saved_model_path)
        print(f"   - Removed old saved model: {saved_model_path}")
    
    # Remove the dummy dataset file if it exists
    if os.path.exists(DATASET_FILENAME):
        os.remove(DATASET_FILENAME)
        print(f"   - Removed old dataset: {DATASET_FILENAME}")

def run_e2e_test():
    """Runs a full end-to-end test of the fine-tuning API."""
    
    # 0. Cleanup and Preparation
    cleanup_previous_run()
    create_sample_dataset()
    print("\n" + "="*50)

    # 1. Check API Health
    print("1. Checking API health...")
    response = requests.get(f"{BASE_URL}/")
    response.raise_for_status()
    print(f"   - API is running: {response.json()['message']}\n")

    # 2. Upload Dataset
    print(f"2. Uploading dataset '{DATASET_FILENAME}'...")
    with open(DATASET_FILENAME, "rb") as f:
        files = {"file": (DATASET_FILENAME, f, "text/plain")}
        response = requests.post(f"{BASE_URL}/upload", files=files)
    response.raise_for_status()
    print(f"   - Upload successful: {response.json()['message']}\n")

    # 3. Start Training
    print(f"3. Starting training for model '{TARGET_MODEL}'...")
    response = requests.post(f"{BASE_URL}/train", data=TRAINING_PARAMS)
    response.raise_for_status()
    job_id = response.json()["job_id"]
    print(f"   - Training job started with ID: {job_id}\n")

    # 4. Monitor Job Until Completion
    print("4. Monitoring training progress...")
    while True:
        response = requests.get(f"{BASE_URL}/status/{job_id}")
        response.raise_for_status()
        status_data = response.json()
        status = status_data["status"]
        progress = status_data.get("progress", 0)
        
        print(f"   - Status: {status} | Progress: {progress:.2f}%")
        
        if status == "completed":
            print("   - Training completed successfully!\n")
            break
        elif status == "failed":
            print("   - ERROR: Training failed!")
            # Fetch and print logs on failure
            logs_response = requests.get(f"{BASE_URL}/logs/{job_id}")
            print("   - Last 10 log entries:")
            for log in logs_response.json().get("logs", [])[-10:]:
                print(f"     {log}")
            return # Exit the test
            
        time.sleep(15) # Poll every 15 seconds

    # 5. Save the Completed Model
    print(f"5. Saving the fine-tuned model as '{SAVED_MODEL_NAME}'...")
    save_data = {"model_name": SAVED_MODEL_NAME}
    response = requests.post(f"{BASE_URL}/save-model/{job_id}", data=save_data)
    response.raise_for_status()
    print(f"   - Model save command sent successfully. Path: {response.json()['path']}\n")

    # 6. Verify Model was Saved
    print("6. Verifying model was saved...")
    response = requests.get(f"{BASE_URL}/saved-models")
    response.raise_for_status()
    saved_models = response.json()
    
    print(f"   - Found saved models: {saved_models}")
    
    if SAVED_MODEL_NAME in saved_models:
        print("\n✅ SUCCESS: End-to-end test passed! Model was trained and saved correctly.")
    else:
        print(f"\n❌ FAILURE: Model '{SAVED_MODEL_NAME}' was not found in the list of saved models.")
        
    # 7. Final Cleanup of temporary job data
    print("\n7. Cleaning up temporary job files...")
    response = requests.delete(f"{BASE_URL}/job/{job_id}")
    print(f"   - {response.json()['message']}")


if __name__ == "__main__":
    try:
        run_e2e_test()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to the API server.")
        print(f"Please make sure the FastAPI server is running at {BASE_URL}")
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ ERROR: An HTTP error occurred: {e.response.status_code}")
        print(f"Response: {e.response.text}")
    except Exception as e:
        print(f"\n❌ ERROR: An unexpected error occurred: {e}")