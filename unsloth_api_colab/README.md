# Unsloth Fine-Tuning API: Professional Workflow

This project provides a professional-grade, interactive workflow for fine-tuning Language Models (LLMs) on a free Google Colab GPU, orchestrated entirely from your local machine. It acts as a powerful, standalone "Fine-tuning as a Service" system that can be easily integrated into larger applications like CaaSAssist.



## Key Features

-   **Interactive Client**: A user-friendly command-line interface to upload a local file, select the model to fine-tune, and name your final model.
-   **Multi-Format Document Support**: The backend automatically parses `.txt`, `.pdf`, and `.md` files for training.
-   **Automated End-to-End Workflow**: The client handles uploading, training, monitoring, downloading, and saving the final model without manual intervention.
-   **Instant Model Testing**: After training, you can immediately chat with your new fine-tuned model directly from the client to test its performance.
-   **Integration-Ready**: Designed with API endpoints that can be seamlessly called from a web application like your CaaSAssist platform.

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
# python -m venv unsloth_env
# source unsloth_env/bin/activate  (on Linux/macOS)
# unsloth_env\Scripts\activate  (on Windows)

# Install Unsloth and its dependencies
pip install "unsloth[conda] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps xformers "trl<0.9.0" peft accelerate bitsandbytes
pip install requests
Use code with caution.
Markdown
Step 2: Run the Backend on Google Colab
Open the backend_colab_pro.ipynb file in Google Colab.
CRITICAL: Go to Runtime -> Change runtime type and ensure the Hardware accelerator is set to GPU.
In the first code cell, paste your ngrok authtoken where it says "PASTE_YOUR_AUTHTOKEN_HERE".
Run the first cell to install all required packages. This will take about 3 minutes.
Run the second cell. This starts the API server. After a moment, it will print a public ngrok URL. Copy this URL.
Example output:
✅ Unsloth API Server is running!
🚀 Public URL: https://some-random-string.ngrok-free.app
Step 3: Run the Interactive Client on Your Local Machine
Open a terminal on your local computer and navigate to this project's directory.
Run the client script:
Generated bash
python test_client_interactive.py
Use code with caution.
Bash
Follow the prompts in your terminal:
Paste the ngrok URL you copied from Colab.
Enter the local path to your document (e.g., my_document.pdf).
Choose a base model to fine-tune from the list.
Give your fine-tuned model a name (e.g., my_document_model).
The script will now automate the entire process. After the model is trained and downloaded, you will be able to chat with it directly in the terminal!
🛠️ Integrating with CaaSAssist
This API is designed to be the "fine-tuning engine" for your CaaSAssist platform. Here's how you can call its endpoints from your Next.js application:
User clicks "Fine-tune" on a document:
Your Next.js backend gets the document file from Supabase Storage.
It makes a fetch POST request with the file to the Colab API's /upload endpoint.
User fills out the fine-tuning modal:
The "Select a model" dropdown is populated by a fetch GET request to the /models endpoint.
The user provides a name for the new model.
Start the job:
Your backend sends a fetch POST request to the /train endpoint with the model_name and dataset_file.
The API returns a job_id. You should store this job_id in your Supabase database, associated with the user and the custom model name.
Monitor progress:
Your frontend can have a "Training Jobs" section that periodically calls the /status/{job_id} endpoint to display a live progress bar.
Use the new model:
Once the job status is completed, your CaaSAssist "AI Providers" dropdown can be dynamically updated to include "Fine-tuned: <user's_model_name>".
When a user selects this model to chat, your backend can either:
Option A (Live Inference on Colab): Route chat requests to the /generate endpoint on the Colab server, sending the job_id. This is great for quick testing but relies on the Colab session being active.
Option B (Local/Cloud Deployment): Use the /download endpoint to pull the model from Colab and deploy it to a persistent service (like another local machine, a dedicated GPU server, or a cloud inference endpoint like Hugging Face Inference Endpoints or Replicate). This is the production-grade approach.