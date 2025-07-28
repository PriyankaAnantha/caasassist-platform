# test_client_interactive.py
import requests
import time
import os
import shutil
from pathlib import Path
import zipfile
import sys
from urllib.parse import urlparse

# Add local-inference imports with a friendly error message if they're missing.
try:
    import torch
    from unsloth import FastLanguageModel
    LOCAL_INFERENCE_ENABLED = True
except ImportError:
    LOCAL_INFERENCE_ENABLED = False

def get_validated_url():
    """Gets and validates the ngrok URL from the user."""
    while True:
        url_input = input("Paste the public ngrok URL from your Colab notebook: ").strip()
        if not url_input:
            print("❌ URL cannot be empty.")
            continue
        
        # Clean up the URL
        parsed = urlparse(url_input)
        base_url = f"{parsed.scheme}://{parsed.netloc}/"
        
        # Perform a health check
        print(f"Checking connection to {base_url}...")
        try:
            response = requests.get(base_url, timeout=10)
            response.raise_for_status()
            if "Unsloth API is running!" in response.json().get("message", ""):
                print("✅ Connection successful!")
                return base_url
            else:
                print("❌ ERROR: Connected, but this doesn't seem to be the Unsloth API.")
        except requests.RequestException as e:
            print(f"❌ ERROR: Could not connect to the server. Please check the URL and that the Colab cell is running.")
            print(f"   Details: {e}")

def get_user_input(base_url):
    """Gets all necessary inputs from the user."""
    print("\n--- Configuration ---")
    while True:
        file_path = Path(input("Enter the path to your document (.txt, .pdf, .md): ").strip())
        if file_path.exists() and file_path.is_file(): break
        print(f"❌ ERROR: File not found at '{file_path}'. Please try again.")
    
    print("\nFetching available models from Colab...")
    response = requests.get(f"{base_url}models")
    if not response.ok:
        print(f"❌ ERROR: Failed to fetch models. Status: {response.status_code}. Text: {response.text}")
        return None, None, None
    models = response.json()
    for i, model in enumerate(models): print(f"  [{i+1}] {model}")
    while True:
        try:
            choice = int(input(f"Choose a model to fine-tune [1-{len(models)}]: "))
            if 1 <= choice <= len(models):
                chosen_model = models[choice-1]; break
            else: print("Invalid choice.")
        except ValueError: print("Please enter a number.")
            
    while True:
        saved_model_name = input("Enter a folder name for your fine-tuned model (e.g., 'my-legal-model'): ").strip()
        if saved_model_name and not any(c in ' /\\:*?"<>|' for c in saved_model_name): break
        print("Name cannot be empty and must be a valid folder name.")
        
    return file_path, chosen_model, saved_model_name

def download_and_unzip(base_url, job_id, saved_model_name):
    print("\n[5/6] Downloading the fine-tuned model...")
    download_url = f"{base_url}download/{job_id}?model_name={saved_model_name}"
    local_download_dir = Path("downloaded_models")
    final_model_path = local_download_dir / saved_model_name
    
    if final_model_path.exists(): shutil.rmtree(final_model_path)
    local_download_dir.mkdir(exist_ok=True)
    
    try:
        with requests.get(download_url, stream=True, timeout=300) as r:
            r.raise_for_status()
            local_zip_path = local_download_dir / f"{saved_model_name}.zip"
            with open(local_zip_path, 'wb') as f: shutil.copyfileobj(r.raw, f)
        print(f"   - Download complete.")
        with zipfile.ZipFile(local_zip_path, 'r') as zf: zf.extractall(final_model_path)
        print(f"   - Model extracted to: {final_model_path}")
        os.remove(local_zip_path)
        return final_model_path
    except Exception as e:
        print(f"   - ❌ ERROR: Failed to download model: {e}")
        return None

def chat_with_local_model(model_path: Path):
    if not LOCAL_INFERENCE_ENABLED:
        print("\n[6/6] Skipping local chat: `unsloth` or `torch` not found.")
        return
    print(f"\n[6/6] Loading local model '{model_path.name}' for chat...")
    try:
        model, tokenizer = FastLanguageModel.from_pretrained(model_name=str(model_path), load_in_4bit=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model.to(device)
    except Exception as e:
        print(f"   - ❌ ERROR: Could not load local model. {e}"); return

    print(f"\n✅ Chat session started on '{device}'. Type 'quit' to exit.")
    while True:
        prompt = input("You: ")
        if prompt.lower().strip() == 'quit': break
        formatted_prompt = f"### Instruction:\n{prompt}\n\n### Response:\n"
        inputs = tokenizer([formatted_prompt], return_tensors="pt").to(device)
        outputs = model.generate(**inputs, max_new_tokens=200, use_cache=True, pad_token_id=tokenizer.eos_token_id)
        response_text = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
        response_only = response_text.split("### Response:\n")[-1].strip()
        print(f"AI: {response_only}")

def main():
    """Main function to run the end-to-end workflow with enhanced error reporting."""
    print("--- Unsloth Interactive Fine-Tuning Client (v2.1) ---")
    base_url = get_validated_url()
    if not base_url: sys.exit(1)
    
    file_path, chosen_model, saved_model_name = get_user_input(base_url)
    if not all([file_path, chosen_model, saved_model_name]):
        print("❌ Configuration failed. Exiting."); sys.exit(1)
    
    job_id = None # Initialize job_id to None
    try:
        print("\n[1/6] Uploading dataset to Colab...")
        with open(file_path, "rb") as f:
            response = requests.post(f"{base_url}upload", files={"file": (file_path.name, f)})
        response.raise_for_status()

        print(f"\n[2/6] Starting training for '{chosen_model}'...")
        params = {"model_name": chosen_model, "dataset_file": file_path.name}
        response = requests.post(f"{base_url}train", data=params)
        job_id = response.json()["job_id"]
        print(f"   - Job ID: {job_id}")

        print("\n[3/6] Monitoring training progress...")
        final_status = "running"
        while True:
            response = requests.get(f"{base_url}status/{job_id}", timeout=20)
            status, progress = response.json()["status"], response.json().get("progress", 0)
            print(f"   - Status: {status} | Progress: {progress or 0:.2f}%", end="\r")
            if status in ["completed", "failed"]:
                final_status = status
                print("\n" + " "*50) # Clear the line
                break
            time.sleep(10)

        if final_status == "completed":
            print("[4/6] ✅ Training completed!")
            local_model_path = download_and_unzip(base_url, job_id, saved_model_name)
            if local_model_path:
                chat_with_local_model(local_model_path)
                print("\n✅ SUCCESS! Full workflow complete.")
            else:
                print("\n❌ FAILURE: Model training finished, but download failed.")
        else:
            # --- THIS IS THE NEW ERROR HANDLING BLOCK ---
            print("\n❌ FAILURE: Training failed on Colab.")
            print("--- Fetching server logs for diagnosis ---")
            log_response = requests.get(f"{base_url}logs/{job_id}")
            if log_response.ok:
                logs = log_response.json().get("logs", [])
                if logs:
                    for line in logs:
                        print(f"  [SERVER] {line}")
                else:
                    print("  - No logs were returned from the server.")
            else:
                print(f"  - Could not fetch logs. Status: {log_response.status_code}")
            print("------------------------------------------")

    except requests.RequestException as e:
        print(f"\n❌ FATAL ERROR: An API error occurred. {e}")
    except Exception as e:
        print(f"\nAn unexpected local error occurred: {e}")
        

if __name__ == "__main__":
    main()