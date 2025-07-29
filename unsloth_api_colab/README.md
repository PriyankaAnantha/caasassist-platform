# Unsloth Fine-Tuning API: Command-Line Interface

A powerful, interactive command-line interface for fine-tuning Language Models (LLMs) on Google Colab GPUs. This project provides a streamlined workflow for training custom language models using the Unsloth library, with support for various model architectures and document formats.

## Features

- **Easy Setup**: Get started quickly with Google Colab's free GPU resources
- **Multiple Document Formats**: Supports PDF, Markdown, and plain text documents
- **Multiple Models**: Choose from various pre-configured models
- **Background Processing**: Train models asynchronously and check status
- **Model Persistence**: Download and save your fine-tuned models
- **Interactive Chat**: Test your model with an interactive chat interface

## Prerequisites

- Python 3.8+
- Google account for Colab access
- ngrok account (free tier available)

## Available Models

This project supports various models from the Unsloth library. For a complete list of available models and their specifications, please refer to the [Unsloth Models Documentation](https://docs.unsloth.ai/get-started/all-our-models).

Default available models in this project include:
- `unsloth/Llama-3.2-1B-Instruct`
- `unsloth/tinyllama-bnb-4bit`
- `unsloth/mistral-7b-v0.3-bnb-4bit`
- `unsloth/gemma-2-9b-it-bnb-4bit`

## Key Features

- **Multi-Format Document Support**: The backend automatically parses `.txt`, `.pdf`, and `.md` files for training.
- **Automated End-to-End Workflow**: The client handles uploading, training, monitoring, downloading, and saving the final model without manual intervention.
- **Instant Model Testing**: After training, you can immediately chat with your new fine-tuned model directly from the client to test its performance.
- **Integration-Ready**: Designed with API endpoints that can be seamlessly called from a web application like your CaaSAssist platform.

---

## System Architecture: How It Works

The system uses a powerful client-server model to leverage Google's free GPU resources.

1.  **The Backend (on Google Colab)**:
    -   An entire FastAPI server runs inside a `backend_colab_pro.ipynb` notebook.
    -   This gives the server access to a powerful NVIDIA T4 GPU, which is essential for fast training.
    -   `ngrok` creates a secure, public URL that tunnels directly to the server running in your private Colab session.

2.  **The Client (on Your Local Machine)**:
    -   The `test_client_interactive.py` script acts as the remote control. It doesn't perform any heavy computation.
    -   It guides you through the process, sends files and commands to the Colab backend, monitors the job, and downloads the final result.

---

## 🚀 Step-by-Step Guide to Get Started

### Step 1: Prerequisites (One-Time Setup)

#### A. Get a Free `ngrok` Authtoken
1.  Sign up for a free account at **[ngrok.com](https://ngrok.com)**.
2.  On your dashboard, navigate to **Your Authtoken** in the left menu.
3.  **Click the "Copy" button** to copy your authtoken. You will need this for the Colab notebook.

#### B. Set Up Your Local Environment
To run the client and chat with the final model locally, you need a Python environment with Unsloth installed. Open your local terminal and run:

```bash
# It's highly recommended to use a virtual environment
python -m venv unsloth_env

# Activate the virtual environment
# On Windows:
# unsloth_env\Scripts\activate
# On macOS/Linux:
# source unsloth_env/bin/activate

# Install Unsloth and its dependencies
# For detailed installation instructions, see: https://docs.unsloth.ai/get-started/installing-+-updating
pip install "unsloth[conda] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps xformers "trl<0.9.0" peft accelerate bitsandbytes
pip install requests
```

### Step 2: Run the Backend on Google Colab

1. Open the `backend_colab_pro.py` file in Google Colab
2. Go to **Runtime → Change runtime type** and ensure the **Hardware accelerator** is set to **GPU**
3. In the first code cell, update the `NGROK_AUTHTOKEN` with your ngrok auth token:
   ```python
   NGROK_AUTHTOKEN = "your_ngrok_auth_token_here"
   ```
4. Run the first cell to install all required packages (takes about 3 minutes)
5. Run the second cell to start the API server
6. Copy the public ngrok URL that appears in the output:
   ```
   ✅ Unsloth API Server is running!
   🚀 Public URL: https://your-unique-url.ngrok-free.app
   ```

### Step 3: Run the Interactive Client

1. Open a terminal on your local computer
2. Navigate to the project directory
3. Run the interactive client:
   ```bash
   python test_client_interactive.py
   ```
4. Follow the prompts to:
   - Paste the ngrok URL from Colab
   - Enter the path to your document (e.g., `my_document.pdf`)
   - Choose a base model from the list
   - Name your fine-tuned model

The script will handle the entire process automatically. Once training is complete, you can chat with your model directly in the terminal!

