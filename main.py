from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import uuid
import asyncio
import subprocess
from datetime import datetime
import logging
from pathlib import Path
import shutil

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Unsloth LLM Fine-tuning API",
    description="API for fine-tuning Ollama LLM models using Unsloth",
    version="1.0.0"
)

# Global storage for training jobs
training_jobs: Dict[str, Dict[str, Any]] = {}

# Configuration
UPLOAD_DIR = Path("uploads")
MODELS_DIR = Path("trained_models")
UPLOAD_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# Pydantic models
class TrainingRequest(BaseModel):
    model_name: str
    dataset_file: str
    max_seq_length: Optional[int] = 2048
    learning_rate: Optional[float] = 2e-4
    num_train_epochs: Optional[int] = 1
    per_device_train_batch_size: Optional[int] = 2
    gradient_accumulation_steps: Optional[int] = 4
    warmup_steps: Optional[int] = 5
    save_steps: Optional[int] = 60
    logging_steps: Optional[int] = 1

class TrainingStatus(BaseModel):
    job_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: Optional[float] = None
    message: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    model_path: Optional[str] = None
    logs: Optional[List[str]] = None

# Available models (you can extend this list)
AVAILABLE_MODELS = [
    "unsloth/Llama-3.2-1B-Instruct",
    "unsloth/llama-2-7b-bnb-4bit",
    "unsloth/llama-2-13b-bnb-4bit", 
    "unsloth/mistral-7b-bnb-4bit",
    "unsloth/mixtral-8x7b-bnb-4bit",
    "unsloth/codellama-34b-bnb-4bit",
    "unsloth/zephyr-sft-bnb-4bit",
    "unsloth/tinyllama-bnb-4bit",
]

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
    
    # Validate file type
    if not file.filename.endswith(('.json', '.jsonl', '.csv', '.txt')):
        raise HTTPException(
            status_code=400, 
            detail="File must be .json, .jsonl, .csv, or .txt format"
        )
    
    # Save file
    file_path = UPLOAD_DIR / file.filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "size": file_path.stat().st_size,
            "path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@app.get("/uploads")
async def list_uploaded_files():
    """List all uploaded dataset files"""
    files = []
    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file():
            files.append({
                "filename": file_path.name,
                "size": file_path.stat().st_size,
                "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            })
    return files

@app.post("/train")
async def start_training(
    background_tasks: BackgroundTasks,
    model_name: str = Form(...),
    dataset_file: str = Form(...),
    max_seq_length: int = Form(2048),
    learning_rate: float = Form(2e-4),
    num_train_epochs: int = Form(1),
    per_device_train_batch_size: int = Form(2),
    gradient_accumulation_steps: int = Form(4),
    warmup_steps: int = Form(5),
    save_steps: int = Form(60),
    logging_steps: int = Form(1)
):
    """Start training a model"""
    
    # Validate model
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Model {model_name} not available")
    
    # Validate dataset file exists
    dataset_path = UPLOAD_DIR / dataset_file
    if not dataset_path.exists():
        raise HTTPException(status_code=400, detail=f"Dataset file {dataset_file} not found")
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Create training job
    training_job = {
        "job_id": job_id,
        "status": "pending",
        "model_name": model_name,
        "dataset_file": dataset_file,
        "parameters": {
            "max_seq_length": max_seq_length,
            "learning_rate": learning_rate,
            "num_train_epochs": num_train_epochs,
            "per_device_train_batch_size": per_device_train_batch_size,
            "gradient_accumulation_steps": gradient_accumulation_steps,
            "warmup_steps": warmup_steps,
            "save_steps": save_steps,
            "logging_steps": logging_steps
        },
        "start_time": datetime.now(),
        "logs": [],
        "progress": 0.0
    }
    
    training_jobs[job_id] = training_job
    
    # Start training in background
    background_tasks.add_task(run_training, job_id, training_job)
    
    return {"job_id": job_id, "status": "Training started", "message": "Job queued for processing"}

async def run_training(job_id: str, job_data: Dict[str, Any]):
    """Run the actual training process"""
    try:
        # Update status
        training_jobs[job_id]["status"] = "running"
        training_jobs[job_id]["logs"].append(f"Starting training for job {job_id}")
        
        # Create training script
        script_content = create_training_script(job_data)
        script_path = Path(f"training_script_{job_id}.py")
        
        with open(script_path, "w") as f:
            f.write(script_content)
        
        # Run training
        process = await asyncio.create_subprocess_exec(
            "python", str(script_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=os.getcwd()
        )
        
        # Monitor progress
        async for line in process.stdout:
            line_str = line.decode().strip()
            if line_str:
                training_jobs[job_id]["logs"].append(line_str)
                logger.info(f"Job {job_id}: {line_str}")
                
                # Extract progress if possible
                if "%" in line_str or "step" in line_str.lower():
                    # Simple progress estimation - you can make this more sophisticated
                    current_logs = len(training_jobs[job_id]["logs"])
                    estimated_total = job_data["parameters"]["num_train_epochs"] * 100
                    progress = min(current_logs / estimated_total * 100, 99.0)
                    training_jobs[job_id]["progress"] = progress
        
        await process.wait()
        
        if process.returncode == 0:
            training_jobs[job_id]["status"] = "completed"
            training_jobs[job_id]["progress"] = 100.0
            training_jobs[job_id]["end_time"] = datetime.now()
            training_jobs[job_id]["model_path"] = f"trained_models/{job_id}"
            training_jobs[job_id]["logs"].append("Training completed successfully!")
        else:
            training_jobs[job_id]["status"] = "failed"
            training_jobs[job_id]["end_time"] = datetime.now()
            training_jobs[job_id]["logs"].append(f"Training failed with return code {process.returncode}")
            
    except Exception as e:
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["end_time"] = datetime.now()
        training_jobs[job_id]["logs"].append(f"Training failed with error: {str(e)}")
        logger.error(f"Training job {job_id} failed: {str(e)}")
    finally:
        # Cleanup
        if script_path.exists():
            script_path.unlink()
    """Create the training script content"""
    model_name = job_data["model_name"]
    dataset_file = job_data["dataset_file"]
    params = job_data["parameters"]
    job_id = job_data["job_id"]
    
    return f"""
import os
import sys
import torch
import json
from unsloth import FastLanguageModel
from datasets import Dataset, load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

def prepare_document_data(file_path, chunk_size=512):
    print(f"Loading dataset from {file_path}")
    try:
        # Try loading as JSON first
        if file_path.endswith('.json'):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    texts = [item.get("text", "") if isinstance(item, dict) else str(item) for item in data]
                elif isinstance(data, dict):
                    if 'train' in data:
                        texts = [item.get("text", "") for item in data['train']]
                    else:
                        texts = [data.get("text", "")]
                else:
                    texts = [str(data)]
                return Dataset.from_dict({"text": texts})
        
        # Try loading as JSONL
        elif file_path.endswith('.jsonl'):
            texts = []
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        data = json.loads(line)
                        texts.append(data.get("text", "") if isinstance(data, dict) else str(data))
                    except json.JSONDecodeError:
                        texts.append(line.strip())
            return Dataset.from_dict({"text": texts})
            
        # Try loading as text file
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # For subtitles, split by empty lines first to get individual subtitle blocks
            if 'subtitles' in file_path.lower():
                # Split by empty lines to get subtitle blocks
                blocks = [block.strip() for block in text.split('\n\n') if block.strip()]
                # Further split each block into sentences
                all_sentences = []
                for block in blocks:
                    # Remove timestamps if they exist (e.g., [00:00:00])
                    import re
                    # Use raw strings for regex patterns
                    timestamp_pattern = r'\[\d{2}:\d{2}:\d{2}\]'
                    sentence_pattern = r'(?<=[.!?])\s+'
                    block = re.sub(timestamp_pattern, '', block)
                    # Split into sentences
                    sentences = [s.strip() for s in re.split(sentence_pattern, block) if s.strip()]
                    all_sentences.extend(sentences)
                return Dataset.from_dict({"text": all_sentences})
            else:
                # For regular text files, split into sentences
                import re
                sentence_pattern = r'(?<=[.!?])\s+'
                sentences = [s.strip() for s in re.split(sentence_pattern, text) if s.strip()]
                return Dataset.from_dict({"text": sentences})
            
    except Exception as e:
        print(f"Error loading dataset: {str(e)}")
        raise

def main():
    # Model parameters
    model_name = "{model_name}"
    max_seq_length = {params['max_seq_length']}
    
    print("Loading model and tokenizer...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
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
    
    # Prepare dataset
    print("Loading dataset...")
    dataset_path = "{dataset_file}"
    dataset = prepare_document_data(dataset_path)
    print(f"Dataset loaded with {{len(dataset)}} examples")
    
    if len(dataset) == 0:
        raise ValueError("No valid training examples found in the dataset")
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir="./outputs",
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
        save_total_limit=2,
        report_to="none",
        lr_scheduler_type="linear",
        seed=3407,
        output_dir=f"trained_models/{job_id}",
    )
    
    # Create trainer
    print("Creating trainer...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=max_seq_length,
        args=training_args,
    )
    
    # Start training
    print("Starting training...")
    trainer.train()
    
    # Save model
    output_dir = f"trained_models/{job_id}"
    print(f"Saving model to {{output_dir}}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # Save model card
    with open(f"{output_dir}/README.md", "w") as f:
        f.write(f"# Fine-tuned {model_name}\n\n")
        f.write("This model was fine-tuned using Unsloth.\n\n")
        f.write("## Training Parameters\n\n")
        # Convert params to a string representation
        params_str = json.dumps(params, indent=2)
        f.write(f"```json\n{params_str}\n```")
    
    print("Training completed successfully!")

if __name__ == "__main__":
    main()
"""

@app.get("/status/{job_id}", response_model=TrainingStatus)
async def get_training_status(job_id: str):
    """Get training status for a specific job"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = training_jobs[job_id]
    return TrainingStatus(**job_data)

@app.get("/jobs")
async def list_training_jobs():
    """List all training jobs"""
    return [
        {
            "job_id": job_id,
            "status": job_data["status"],
            "model_name": job_data["model_name"],
            "start_time": job_data["start_time"],
            "progress": job_data.get("progress", 0.0)
        }
        for job_id, job_data in training_jobs.items()
    ]

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
    
    # Copy model to permanent location
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
            models.append({
                "name": model_path.name,
                "path": str(model_path),
                "created": datetime.fromtimestamp(model_path.stat().st_mtime).isoformat(),
                "size": sum(f.stat().st_size for f in model_path.rglob('*') if f.is_file())
            })
    return models

@app.delete("/job/{job_id}")
async def delete_training_job(job_id: str):
    """Delete a training job and its temporary files"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Remove temporary model files
    temp_model_path = Path(f"trained_models/{job_id}")
    if temp_model_path.exists():
        shutil.rmtree(temp_model_path)
    
    # Remove from memory
    del training_jobs[job_id]
    
    return {"message": f"Job {job_id} deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)