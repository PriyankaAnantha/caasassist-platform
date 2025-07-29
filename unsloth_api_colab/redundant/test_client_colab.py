# test_client_colab.py
import requests
import time
import os
import shutil
from pathlib import Path
import zipfile

# --- Configuration ---
DATASET_FILENAME = "subtitles.txt"
TARGET_MODEL = "unsloth/Llama-3.2-1B-Instruct"
LOCAL_DOWNLOAD_DIR = Path("downloaded_models")
SAVED_MODEL_NAME = "my-finetuned-llama3-from-colab"

def create_sample_dataset():
    """Creates a small subtitles.txt file for testing."""
    print(f"-> Creating sample dataset: {DATASET_FILENAME}")
    content = """
    Greetings, everyone. My name is Priyanka. I'm a final-year student.
    This is a test sentence to ensure the model can learn from our data.

    Today, we will discuss the fine-tuning of large language models.
    Unsloth provides an efficient way to train these models on free hardware.
    """
    with open(DATASET_FILENAME, "w") as f:
        f.write(content.strip())
    return Path(DATASET_FILENAME)

def download_and_unzip_model(base_url, job_id):
    """Downloads the zipped model and extracts it locally."""
    print("\n5. Downloading the fine-tuned model...")
    download_url = f"{base_url}download/{job_id}"
    
    local_zip_path = LOCAL_DOWNLOAD_DIR / f"{job_id}.zip"
    final_model_path = LOCAL_DOWNLOAD_DIR / SAVED_MODEL_NAME

    # Clean up old versions if they exist
    if final_model_path.exists():
        shutil.rmtree(final_model_path)

    LOCAL_DOWNLOAD_DIR.mkdir(exist_ok=True)
    
    try:
        with requests.get(download_url, stream=True) as r:
            r.raise_for_status()
            with open(local_zip_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(f"   - Download complete: {local_zip_path}")

        print("   - Unzipping model...")
        with zipfile.ZipFile(local_zip_path, 'r') as zip_ref:
            zip_ref.extractall(final_model_path)
        print(f"   - Model extracted to: {final_model_path}")

        # Clean up the zip file
        os.remove(local_zip_path)

    except requests.exceptions.RequestException as e:
        print(f"   - ❌ ERROR: Failed to download model: {e}")
        return False
    return True

def run_e2e_test(base_url: str):
    """Runs the full end-to-end test workflow."""
    dataset_path = create_sample_dataset()
    print("\n" + "="*50)
    
    print("1. Uploading dataset to Colab...")
    with open(dataset_path, "rb") as f:
        files = {"file": (dataset_path.name, f, "text/plain")}
        response = requests.post(f"{base_url}upload", files=files)
    response.raise_for_status()
    print(f"   - Upload successful: {response.json()['message']}\n")

    print(f"2. Starting training for '{TARGET_MODEL}' on Colab...")
    training_params = {"model_name": TARGET_MODEL, "dataset_file": dataset_path.name}
    response = requests.post(f"{base_url}train", data=training_params)
    response.raise_for_status()
    job_id = response.json()["job_id"]
    print(f"   - Training job started with ID: {job_id}\n")

    print("3. Monitoring training progress from Colab...")
    while True:
        try:
            response = requests.get(f"{base_url}status/{job_id}", timeout=20)
            response.raise_for_status()
            status_data = response.json()
            status = status_data["status"]
            progress = status_data.get("progress", 0)
            print(f"   - Status: {status} | Progress: {progress:.2f}%", end="\r")
            if status in ["completed", "failed"]:
                print("\n" + " " * 50) # Clear the line
                break
            time.sleep(10)
        except requests.exceptions.RequestException as e:
            print(f"\n   - Warning: Could not get status. Retrying... ({e})")
            time.sleep(15)

    if status_data.get("status") == "completed":
        print("4. ✅ Training on Colab completed!")
        if download_and_unzip_model(base_url, job_id):
            print("\n✅ SUCCESS! Full workflow complete. Model is ready locally.")
        else:
            print("\n❌ FAILURE: Model training finished, but download failed.")
    else:
        print("\n❌ FAILURE: Training on Colab failed.")
    
    # Cleanup the local dummy dataset
    os.remove(dataset_path)
    print("\n" + "="*50)

if __name__ == "__main__":
    print("--- Unsloth Colab API Test Client ---")
    ngrok_url_input = input("Paste the public ngrok URL from your Colab notebook: ").strip()
    if not ngrok_url_input:
        print("URL cannot be empty.")
    else:
        if not ngrok_url_input.endswith('/'):
             ngrok_url_input += '/'
        try:
            run_e2e_test(ngrok_url_input)
        except requests.exceptions.RequestException as e:
            print(f"\n❌ FATAL ERROR: Could not connect to the Colab API at {ngrok_url_input}")
            print(f"   Please check the URL and ensure the Colab cell is still running.")
            print(f"   Details: {e}")