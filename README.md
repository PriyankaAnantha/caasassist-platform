<div align="center">
  <h1>🤖 CaaSAssist - Conversational Agent as a Service</h1>
  <p>A production-grade, multi-tenant SaaS platform that enables seamless document-based AI conversations through Retrieval-Augmented Generation (RAG) technology.</p>
  
  <p align="center">
    <a href="https://github.com/PriyankaAnantha/caasassist-platform">
      <img src="https://img.shields.io/github/stars/PriyankaAnantha/caasassist-platform?style=social" alt="GitHub Stars">
      <img src="https://img.shields.io/github/forks/PriyankaAnantha/caasassist-platform?style=social" alt="GitHub Forks">
      <img src="https://img.shields.io/github/issues/PriyankaAnantha/caasassist-platform" alt="GitHub Issues">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
    </a>
    <a href="https://nextjs.org/">
      <img src="https://img.shields.io/badge/Next.js-13+-000000?logo=nextdotjs&logoColor=white" alt="Next.js">
    </a>
  </p>
  
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#deployment">Deployment</a> •
    <a href="#contributing">Contributing</a>
  </p>


  <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin: 20px 0;">
    <img src="img1.png" alt="Landing Page" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    <img src="img2.png" alt="Chat Interface" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    <img src="img3.png" alt="Document Management" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    <img src="img4.png" alt="AI Model Selection" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  </div>

  <h3>🔐 Test User Credentials</h3>
  <p>Feel free to use these test credentials to explore the platform:</p>
  <p><strong>Email:</strong> procodergo@gmail.com<br><strong>Password:</strong> 1****6</p>
</div>

## ✨ Key Features

### Core Capabilities
- **Multi-Tenant Architecture**
  - Secure, isolated user environments with role-based access control
  - Data isolation at the database level

- **Advanced Document Processing**
  - Support for PDF, TXT, and JSONL formats
  - Automatic document chunking and vectorization
  - Smart metadata extraction and indexing

- **Intelligent Chat Experience**
  - Context-aware conversations using RAG technology
  - Support for follow-up questions and conversation history
  - Real-time response streaming

- **Model Fine-Tuning**
  - Fine-tune open-source LLMs with your own data
  - Support for multiple base models (Llama 3, Mistral, Gemma)
  - Intuitive UI for managing training jobs
  - Real-time progress tracking
  - Secure storage of training data and models

### Technical Highlights
- **Multi-Model Support**
  - OpenAI (GPT-4o, GPT-3.5-turbo)
  - OpenRouter (free models)
  - Local Ollama integration
  - Easy model switching and comparison

- **Developer Experience**
  - TypeScript-first development
  - Well-documented APIs
  - Comprehensive test coverage
  - CI/CD ready

- **Performance & Scalability**
  - Serverless architecture
  - Edge caching
  - Optimized vector search with pgvector
  - Efficient document processing pipeline

## 🛠 Tech Stack

### Frontend
<div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 20px 0;">
  <a href="https://nextjs.org/" target="_blank">
    <img src="https://img.shields.io/badge/Next.js-13+-000000?logo=nextdotjs&logoColor=white&style=for-the-badge" alt="Next.js">
  </a>
  <a href="https://react.dev/" target="_blank">
    <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black&style=for-the-badge" alt="React">
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white&style=for-the-badge" alt="TypeScript">
  </a>
  <a href="https://tailwindcss.com/" target="_blank">
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.3+-38B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge" alt="Tailwind CSS">
  </a>
  <a href="https://ui.shadcn.com/" target="_blank">
    <img src="https://img.shields.io/badge/ShadCN/UI-0.4+-000000?logo=shadcnui&logoColor=white&style=for-the-badge" alt="ShadCN/UI">
  </a>
  <a href="https://zustand-demo.pmnd.rs/" target="_blank">
    <img src="https://img.shields.io/badge/Zustand-4.4+-000000?logo=zustand&logoColor=white&style=for-the-badge" alt="Zustand">
  </a>
  <a href="https://www.framer.com/motion/" target="_blank">
    <img src="https://img.shields.io/badge/Framer_Motion-10+-0055FF?logo=framer&logoColor=white&style=for-the-badge" alt="Framer Motion">
  </a>
</div>

### Backend
<div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0;">
  <img src="https://img.shields.io/badge/Next.js_API-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js API">
  <img src="https://img.shields.io/badge/Server--Sent_Events-FF6B6B?style=for-the-badge&logo=serverless&logoColor=white" alt="Server-Sent Events">
  <img src="https://img.shields.io/badge/AI_SDK-000000?style=for-the-badge&logo=openai&logoColor=white" alt="AI SDK">
</div>

### Database & Services
<div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0;">
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/pgvector-000000?style=for-the-badge&logo=postgresql&logoColor=white" alt="pgvector">
  <img src="https://img.shields.io/badge/Supabase_Storage-181818?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase Storage">
  <img src="https://img.shields.io/badge/Supabase_Auth-181818?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase Auth">
</div>

### AI Providers
<div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0;">
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI">
  <img src="https://img.shields.io/badge/OpenRouter-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenRouter">
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama">
  <img src="https://img.shields.io/badge/Llama-FF6B35?style=for-the-badge&logo=llama&logoColor=white" alt="Llama">
  <img src="https://img.shields.io/badge/Gemma-FF6B35?style=for-the-badge&logo=google&logoColor=white" alt="Gemma">
</div>

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) 18.17 or later
- [npm](https://www.npmjs.com/) 9+ or [Yarn](https://yarnpkg.com/) 1.22+
- [Git](https://git-scm.com/)
- [Supabase](https://supabase.com/) account (free tier available)
- (Optional) [Docker](https://www.docker.com/) for local development with Ollama

### System Requirements

- RAM: 8GB+ (16GB recommended for local AI models)
- Disk Space: 2GB+ free space
- Internet connection for API dependencies

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/PriyankaAnantha/caasassist-platform.git

cd caasassist-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Set up the database schema**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/schema.sql`
   - Click "Run" to execute the schema

3. **Set up storage**:
   - Go to SQL Editor again
   - Copy and paste the contents of `supabase/storage-simple-fix.sql`
   - Click "Run" to create the documents bucket and policies

4. **Enable pgvector extension**:
   - Go to Database > Extensions
   - Search for "vector" 
   - Enable the `vector` extension

5. **Get your credentials**:
   - Go to Settings > API
   - Copy your Project URL and anon/public key

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Provider Keys (Choose one or more)

# OpenAI (Premium models)
OPENAI_API_KEY=your_openai_api_key

# OpenRouter (Free models - RECOMMENDED for getting started)
OPENROUTER_API_KEY=your_openrouter_api_key

# Ollama (Local models)
OLLAMA_BASE_URL=http://localhost:11434/v1

# Site URL (for OpenRouter)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

```

### 5. Get Free AI Access (Recommended)

**Option A: OpenRouter (Free Models)**
1. Visit [openrouter.ai](https://openrouter.ai/)
2. Sign up for a free account
3. Go to Keys section and create a new API key
4. Add it to your `.env.local` as `OPENROUTER_API_KEY`

**Option B: Local Ollama (Completely Free)**
1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Start Ollama: `ollama serve`
3. Pull a model: `ollama pull llama3.2:3b`

**Option C: OpenAI (Premium)**
1. Get an API key from [OpenAI](https://platform.openai.com/)
2. Add it to your `.env.local` as `OPENAI_API_KEY`

### 6. Run the Development Server

```
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Model Fine-Tuning Guide

### Accessing the Fine-Tuning Interface
1. Log in to your CaaSAssist account
2. Click on the "Fine-tune" button in the top navigation bar
3. You'll be redirected to the fine-tuning dashboard

### Creating a New Fine-Tuning Job
1. **Configure Model**
   - Enter a unique name for your fine-tuned model
   - Select a base model from the available options
   - Adjust training parameters (epochs, learning rate, etc.)

2. **Upload Training Data**
   - Click "Upload Files" and select your training data in JSONL format
   - Each line should be a JSON object with "prompt" and "completion" fields
   - You can upload multiple files (up to 10 files per job)

3. **Start Training**
   - Review your configuration
   - Click "Start Fine-tuning" to begin the training process
   - Monitor progress in real-time

### Managing Fine-Tuned Models
- View all your fine-tuned models in the "My Models" section
- Track training progress and metrics
- Deploy fine-tuned models directly to the chat interface
- Delete models when no longer needed

### Best Practices
- Start with a small subset of your data for testing
- Use a learning rate between 2e-5 and 2e-4 for most use cases
- Monitor loss values to detect overfitting
- Save checkpoints to resume training if needed

### Supported Base Models
- `unsloth/llama-3-8b-bnb-4bit` (Recommended for most use cases)
- `unsloth/llama-3-8b`
- `unsloth/mistral-7b`
- `unsloth/gemma-7b`

## 🤖 AI Models Status

### ✅ Working Models (Tested & Confirmed)

**OpenRouter Free Models (No setup required)**
- `meta-llama/llama-3.2-3b-instruct:free` - **RECOMMENDED** ⭐
- `meta-llama/llama-3.2-1b-instruct:free` - Fast and lightweight
- `google/gemma-2-9b-it:free` - Google's Gemma model

**OpenAI Models (Requires API key)**
- `gpt-4o-mini` - Fast and efficient
- `gpt-4o` - Most capable
- `gpt-3.5-turbo` - Cost-effective

**Ollama Local Models (Requires Ollama setup)**
- `llama3.2:3b` - Local Llama 3.2 3B
- `llama3.2:1b` - Local Llama 3.2 1B  
- `llama3.1:8b` - Local Llama 3.1 8B
- `mistral:7b` - Local Mistral 7B
- `codellama:7b` - Local Code Llama
- `qwen2.5:7b` - Local Qwen 2.5

### ❌ Known Issues

**OpenRouter Models with Problems**
- `microsoft/phi-3-*` models - Currently experiencing API errors
- Some larger free models may be rate-limited or unstable

## 📁 Project Structure

```
caasassist-platform/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── chat/              # Chat page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # ShadCN UI components
│   ├── auth-modal.tsx    # Authentication modal
│   ├── chat-interface.tsx # Main chat interface
│   ├── chat-header.tsx   # Chat header
│   ├── chat-history.tsx  # Chat history sidebar
│   ├── document-manager.tsx # Document management
│   ├── model-selector.tsx # AI model selector
│   └── landing-page.tsx  # Landing page
├── lib/                  # Utility libraries
│   ├── stores/          # Zustand stores
│   ├── supabase/        # Supabase client configuration
│   └── utils.ts         # Utility functions
├── supabase/            # Database schema and migrations
└── README.md
```

## 🔧 Configuration

### Supabase Setup

1. **Database Schema**: Run the SQL schema from `supabase/schema.sql`
2. **Row Level Security**: Policies are automatically created for data isolation
3. **Storage**: Configure the `documents` bucket for file uploads
4. **Extensions**: Enable `pgvector` for vector similarity search

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `OPENAI_API_KEY` | OpenAI API key for premium models | Optional |
| `OPENROUTER_API_KEY` | OpenRouter API key for free models | Optional |
| `OLLAMA_BASE_URL` | Ollama server URL for local models | Optional |
| `NEXT_PUBLIC_SITE_URL` | Your site URL (for OpenRouter) | Optional |

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Database (Supabase)

- Supabase is already hosted and managed
- Ensure your production environment variables are set correctly

### File Storage

- Supabase Storage handles file uploads and management
- Configure appropriate bucket policies for production

## 📚 Usage

### 1. Authentication
- Sign up for a new account or sign in
- User profiles are automatically created

### 2. Choose Your AI Model
- **For beginners**: Use OpenRouter free models (no setup required)
- **For local use**: Set up Ollama for completely free local models
- **For premium**: Configure OpenAI API key for best performance

### 3. Document Management
- Click the document icon to open the document manager
- Drag and drop files or click to browse
- Supported formats: PDF, TXT, MD (up to 10MB)
- Documents are automatically processed and chunked

### 4. Chat Interface
- Start a new conversation or continue existing ones
- Ask questions about your uploaded documents
- AI responses are streamed in real-time
- Chat history is automatically saved

### 5. Session Management
- View all chat sessions in the history sidebar
- Rename or delete sessions as needed
- Search through conversation history

## 🔒 Security Features

- **Row Level Security**: Database-level access control
- **Authentication**: Secure user authentication via Supabase Auth
- **File Validation**: Type and size validation for uploads
- **API Protection**: All API routes require authentication
- **Data Isolation**: Users can only access their own data

## 🎨 Customization

### Theme Configuration
- Light/dark theme support via `next-themes`
- Customizable color palette in `tailwind.config.ts`
- Glassmorphism effects for modern UI

### AI Models
- Configurable model selection
- Support for multiple AI providers via AI SDK
- Easy to extend with new models

## 🐛 Troubleshooting

### Common Issues

1. **Supabase Connection Issues**
   - Verify environment variables are correct
   - Check if pgvector extension is enabled
   - Ensure RLS policies are properly configured

2. **File Upload Issues**
   - Check Supabase Storage bucket configuration
   - Verify file size and type restrictions
   - Ensure proper authentication

3. **AI Model Issues**
   - **Phi-3 models not working**: Use Llama 3.2 or Gemma models instead
   - **OpenRouter errors**: Check your API key and try different models
   - **Ollama connection failed**: Ensure Ollama is running with `ollama serve`

4. **Chat Streaming Issues**
   - Verify API keys are valid
   - Check network connectivity
   - Monitor browser console for errors

### Model-Specific Troubleshooting

**OpenRouter Free Models**
- If a model fails, try switching to `meta-llama/llama-3.2-3b-instruct:free`
- Some models may be temporarily unavailable
- Rate limits may apply during peak usage

**Ollama Local Models**
- Ensure Ollama is installed and running: `ollama serve`
- Check if the model is installed: `ollama list`
- Pull missing models: `ollama pull llama3.2:3b`

**OpenAI Models**
- Verify API key is valid and has credits
- Check quota limits in OpenAI dashboard
- Monitor rate limits

## 📈 Performance Optimization

- **Vector Search**: Optimized with pgvector indexes
- **Chunking Strategy**: Configurable chunk size and overlap
- **Caching**: Client-side state management with Zustand
- **Streaming**: Real-time response streaming for better UX

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📬 Contact

For any questions or feedback, please feel free to reach out:

- [Email](mailto:priyankaananthashetty@gmail.com)
- [LinkedIn](https://www.linkedin.com/in/priyanka-anantha/)
- [GitHub Issues](https://github.com/PriyankaAnantha/caasassist-platform/issues)

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

1. **Report Bugs**: File an issue if you find any bugs or have suggestions
2. **Submit Pull Requests**: Help fix issues or add new features
3. **Improve Documentation**: Help improve our documentation
4. **Share Feedback**: Let us know how we can improve


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Acknowledgments

- Built with ❤️ by [Priyanka A](https://github.com/PriyankaAnantha)
- Thanks to mentor [Ma'am Sharmila Sudhakar](https://github.com/sharmilasudhakar07) who has helped shape this project
- Special thanks to the open-source community for the amazing tools and libraries

## 📚 Resources

- [Changelog](CHANGELOG.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## 🌟 Show Your Support

If you find this project useful, please consider giving it a ⭐️ on [GitHub](https://github.com/PriyankaAnantha/caasassist-platform).

## 🔄 Recent Updates

### Fixed Issues
- ✅ Document reading now works correctly with enhanced search
- ✅ Session deletion properly removes messages and sessions
- ✅ Model selector shows working status for each model
- ✅ Ollama integration with proper connection testing
- ✅ Better error handling for problematic models

### Known Working Models
- **OpenRouter**: Llama 3.2 (3B/1B), Gemma 2 9B
- **OpenAI**: All models (with valid API key)
- **Ollama**: All models (when properly installed)

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/PriyankaAnantha" target="_blank">Priyanka A</a></p>
  <p>
    <a href="https://github.com/PriyankaAnantha/caasassist-platform" target="_blank">
      <img src="https://img.shields.io/github/stars/PriyankaAnantha/caasassist-platform?style=social" alt="GitHub Stars">
    </a>
    <a href="https://github.com/PriyankaAnantha/caasassist-platform/fork" target="_blank">
      <img src="https://img.shields.io/github/forks/PriyankaAnantha/caasassist-platform?style=social" alt="GitHub Forks">
    </a>
    <a href="https://github.com/PriyankaAnantha/caasassist-platform/issues" target="_blank">
      <img src="https://img.shields.io/github/issues/PriyankaAnantha/caasassist-platform?style=social" alt="GitHub Issues">
    </a>
  </p>
  <p>
    <a href="https://github.com/PriyankaAnantha/caasassist-platform/blob/main/LICENSE" target="_blank">
      <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
    </a>
  </p>
</div>
