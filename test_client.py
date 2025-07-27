import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000"

def test_api():
    """Test the API endpoints"""
    
    print("=== Testing Unsloth Fine-tuning API ===\n")
    
    # 1. Test root endpoint
    print("1. Testing root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # 2. Get available models
    print("2. Getting available models...")
    response = requests.get(f"{BASE_URL}/models")
    print(f"Status: {response.status_code}")
    models = response.json()
    print(f"Available models: {models[:3]}...\n")  # Show first 3
    
    # 3. Create sample dataset
    print("3. Creating sample dataset...")
    sample_data = [
        {
            "text": "Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nWhat is AI?\n\n### Response:\nAI stands for Artificial Intelligence."
        },
        {
            "text": "Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nExplain Python.\n\n### Response:\nPython is a high-level programming language known for its simplicity and readability."
        }
    ]
    
    with open("test_dataset.json", "w") as f:
        json.dump(sample_data, f, indent=2)
    
    # 4. Upload dataset
    print("4. Uploading dataset...")
    with open("test_dataset.json", "rb") as f:
        files = {"file": ("test_dataset.json", f, "application/json")}
        response = requests.post(f"{BASE_URL}/upload", files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # 5. List uploaded files
    print("5. Listing uploaded files...")
    response = requests.get(f"{BASE_URL}/uploads")
    print(f"Status: {response.status_code}")
    print(f"Uploaded files: {response.json()}\n")
    
    # 6. Start training (with small parameters for testing)
    print("6. Starting training...")
    training_data = {
        "model_name": "unsloth/tinyllama-bnb-4bit",  # Smallest model for testing
        "dataset_file": "test_dataset.json",
        "max_seq_length": 512,
        "learning_rate": 2e-4,
        "num_train_epochs": 1,
        "per_device_train_batch_size": 1,
        "gradient_accumulation_steps": 2,
        "warmup_steps": 2,
        "save_steps": 10,
        "logging_steps": 1
    }
    
    response = requests.post(f"{BASE_URL}/train", data=training_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {result}\n")
    
    if response.status_code == 200:
        job_id = result["job_id"]
        
        # 7. Monitor training status
        print("7. Monitoring training status...")
        for i in range(10):  # Check status 10 times
            response = requests.get(f"{BASE_URL}/status/{job_id}")
            status_data = response.json()
            print(f"Status check {i+1}: {status_data['status']} - Progress: {status_data.get('progress', 0):.1f}%")
            
            if status_data["status"] in ["completed", "failed"]:
                break
            
            time.sleep(10)  # Wait 10 seconds between checks
        
        # 8. Get logs
        print("\n8. Getting training logs...")
        response = requests.get(f"{BASE_URL}/logs/{job_id}")
        logs = response.json()
        print(f"Last 5 log entries:")
        for log in logs["logs"][-5:]:
            print(f"  {log}")
        
        # 9. List all jobs
        print("\n9. Listing all training jobs...")
        response = requests.get(f"{BASE_URL}/jobs")
        jobs = response.json()
        print(f"Training jobs: {len(jobs)} total")
        for job in jobs:
            print(f"  Job {job['job_id'][:8]}...: {job['status']} - {job['model_name']}")
    
    print("\n=== API Test Complete ===")

if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API server.")
        print("Make sure the server is running at http://localhost:8000")
    except Exception as e:
        print(f"Error: {e}")