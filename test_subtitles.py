import requests
import time

BASE_URL = "http://localhost:8000"

def test_subtitles_finetuning():
    print("=== Testing Subtitles Fine-tuning with Llama-3.2-1B-Instruct ===\n")
    
    # 1. Upload the subtitles file
    print("1. Uploading subtitles.txt...")
    try:
        with open("subtitles.txt", "rb") as f:
            files = {"file": ("subtitles.txt", f, "text/plain")}
            print(f"Sending request to {BASE_URL}/upload...")
            response = requests.post(f"{BASE_URL}/upload", files=files)
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"Error uploading file: {response.text}")
            return
        
        upload_result = response.json()
        print(f"Upload successful: {upload_result}\n")
        
    except FileNotFoundError:
        print("Error: subtitles.txt not found in the current directory")
        print("Current directory contents:")
        import os
        print("\n".join(os.listdir()))
        return
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return
    
    # 2. Start training with Llama-3.2-1B-Instruct
    print("2. Starting fine-tuning...")
    training_data = {
        "model_name": "unsloth/Llama-3.2-1B-Instruct",
        "dataset_file": "subtitles.txt",
        "max_seq_length": 1024,  # Slightly larger context for better understanding
        "learning_rate": 2e-4,
        "num_train_epochs": 3,    # Fewer epochs for testing
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 4,
        "warmup_steps": 5,
        "save_steps": 50,
        "logging_steps": 1
    }
    
    response = requests.post(f"{BASE_URL}/train", data=training_data)
    if response.status_code != 200:
        print(f"Error starting training: {response.text}")
        return
    
    training_result = response.json()
    job_id = training_result.get("job_id")
    print(f"Training started with job ID: {job_id}")
    print("You can monitor progress with the following command:")
    print(f"curl http://localhost:8000/status/{job_id}")
    print("Or check the logs with:")
    print(f"curl http://localhost:8000/logs/{job_id}")
    
    # 3. Monitor training (optional)
    print("\n3. Monitoring training progress (Ctrl+C to stop monitoring)...")
    try:
        while True:
            response = requests.get(f"{BASE_URL}/status/{job_id}")
            if response.status_code == 200:
                status = response.json()
                print(f"Status: {status['status']}, Progress: {status.get('progress', 0):.1f}%")
                if status['status'] in ["completed", "failed"]:
                    break
            time.sleep(10)  # Check every 10 seconds
    except KeyboardInterrupt:
        print("\nMonitoring stopped. Training continues in the background.")
    
    print("\nTest completed!")

if __name__ == "__main__":
    test_subtitles_finetuning()
