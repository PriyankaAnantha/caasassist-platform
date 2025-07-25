from google.colab import files
files.upload()  # Upload subtitles.txt

'''
%%capture
import os
if "COLAB_" not in "".join(os.environ.keys()):
    !pip install unsloth
else:
    # Do this only in Colab notebooks! Otherwise use pip install unsloth
    !pip install --no-deps bitsandbytes accelerate xformers==0.0.29.post3 peft trl triton cut_cross_entropy unsloth_zoo
    !pip install sentencepiece protobuf "datasets>=3.4.1,<4.0.0" huggingface_hub hf_transfer
    !pip install --no-deps unsloth
'''

from unsloth import FastLanguageModel
import torch
from datasets import Dataset
from trl import SFTTrainer
from transformers import TrainingArguments
import json
import re

def prepare_document_data(file_path, chunk_size=512):
    # Read the document
    with open(file_path, 'r', encoding='utf-8') as f:
        document_text = f.read()
    
    # Split into sentences for better chunking
    sentences = re.split(r'(?<=[.!?])\s+', document_text)
    
    # Create chunks of text
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
    
    # Add the last chunk if not empty
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    # Format as a dataset
    data = {"text": chunks}
    dataset = Dataset.from_dict(data)
    return dataset

def main():
    # Model parameters
    model_name = "unsloth/Llama-3.2-1B-Instruct"
    max_seq_length = 1024
    dtype = None  # Auto-detect
    load_in_4bit = True
    
    print("Loading model and tokenizer...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        dtype=dtype,
        load_in_4bit=load_in_4bit,
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
    print("Preparing dataset...")
    dataset = prepare_document_data("subtitles.txt", chunk_size=256)
    print(f"Created {len(dataset)} chunks from the document")
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir="outputs",
        num_train_epochs=1,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=2,
        warmup_steps=5,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=1,
        optim="adamw_8bit",
        save_strategy="steps",
        save_steps=50,
        save_total_limit=1,
        max_steps=50,  # Short run for testing
        report_to="none",
    )
    
    # Create trainer
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
    
    # Save the model
    output_dir = "fine_tuned_document_model"
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Model saved to {output_dir}")
    
    # Test the model
    def generate_text(prompt, max_new_tokens=100):
        inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=0.7,
            do_sample=True,
        )
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Test with a prompt from the document
    test_prompt = "Greetings, everyone. My name is Priyanka."
    print("\nTesting the model...")
    print(f"Prompt: {test_prompt}")
    print("Generated continuation:")
    print(generate_text(test_prompt))

if __name__ == "__main__":
    main()
