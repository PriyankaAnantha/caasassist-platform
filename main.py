# main.py


from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import re
import json
import uuid
import asyncio
import subprocess
import sys  # <--- imp
from datetime import datetime
import logging
from pathlib import Path
import shutil

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Unsloth LLM Fine-tuning API",
    description="API for fine-tuning LLM models using Unsloth",
    version="1.0.0"
)

# Global storage for training jobs
training_jobs: Dict[str, Dict[str, Any]] = {}

# Configuration
UPLOAD_DIR = Path("uploads")
MODELS_DIR = Path("trained_models")
UPLOAD_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# Pydantic models (remains the same)
class TrainingStatus(BaseModel):
    job_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: Optional[float] = None
    message: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    model_path: Optional[str] = None
    logs: Optional[List[str]] = None

# Add your target model to the list
AVAILABLE_MODELS = [
    "unsloth/Llama-3.2-1B-Instruct",
    "unsloth/tinyllama-bnb-4bit",
    "unsloth/llama-2-7b-bnb-4bit",
    "unsloth/mistral-7b-bnb-4bit",
]

# Key Change 2: Moved this function definition before `run_training`
def create_training_script(job_data: Dict[str, Any]) -> str:
    """Create the training script content based on job data."""
    model_name = job_data["model_name"]
    # Ensure the dataset path is correctly referenced from the root
    dataset_path = UPLOAD_DIR / job_data["dataset_file"]
    params = job_data["parameters"]
    job_id = job_data["job_id"]
    output_model_dir = f"trained_models/{job_id}"

    # Key Change 4: Replaced the data loader with the one from your proven Colab script.
    # This is much cleaner and directly serves your goal for text files.
    script = f"""
import os
import sys
import torch
import json
import re
from unsloth import FastLanguageModel
from datasets import Dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# Using the proven data preparation function from your Colab script
def prepare_document_data(file_path, chunk_size=256):
    print(f"Reading and preparing data from: {{file_path}}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            document_text = f.read()
    except Exception as e:
        print(f"Error reading file: {{e}}")
        sys.exit(1)

    sentences = re.split(r'(?<=[.!?])\\s+', document_text)
    chunks = []
    current_chunk = []
    current_length = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        sentence_length = len(sentence.split())
        if current_length + sentence_length > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_length
        else:
            current_chunk.append(sentence)
            current_length += sentence_length
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    data = {{"text": chunks}}
    dataset = Dataset.from_dict(data)
    print(f"Created {{len(dataset)}} chunks from the document.")
    return dataset

def main():
    try:
        # Model parameters
        model_name = "{model_name}"
        max_seq_length = {params['max_seq_length']}
        
        print("Loading model and tokenizer...")
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=model_name,
            max_seq_length=max_seq_length,
            dtype=None,
            load_in_4bit=True,
        )
        
        print("Preparing LoRA adapters...")
        model = FastLanguageModel.get_peft_model(
            model,
            r=8,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_alpha=16,
            lora_dropout=0,
            bias="none",
            use_gradient_checkpointing=True,
            random_state=3407,
        )
        
        dataset = prepare_document_data(r"{str(dataset_path)}")
        
        if len(dataset) == 0:
            print("Error: No data was loaded from the dataset file.")
            sys.exit(1)

        # Training arguments
        training_args = TrainingArguments(
            output_dir="{output_model_dir}",
            num_train_epochs={params['num_train_epochs']},
            per_device_train_batch_size={params['per_device_train_batch_size']},
            gradient_accumulation_steps={params['gradient_accumulation_steps']},
            warmup_steps={params['warmup_steps']},
            learning_rate={params['learning_rate']},
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps={params['logging_steps']},
            optim="adamw_8bit",
            save_strategy="steps",
            save_steps={params['save_steps']},
            save_total_limit=1,
            report_to="none",
            seed=3407,
        )
        
        trainer = SFTTrainer(
            model=model,
            tokenizer=tokenizer,
            train_dataset=dataset,
            dataset_text_field="text",
            max_seq_length=max_seq_length,
            args=training_args,
        )
        
        print("Starting training...")
        trainer.train()
        
        print("Saving final model...")
        model.save_pretrained("{output_model_dir}")
        tokenizer.save_pretrained("{output_model_dir}")
        
        print("Training completed successfully!")

    except Exception as e:
        print(f"An error occurred during training: {{e}}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
"""
    return script


async def run_training(job_id: str, job_data: Dict[str, Any]):
    """Run the actual training process"""
    job_data["status"] = "running"
    job_data["logs"].append(f"Starting training for job {job_id}")
    
    script_content = create_training_script(job_data)
    script_path = Path(f"training_script_{job_id}.py")

    try:
        with open(script_path, "w") as f:
            f.write(script_content)
        
        # Key Change 1: Added '-u' for unbuffered output
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-u", str(script_path),  # Use sys.executable to be safe
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT, # Redirect stderr to stdout
        )
        
        # Regex to parse trainer progress like ` 25%|██▌       | 10/40 [00:05<00:15,  1.95it/s]`
        # Or the new HF format: `[ 10/40 ... ]`
        progress_regex = re.compile(r"(\s*\d+\s*)/(\s*\d+\s*)")

        async for line in process.stdout:
            line_str = line.decode().strip()
            if not line_str:
                continue

            job_data["logs"].append(line_str)
            logger.info(f"Job {job_id}: {line_str}")
            
            # Key Change 3: More reliable progress parsing
            match = progress_regex.search(line_str)
            if match:
                current_step = int(match.group(1).strip())
                total_steps = int(match.group(2).strip())
                if total_steps > 0:
                    progress = (current_step / total_steps) * 100
                    job_data["progress"] = round(progress, 2)

        await process.wait()
        
        if process.returncode == 0:
            job_data["status"] = "completed"
            job_data["progress"] = 100.0
            job_data["end_time"] = datetime.now()
            job_data["model_path"] = f"trained_models/{job_id}"
            job_data["logs"].append("Training completed successfully!")
        else:
            job_data["status"] = "failed"
            job_data["end_time"] = datetime.now()
            job_data["logs"].append(f"Training failed with return code {process.returncode}. Check logs for details.")
            
    except Exception as e:
        job_data["status"] = "failed"
        job_data["end_time"] = datetime.now()
        job_data["logs"].append(f"API failed to execute training script: {str(e)}")
        logger.error(f"Training job {job_id} failed: {str(e)}")
    finally:
        if script_path.exists():
            script_path.unlink()

# --- The rest of your FastAPI endpoints remain largely the same ---
# (I've included them for completeness)

@app.get("/")
async def root():
    return {"message": "Unsloth LLM Fine-tuning API", "status": "running"}

@app.get("/models", response_model=List[str])
async def get_available_models():
    """Get list of available models for fine-tuning"""
    return AVAILABLE_MODELS

@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset file for training"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_path = UPLOAD_DIR / file.filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@app.get("/uploads")
async def list_uploaded_files():
    """List all uploaded dataset files"""
    return [f.name for f in UPLOAD_DIR.iterdir() if f.is_file()]

@app.post("/train", status_code=202)
async def start_training(
    background_tasks: BackgroundTasks,
    model_name: str = Form(...),
    dataset_file: str = Form(...),
    max_seq_length: int = Form(1024),
    num_train_epochs: int = Form(1),
    per_device_train_batch_size: int = Form(2),
    gradient_accumulation_steps: int = Form(2),
    learning_rate: float = Form(2e-4),
    warmup_steps: int = Form(5),
    save_steps: int = Form(50),
    logging_steps: int = Form(1)
):
    """Start training a model"""
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Model {model_name} not available")
    
    dataset_path = UPLOAD_DIR / dataset_file
    if not dataset_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file '{dataset_file}' not found in uploads directory")
    
    job_id = str(uuid.uuid4())
    
    training_jobs[job_id] = {
        "job_id": job_id, "status": "pending", "model_name": model_name,
        "dataset_file": dataset_file,
        "parameters": {
            "max_seq_length": max_seq_length, "learning_rate": learning_rate,
            "num_train_epochs": num_train_epochs,
            "per_device_train_batch_size": per_device_train_batch_size,
            "gradient_accumulation_steps": gradient_accumulation_steps,
            "warmup_steps": warmup_steps, "save_steps": save_steps, "logging_steps": logging_steps
        },
        "start_time": datetime.now(), "logs": [], "progress": 0.0
    }
    
    background_tasks.add_task(run_training, job_id, training_jobs[job_id])
    
    return {"job_id": job_id, "status": "Training queued", "message": f"Check status at /status/{job_id}"}

@app.get("/status/{job_id}", response_model=TrainingStatus)
async def get_training_status(job_id: str):
    """Get training status for a specific job"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return TrainingStatus(**training_jobs[job_id])

@app.get("/jobs")
async def list_training_jobs():
    """List all training jobs"""
    return [
        {
            "job_id": job_id, "status": data["status"], "model_name": data["model_name"],
            "progress": data.get("progress", 0.0), "start_time": data.get("start_time")
        }
        for job_id, data in training_jobs.items()
    ]

# ... (the rest of your endpoints like /logs, /save-model, etc. are fine as they were) ...
# I will include them here for a complete file.

@app.get("/logs/{job_id}")
async def get_training_logs(job_id: str):
    """Get training logs for a specific job"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"job_id": job_id, "logs": training_jobs[job_id]["logs"]}

@app.post("/save-model/{job_id}")
async def save_trained_model(job_id: str, model_name: str = Form(...)):
    """Save a trained model with a custom name"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = training_jobs[job_id]
    if job_data["status"] != "completed":
        raise HTTPException(status_code=400, detail="Training must be completed first")
    
    source_path = Path(f"trained_models/{job_id}")
    dest_path = MODELS_DIR / model_name
    
    if dest_path.exists():
        raise HTTPException(status_code=400, detail="Model name already exists")
    
    try:
        shutil.copytree(source_path, dest_path)
        return {"message": f"Model saved as {model_name}", "path": str(dest_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save model: {str(e)}")

@app.get("/saved-models")
async def list_saved_models():
    """List all saved models"""
    models = []
    for model_path in MODELS_DIR.iterdir():
        if model_path.is_dir():
            models.append(model_path.name)
    return models

@app.delete("/job/{job_id}")
async def delete_training_job(job_id: str):
    """Delete a training job and its temporary files"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    temp_model_path = Path(f"trained_models/{job_id}")
    if temp_model_path.exists():
        shutil.rmtree(temp_model_path)
    
    del training_jobs[job_id]
    
    return {"message": f"Job {job_id} deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    # Use --reload for development
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)