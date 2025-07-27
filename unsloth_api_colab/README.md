# Unsloth Fine-Tuning API with Google Colab Backend

This project allows you to fine-tune LLMs using Unsloth on a free Google Colab GPU, orchestrated from your local machine.

## How It Works

1.  A FastAPI server runs inside a Google Colab notebook, giving it access to a powerful GPU.
2.  `ngrok` exposes this server to the public internet with a secure URL.
3.  A local Python client (`test_client_colab.py`) uploads your dataset to the Colab server, starts the training, monitors progress, and automatically downloads the finished model back to your local machine.

## Step-by-Step Instructions

### Step 1: Get a Free `ngrok` Authtoken

1.  Sign up for a free account at [ngrok.com](https://ngrok.com).
2.  On your dashboard, navigate to **Your Authtoken** on the left menu.
3.  Copy your authtoken. You will need it for the Colab notebook.

### Step 2: Run the Backend on Google Colab

1.  Open the `backend_colab.ipynb` file in Google Colab.
2.  **IMPORTANT:** Go to **Runtime -> Change runtime type** and ensure the **Hardware accelerator** is set to **GPU** (a T4 is perfect).
3.  In the first code cell, **paste your `ngrok` authtoken** where it says `"PASTE_YOUR_AUTHTOKEN_HERE"`.
4.  Run the first cell to install all required packages. This will take a few minutes.
5.  Run the second cell. This starts the API server. After a moment, it will print a public `ngrok` URL. **Copy this URL** (the one ending in `.ngrok-free.app` or similar).

    Example output:
    `🚀 Public URL: https://some-random-string.ngrok-free.app`

### Step 3: Run the Client on Your Local Machine

1.  Open a terminal on your local computer and navigate to this `unsloth_api_colab` directory.
2.  Run the client script:
    ```bash
    python test_client_colab.py
    ```
3.  When prompted, **paste the `ngrok` URL** you copied from Colab and press Enter.

That's it! The script will now automate the entire process:
- Creating a sample dataset.
- Uploading it to Colab.
- Starting the fine-tuning job.
- Monitoring progress.
- Downloading the final, fine-tuned model and saving it to a local folder named `downloaded_models`.