
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
    print(f"Reading and preparing data from: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            document_text = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    sentences = re.split(r'(?<=[.!?])\s+', document_text)
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
    
    data = {"text": chunks}
    dataset = Dataset.from_dict(data)
    print(f"Created {len(dataset)} chunks from the document.")
    return dataset

def main():
    try:
        # Model parameters
        model_name = "unsloth/Llama-3.2-1B-Instruct"
        max_seq_length = 512
        
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
        
        dataset = prepare_document_data(r"uploads/subtitles.txt")
        
        if len(dataset) == 0:
            print("Error: No data was loaded from the dataset file.")
            sys.exit(1)

        # Training arguments
        training_args = TrainingArguments(
            output_dir="trained_models/1eb9bed9-66ef-4c82-90d3-c040ea0db869",
            num_train_epochs=1,
            per_device_train_batch_size=1,
            gradient_accumulation_steps=1,
            warmup_steps=5,
            learning_rate=0.0002,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=1,
            optim="adamw_8bit",
            save_strategy="steps",
            save_steps=10,
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
        model.save_pretrained("trained_models/1eb9bed9-66ef-4c82-90d3-c040ea0db869")
        tokenizer.save_pretrained("trained_models/1eb9bed9-66ef-4c82-90d3-c040ea0db869")
        
        print("Training completed successfully!")

    except Exception as e:
        print(f"An error occurred during training: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
